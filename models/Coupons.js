const mongoose = require("mongoose");

const Coupons = mongoose.Schema({
  type: {
    type: String,
    enum: ["Flat Rate", "Percentage", "Value"],
  },
  usages: {
    type: Number,
    default: 1,
  },
  value: {
    type: Number,
    required: true,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // { delivery:ObjectId, timestamp }
  transactions: {
    type: Array,
    default: [],
  },
  expires: {
    type: Date,
    required: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  valid: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Coupons", Coupons);
