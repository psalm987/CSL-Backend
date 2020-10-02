const mongoose = require("mongoose");

const DriverDetails = mongoose.Schema({
  userID: {
    type: String,
    required: true,
  },
  photoUrl: {
    type: String,
  },
  curLoc: {
    type: Map,
    of: String,
  },
  valid: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Driver", DriverDetails);
