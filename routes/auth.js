var express = require("express");
var router = express.Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

const User = require("../models/User");
const ClientDetails = require("../models/ClientDetails");
const DriverDetails = require("../models/DriverDetails");
const Delivery = require("../models/Delivery");

/**
 * @route       POST api/auth
 * @description Auth user and get token
 * @access      Public
 * */

router.post(
  "/",
  [
    check("email", "Include valid Email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  async (req, res) => {
    // Check for input errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Invalid Credentials error", errors);
      res.status(400).json(errors.array());
      return;
    }

    // destructure inputs
    const { email, password } = req.body;
    try {
      // check if user already exists
      let user = await User.findOne({ email });
      if (!user) {
        console.log("Invalid Credentials");
        res.status(400).json({ msg: "Invalid Credentials" });
        return;
      }

      // check if passwords match
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log("Invalid Credentials match");
        res.status(400).json({ msg: "Invalid Credentials" });
        return;
      }
      let details = {};
      switch (user.role) {
        case "client":
          details = await ClientDetails.findOne({ userID: user.id });
          break;
        default:
          break;
      }
      const returnUser = {
        name: user.name,
        phone: user.phone,
        email: user.email,
        birthday: details.birthday,
      };

      // respond with payload
      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };
      jwt.sign(payload, process.env.JWT_SECRET, (err, token) => {
        if (err) throw err;
        res.status(200).json({
          token,
          name: user.name,
          email: user.email,
          role: user.role,
          user: returnUser,
        });
        return;
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ msg: "Server Error" });
      return;
    }
  }
);

/**
 * @route       GET api/auth/
 * @description Get logged in user
 * @access      Private
 * */

router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    switch (req.user.role) {
      case "client":
        details = await ClientDetails.findOne({ userID: req.user.id });
        history = await Delivery.find({ clientID: req.user.id });
        break;
      case "driver":
        details = await DriverDetails.findOne({ userID: req.user.id });
        history = await Delivery.find({ driverID: req.user.id });
        break;
      default:
        break;
    }
    const { role, name, email } = user;
    res
      .status(200)
      .json({
        role,
        name,
        email,
        user: { birthday: details.birthday, phone: user.phone },
      });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

module.exports = router;
