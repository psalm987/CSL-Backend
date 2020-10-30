const mongoose = require("mongoose");

const DeliveryDetails = mongoose.Schema({
  clientID: {
    type: String,
    required: true,
  },
  driverID: {
    type: String,
  },
  driver: {
    type: Map,
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
  type: {
    type: String,
    enum: ["Custom", "Instant"],
    default: "Instant",
  },
  pickUpNumber: {
    type: String,
  },
  dropOffNumber: {
    type: String,
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  note: {
    type: String,
  },
  from: {
    type: Map,
  },
  to: {
    type: Map,
  },
  review: {
    type: String,
    enum: ["Very poor", "Poor", "Good", "Great", "Excellent"],
  },
  remark: {
    type: String,
  },
  driverComment: {
    type: Array,
  },
  payment: {
    type: String,
    enum: ["Online", "Transfer", "Cash"],
    default: "Cash",
  },
  payer: {
    type: String,
    enum: ["Sender", "Receiver"],
    required: true,
  },
  track: {
    type: Array,
    default: [{ action: "Created", timestamp: Date.now() }],
  },
  schedule: {
    type: Map,
  },
  paymentTransactions: {
    type: Array,
  },
});

module.exports = mongoose.model("Delivery", DeliveryDetails);
