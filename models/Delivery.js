const mongoose = require("mongoose");

const DeliveryDetails = mongoose.Schema({
  clientID: {
    type: String,
    required: true,
  },
  driverID: {
    type: String,
  },
  mode: {
    type: String,
    enum: ["car", "bike", "minvan"],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "paid", "cancelled", "processing", "delivered"],
    default: "pending",
  },
  type: {
    type: String,
    enum: ["custom", "instant"],
    default: "instant",
  },
  altPhone: {
    type: String,
    required: true,
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  pickDate: {
    type: Date,
  },
  description: {
    type: String,
  },
  curLoc: {
    type: Map,
    of: String,
  },
  pickLoc: {
    type: Map,
    of: String,
  },
  dropLoc: {
    type: Map,
    of: String,
  },
  review: {
    type: String,
    enum: ["very poor", "poor", "good", "great", "excellent"],
  },
  remark: {
    type: String,
  },
  driverComment: {
    type: String,
  },
  payment: {
    type: String,
    enum: ["online", "transfer", "cash"],
    required: true,
  },
  payer: {
    type: String,
    enum: ["sender", "receiver"],
    required: true,
  },
});

module.exports = mongoose.model("Delivery", DeliveryDetails);
