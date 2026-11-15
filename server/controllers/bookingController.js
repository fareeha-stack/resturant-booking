const { body, query } = require('express-validator');
const Booking = require('../models/Booking');
const BookingSlot = require('../models/BookingSlot');
const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');

const activeStatuses = ['pending', 'confirmed'];

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function makeSlots(startTime, endTime) {
  const slots = [];
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  // Bookings use 30-minute boundaries so each slot claim matches the requested time.
  for (let minute = start; minute < end; minute += 30) {
    const hours = String(Math.floor(minute / 60)).padStart(2, '0');
    const mins = String(minute % 60).padStart(2, '0');
    slots.push(`${hours}:${mins}`);
  }
  return slots;
}

async function releaseSlots(bookingId) {
  await BookingSlot.deleteMany({ bookingId });
}

async function listAvailability(req, res, next) {
  try {
    const { restaurantId, date, startTime, endTime, partySize } = req.query;
    if (startTime >= endTime) {
      return res.status(400).json({ message: 'endTime must be after startTime' });
    }
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const tables = await Table.find({
      restaurantId,
      isActive: true,
      capacity: { $gte: Number(partySize) },
    });

    const tableIds = tables.map((table) => table._id);
    const booked = await Booking.find({
      tableId: { $in: tableIds },
      bookingDate: date,
      status: { $in: activeStatuses },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    }).distinct('tableId');
    const busyIds = new Set(booked.map((id) => id.toString()));
    const availableTables = tables.filter((table) => !busyIds.has(table._id.toString()));

    return res.json({ tables: availableTables });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid restaurant id' });
    return next(err);
  }
}

async function createBooking(req, res, next) {
  const { restaurantId, tableId, partySize, bookingDate, startTime, endTime, notes } = req.body;
  let booking;

  try {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const table = await Table.findById(tableId);
    if (!table || !table.restaurantId.equals(restaurant._id)) {
      return res.status(400).json({ message: 'Table does not belong to this restaurant' });
    }
    if (!table.isActive) return res.status(400).json({ message: 'Table is not active' });
    if (Number(partySize) > table.capacity) {
      return res.status(400).json({ message: 'Party size exceeds table capacity' });
    }
    if (startTime >= endTime) {
      return res.status(400).json({ message: 'Start time must be earlier than end time' });
    }
    if (toMinutes(startTime) % 30 !== 0 || toMinutes(endTime) % 30 !== 0) {
      return res.status(400).json({ message: 'Booking times must use 30-minute intervals' });
    }
    if (startTime < restaurant.openingTime || endTime > restaurant.closingTime) {
      return res.status(400).json({ message: 'Booking time must be within restaurant hours' });
    }

    const overlap = await Booking.findOne({
      tableId,
      bookingDate,
      status: { $in: activeStatuses },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });
    if (overlap) {
      return res.status(409).json({ message: 'Table already booked for this time slot' });
    }

    booking = new Booking({
      customerId: req.user._id,
      restaurantId,
      tableId,
      partySize,
      bookingDate,
      startTime,
      endTime,
      notes,
    });

    const slots = makeSlots(startTime, endTime).map((slot) => ({
      tableId,
      date: bookingDate,
      slot,
      bookingId: booking._id,
    }));

    await BookingSlot.insertMany(slots);
    await booking.save();
    return res.status(201).json({ booking });
  } catch (err) {
    if (booking) await releaseSlots(booking._id).catch(() => {});
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Table already booked for this time slot' });
    }
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid restaurant or table id' });
    return next(err);
  }
}

async function listMyBookings(req, res, next) {
  try {
    const bookings = await Booking.find({ customerId: req.user._id })
      .populate('restaurantId', 'name address imageUrl')
      .populate('tableId', 'tableNumber capacity')
      .sort({ bookingDate: -1, startTime: 1 });
    return res.json({ bookings });
  } catch (err) {
    return next(err);
  }
}

async function listRestaurantBookings(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    if (!restaurant.ownerId.equals(req.user._id)) {
      return res.status(403).json({ message: 'You do not own this restaurant' });
    }

    const bookings = await Booking.find({ restaurantId: restaurant._id })
      .populate('customerId', 'name email phone')
      .populate('tableId', 'tableNumber capacity')
      .sort({ bookingDate: 1, startTime: 1 });
    return res.json({ bookings });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid restaurant id' });
    return next(err);
  }
}

async function updateBookingStatus(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const restaurant = await Restaurant.findById(booking.restaurantId);
    if (!restaurant || !restaurant.ownerId.equals(req.user._id)) {
      return res.status(403).json({ message: 'You do not own this booking' });
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending bookings can be updated' });
    }

    booking.status = req.body.status;
    await booking.save();
    if (booking.status === 'rejected') await releaseSlots(booking._id);
    return res.json({ booking });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid booking id' });
    return next(err);
  }
}

async function cancelBooking(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!booking.customerId.equals(req.user._id)) {
      return res.status(403).json({ message: 'You do not own this booking' });
    }
    if (!activeStatuses.includes(booking.status)) {
      return res.status(400).json({ message: 'This booking cannot be cancelled' });
    }

    booking.status = 'cancelled';
    await booking.save();
    await releaseSlots(booking._id);
    return res.json({ booking });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid booking id' });
    return next(err);
  }
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const availabilityValidation = [
  query('restaurantId').isMongoId().withMessage('Valid restaurantId is required'),
  query('date').custom(validDate).withMessage('Date must be a valid YYYY-MM-DD date'),
  query('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('startTime must use HH:mm'),
  query('endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('endTime must use HH:mm'),
  query('partySize').isInt({ min: 1 }).withMessage('partySize must be at least 1').toInt(),
];

const createBookingValidation = [
  body('restaurantId').isMongoId().withMessage('Valid restaurantId is required'),
  body('tableId').isMongoId().withMessage('Valid tableId is required'),
  body('partySize').isInt({ min: 1 }).withMessage('partySize must be at least 1').toInt(),
  body('bookingDate').custom(validDate).withMessage('bookingDate must be a valid YYYY-MM-DD date'),
  body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('startTime must use HH:mm'),
  body('endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('endTime must use HH:mm'),
  body('notes').optional().isString().withMessage('notes must be text'),
];

const statusValidation = [
  body('status').isIn(['confirmed', 'rejected']).withMessage('Status must be confirmed or rejected'),
];

module.exports = {
  listAvailability,
  createBooking,
  listMyBookings,
  listRestaurantBookings,
  updateBookingStatus,
  cancelBooking,
  availabilityValidation,
  createBookingValidation,
  statusValidation,
};
