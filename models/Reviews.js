const mongoose = require("mongoose");

const Reviews = mongoose.Schema({
  driverID: {
    type: String,
    required: true,
  },
  clientID: {
    type: String,
    required: true,
  },
  deliveryID: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
  },
  remark: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Reviews", Reviews);
