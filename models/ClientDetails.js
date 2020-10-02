const mongoose = require("mongoose");

const ClientDetails = mongoose.Schema({
  userID: {
    type: String,
    required: true,
  },
  defaultAddress: {
    type: String,
    default: "",
  },
  birthday: {
    type: Date,
  },
  profileUploaded: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Client", ClientDetails);
