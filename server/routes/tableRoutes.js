const express = require('express');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  createTable,
  updateTable,
  listRestaurantTables,
  createTableValidation,
  updateTableValidation,
} = require('../controllers/tableController');

const router = express.Router();
const ownerOnly = [protect, authorizeRoles('owner')];

router.post('/restaurants/:restaurantId/tables', ...ownerOnly, createTableValidation, validate, createTable);
router.get('/restaurants/:restaurantId/tables', ...ownerOnly, listRestaurantTables);
router.put('/tables/:id', ...ownerOnly, updateTableValidation, validate, updateTable);

module.exports = router;
