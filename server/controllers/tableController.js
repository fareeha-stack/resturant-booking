const { body } = require('express-validator');
const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');

async function createTable(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    if (!restaurant.ownerId.equals(req.user._id)) {
      return res.status(403).json({ message: 'You do not own this restaurant' });
    }

    const table = await Table.create({
      restaurantId: restaurant._id,
      tableNumber: req.body.tableNumber,
      capacity: req.body.capacity,
    });
    return res.status(201).json({ table });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'That table number already exists for this restaurant' });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid restaurant id' });
    }
    return next(err);
  }
}

async function updateTable(req, res, next) {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ message: 'Table not found' });

    const restaurant = await Restaurant.findById(table.restaurantId);
    if (!restaurant || !restaurant.ownerId.equals(req.user._id)) {
      return res.status(403).json({ message: 'You do not own this table' });
    }

    if (req.body.tableNumber !== undefined) table.tableNumber = req.body.tableNumber;
    if (req.body.capacity !== undefined) table.capacity = req.body.capacity;
    if (req.body.isActive !== undefined) table.isActive = req.body.isActive;

    await table.save();
    return res.json({ table });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'That table number already exists for this restaurant' });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid table id' });
    }
    return next(err);
  }
}

async function listRestaurantTables(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    if (!restaurant.ownerId.equals(req.user._id)) {
      return res.status(403).json({ message: 'You do not own this restaurant' });
    }

    const tables = await Table.find({ restaurantId: restaurant._id }).sort({ tableNumber: 1 });
    return res.json({ tables });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid restaurant id' });
    }
    return next(err);
  }
}

const createTableValidation = [
  body('tableNumber').trim().notEmpty().withMessage('Table number is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a whole number of at least 1').toInt(),
];

const updateTableValidation = [
  body('tableNumber').optional().trim().notEmpty().withMessage('Table number cannot be empty'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be a whole number of at least 1').toInt(),
  body('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false').toBoolean(),
];

module.exports = {
  createTable,
  updateTable,
  listRestaurantTables,
  createTableValidation,
  updateTableValidation,
};
