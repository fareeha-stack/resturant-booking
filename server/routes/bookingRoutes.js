const express = require('express');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  listAvailability,
  createBooking,
  listMyBookings,
  listRestaurantBookings,
  updateBookingStatus,
  cancelBooking,
  availabilityValidation,
  createBookingValidation,
  statusValidation,
} = require('../controllers/bookingController');

const router = express.Router();
const customerOnly = [protect, authorizeRoles('customer')];
const ownerOnly = [protect, authorizeRoles('owner')];

router.get('/availability', availabilityValidation, validate, listAvailability);
router.get('/my', ...customerOnly, listMyBookings);
router.get('/restaurant/:restaurantId', ...ownerOnly, listRestaurantBookings);
router.post('/', ...customerOnly, createBookingValidation, validate, createBooking);
router.patch('/:id/status', ...ownerOnly, statusValidation, validate, updateBookingStatus);
router.patch('/:id/cancel', ...customerOnly, cancelBooking);

module.exports = router;
