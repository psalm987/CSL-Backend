const mongoose = require("mongoose");

const Ads = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  link: {
    type: String,
  },
  dateUploaded: {
    type: Date,
    default: Date.now,
  },
  uploadedBy: {
    type: String,
    required: true,
  },
  expires: {
    type: Date,
  },
  valid: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Ads", Ads);
