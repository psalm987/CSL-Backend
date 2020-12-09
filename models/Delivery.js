const mongoose = require("mongoose");

const DeliveryDetails = mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  mode: {
    type: String,
    enum: ["Motorcycle", "Car", "Mini Van"],
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Cancelled", "Processing", "Delivered"],
    default: "Pending",
  },
  distance: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  pickUpNumber: {
    type: String,
    required: true,
  },
  dropOffNumber: {
    type: String,
    required: true,
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  note: String,
  from: { type: Map, required: true },
  to: { type: Map, required: true },
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Reviews",
  },
  driverComment: Array,
  payment: {
    type: Map,
  },
  paid: {},
  track: {
    type: Array,
    default: [{ action: "Created", timestamp: new Date().toISOString() }],
  },
  schedule: Map,
  paymentTransactions: Array,
  coupons: Array,
});

module.exports = mongoose.model("Delivery", DeliveryDetails);
