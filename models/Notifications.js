const mongoose = require("mongoose");

const NotificationsDetails = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["success", "warning", "error"],
  },
  read: {
    type: Boolean,
    default: false,
  },
  delivered: {
    type: Boolean,
    default: false,
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  link: {
    type: String,
    enum: ["order", "profile"],
  },
  payload: String,
});

module.exports = mongoose.model("Notifications", NotificationsDetails);
