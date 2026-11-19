const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { recommend, recommendValidation } = require('../controllers/aiController');

const router = express.Router();

router.post('/recommend', protect, recommendValidation, validate, recommend);

module.exports = router;
