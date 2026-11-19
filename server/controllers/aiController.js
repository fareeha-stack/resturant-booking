const { body } = require('express-validator');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Restaurant = require('../models/Restaurant');

const MODEL_NAME = 'gemini-2.0-flash';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fallbackRestaurants(restaurants) {
  return restaurants.slice(0, 3).map((restaurant) => ({
    restaurantId: restaurant._id.toString(),
    name: restaurant.name,
    cuisine: restaurant.cuisine || '',
    address: restaurant.address,
    imageUrl: restaurant.imageUrl || null,
    reason: 'Matches your search',
  }));
}

async function recommend(req, res, next) {
  try {
    const { cuisine, location, partySize, preference } = req.body;
    const filters = { status: 'approved' };
    if (cuisine) filters.cuisine = new RegExp(escapeRegex(cuisine), 'i');
    if (location) filters.address = new RegExp(escapeRegex(location), 'i');

    let restaurants = await Restaurant.find(filters).limit(20).lean();
    if (restaurants.length === 0) {
      restaurants = await Restaurant.find({ status: 'approved' }).limit(20).lean();
    }
    if (restaurants.length === 0) {
      return res.json({ recommendations: [], message: 'No approved restaurants found' });
    }

    try {
      const candidates = restaurants.map(({ _id, name, cuisine: restaurantCuisine, address, description }) => ({
        _id: _id.toString(),
        name,
        cuisine: restaurantCuisine,
        address,
        description,
      }));
      const requestData = {
        restaurants: candidates,
        partySize: partySize || null,
        preference: preference || '',
      };
      const prompt = [
        'Choose the best 3 restaurants from the supplied list for this group.',
        'Use only the supplied restaurants. Never invent restaurant IDs.',
        'Use a candidate _id as restaurantId in the reply.',
        'Reply only with valid JSON in this exact shape: [{ "restaurantId": "...", "reason": "..." }].',
        'Do not include markdown fences or any text outside the JSON array.',
        JSON.stringify(requestData),
      ].join('\n');

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().replace(/```(?:json)?\s*|```/gi, '').trim();
      const parsed = JSON.parse(responseText);
      if (!Array.isArray(parsed)) throw new Error('AI response was not a list');

      const byId = new Map(restaurants.map((restaurant) => [restaurant._id.toString(), restaurant]));
      const seen = new Set();
      const recommendations = parsed.slice(0, 10).flatMap((item) => {
        const id = typeof item?.restaurantId === 'string' ? item.restaurantId : '';
        const restaurant = byId.get(id);
        if (!restaurant || seen.has(id) || typeof item.reason !== 'string') return [];
        seen.add(id);
        return [{
          restaurantId: id,
          name: restaurant.name,
          cuisine: restaurant.cuisine || '',
          address: restaurant.address,
          imageUrl: restaurant.imageUrl || null,
          reason: item.reason,
        }];
      }).slice(0, 3);

      if (recommendations.length === 0) throw new Error('AI returned no valid restaurant choices');
      return res.json({ recommendations });
    } catch (err) {
      return res.json({
        recommendations: fallbackRestaurants(restaurants),
        message: 'AI is unavailable, showing top matches',
      });
    }
  } catch (err) {
    return next(err);
  }
}

const recommendValidation = [
  body('cuisine').optional({ checkFalsy: true }).isString().trim().isLength({ max: 80 }).withMessage('Cuisine must be 80 characters or fewer'),
  body('location').optional({ checkFalsy: true }).isString().trim().isLength({ max: 120 }).withMessage('Location must be 120 characters or fewer'),
  body('partySize').optional().isInt({ min: 1, max: 30 }).withMessage('Party size must be between 1 and 30').toInt(),
  body('preference').optional({ checkFalsy: true }).isString().trim().isLength({ max: 500 }).withMessage('Preference must be 500 characters or fewer'),
];

module.exports = { recommend, recommendValidation };
