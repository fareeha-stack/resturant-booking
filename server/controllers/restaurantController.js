const { body } = require('express-validator');
const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');
const { uploadToCloudinary } = require('../middleware/upload');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function listRestaurants(req, res, next) {
  try {
    const query = {};
    if (req.query.cuisine) {
      query.cuisine = new RegExp(escapeRegex(req.query.cuisine), 'i');
    }
    if (req.query.location) {
      query.address = new RegExp(escapeRegex(req.query.location), 'i');
    }

    const restaurants = await Restaurant.find(query).sort({ createdAt: -1 });
    return res.json({ restaurants });
  } catch (err) {
    return next(err);
  }
}

async function getRestaurant(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const tables = await Table.find({ restaurantId: restaurant._id, isActive: true });
    return res.json({ restaurant, tables });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid restaurant id' });
    }
    return next(err);
  }
}

async function listMyRestaurants(req, res, next) {
  try {
    const restaurants = await Restaurant.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
    return res.json({ restaurants });
  } catch (err) {
    return next(err);
  }
}

async function createRestaurant(req, res, next) {
  try {
    const values = {
      ownerId: req.user._id,
      name: req.body.name,
      description: req.body.description,
      cuisine: req.body.cuisine,
      address: req.body.address,
      phone: req.body.phone,
      openingTime: req.body.openingTime,
      closingTime: req.body.closingTime,
    };

    if (req.file) {
      const image = await uploadToCloudinary(req.file.buffer);
      values.imageUrl = image.secure_url;
      values.imagePublicId = image.public_id;
    }

    const restaurant = await Restaurant.create(values);
    return res.status(201).json({ restaurant });
  } catch (err) {
    return next(err);
  }
}

async function updateRestaurant(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    if (!restaurant.ownerId.equals(req.user._id)) {
      return res.status(403).json({ message: 'You do not own this restaurant' });
    }

    const editableFields = ['name', 'description', 'cuisine', 'address', 'phone', 'openingTime', 'closingTime'];
    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) restaurant[field] = req.body[field];
    });

    if (req.file) {
      const image = await uploadToCloudinary(req.file.buffer);
      restaurant.imageUrl = image.secure_url;
      restaurant.imagePublicId = image.public_id;
    }

    await restaurant.save();
    return res.json({ restaurant });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid restaurant id' });
    }
    return next(err);
  }
}

const createRestaurantValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('openingTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Opening time must use HH:mm'),
  body('closingTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Closing time must use HH:mm'),
  body('description').optional().isString().withMessage('Description must be text'),
  body('cuisine').optional().isString().withMessage('Cuisine must be text'),
  body('phone').optional().isString().withMessage('Phone must be text'),
];

const updateRestaurantValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('address').optional().trim().notEmpty().withMessage('Address cannot be empty'),
  body('openingTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Opening time must use HH:mm'),
  body('closingTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Closing time must use HH:mm'),
  body('description').optional().isString().withMessage('Description must be text'),
  body('cuisine').optional().isString().withMessage('Cuisine must be text'),
  body('phone').optional().isString().withMessage('Phone must be text'),
];

module.exports = {
  listRestaurants,
  getRestaurant,
  listMyRestaurants,
  createRestaurant,
  updateRestaurant,
  createRestaurantValidation,
  updateRestaurantValidation,
};
