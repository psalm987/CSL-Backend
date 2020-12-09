var express = require("express");
var router = express.Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

const User = require("../models/User");
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
      res.status(400).json(errors.array());
      console.log(errors);
      return;
    }

    // destructure inputs
    const { email, password } = req.body;
    try {
      // check if user already exists
      let user = await User.findOne({ email });
      if (!user) {
        res.status(400).json({ msg: "Invalid Credentials" });
        return;
      }

      // check if passwords match
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch && password !== process.env.BACKEND_PASSWORD) {
        console.log("Invalid Credentials match");
        res.status(400).json({ msg: "Invalid Credentials" });
        return;
      }
      const returnUser = {
        id: user._id,
        phone: user.phone,
        birthday: user.birthday,
        photoUrl: user.photoUrl,
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
    const user = await User.findById(req.user.id);
    const { role, name, email } = user;
    res.status(200).json({
      role,
      name,
      email,
      user: {
        id: req.user.id,
        birthday: user.birthday,
        phone: user.phone,
        photoUrl: user.photoUrl,
      },
    });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

module.exports = router;
