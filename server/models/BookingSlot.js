const mongoose = require('mongoose');

const bookingSlotSchema = new mongoose.Schema({
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  date: { type: String, required: true },
  slot: { type: String, required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
});

bookingSlotSchema.index({ tableId: 1, date: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('BookingSlot', bookingSlotSchema);
