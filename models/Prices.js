const mongoose = require("mongoose");

const PricesDetails = mongoose.Schema({
  amount: {
    type: String,
    required: true,
  },
  distance: {
    type: String,
    required: true,
  },
  mode: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Prices", PricesDetails);
