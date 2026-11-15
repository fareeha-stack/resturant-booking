const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  cuisine: { type: String, trim: true },
  address: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  openingTime: { type: String, required: true },
  closingTime: { type: String, required: true },
  imageUrl: { type: String },
  imagePublicId: { type: String },
  status: { type: String, default: 'approved' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
