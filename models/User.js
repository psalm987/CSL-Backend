const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    requred: true,
  },
  role: {
    type: String,
    required: true,
    enum: ["client", "driver", "admin", "superAdmin"],
    default: "client",
  },
  birthday: {
    type: Date,
    required: true,
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  valid: {
    type: Boolean,
    default: true,
  },
  birthday: {
    type: Date,
  },
  pushtoken: String,
  socketID: String,
  // staff properties
  staffID: {
    type: String,
  },
  photoUrl: {
    type: String,
  },
  banned: Boolean,
});

module.exports = mongoose.model("User", UserSchema);
