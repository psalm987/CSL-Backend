const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
  },
  passwordHash: {
    type: String,
    requred: true,
  },
  role: {
    type: String,
    required: true,
    enum: ["client", "driver", "admin", "superAdmin"],
    default: "client",
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  valid: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("User", UserSchema);
