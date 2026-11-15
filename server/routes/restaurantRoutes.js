const express = require('express');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const { handleImageUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const {
  listRestaurants,
  getRestaurant,
  listMyRestaurants,
  createRestaurant,
  updateRestaurant,
  createRestaurantValidation,
  updateRestaurantValidation,
} = require('../controllers/restaurantController');

const router = express.Router();
const ownerOnly = [protect, authorizeRoles('owner')];

router.get('/', listRestaurants);
router.get('/mine/list', ...ownerOnly, listMyRestaurants);
router.post('/', ...ownerOnly, handleImageUpload, createRestaurantValidation, validate, createRestaurant);
router.put('/:id', ...ownerOnly, handleImageUpload, updateRestaurantValidation, validate, updateRestaurant);
router.get('/:id', getRestaurant);

module.exports = router;
