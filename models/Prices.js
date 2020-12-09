const mongoose = require("mongoose");

const PricesDetails = mongoose.Schema({
  priceList: {
    type: Array,
    required: true,
  },
  mode: {
    type: String,
    enum: ["Motorcycle", "Car", "Mini Van"],
    required: true,
  },
  dateUpdated: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

module.exports = mongoose.model("Prices", PricesDetails);
