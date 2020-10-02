var express = require("express");
var router = express.Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

const User = require("../models/User");

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
      res.status(400).json(errors.array());
      return;
    }

    // destructure inputs
    const { email, password } = req.body;
    try {
      // check if user already exists
      let User = await User.findOne({ email });
      if (!user) {
        res.status(400).json({ msg: "Invalid Credentials" });
        return;
      }

      // check if passwords match
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(400).json({ msg: "Invalid Credentials" });
        return;
      }

      // respond with payload
      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        {
          expiresIn: "1d",
        },
        (err, token) => {
          if (err) throw err;
          res.status(200).json({ token, role });
          return;
        }
      );
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
    res.status(200).json({ user, details, history });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

module.exports = router;
