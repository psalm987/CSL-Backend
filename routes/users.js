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
const createNotification = require("../middleware/createNotification");
const Ads = require("../models/Ads");

/**
 * @route       POST api/users
 * @description Register a new User
 * @access      Public
 * */

router.post(
  "/",
  [
    check("name", "User Name is required").not().isEmpty(),
    check("email", "Include valid Email").isEmail(),
    check("phone", "Include a valid phone number").isMobilePhone("en-NG"),
    check("password", "Include password with 6 or more characters").isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    // Check for input errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errors.array());
      return;
    }
    // destructure inputs
    const { name, email, phone, password, birthday } = req.body;

    try {
      // check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        res.status(400).json({ msg: "User already exists" });
        return;
      }

      // save user to database
      user = new User({
        name,
        email,
        phone,
        password,
      });
      // encrypt password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();

      // handle various roles
      user = await User.findOne({ email });
      const details = new ClientDetails({
        userID: user.id,
        birthday,
      });

      await details.save();

      const returnUser = { name, phone, email, birthday };
      // respond with payload
      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };
      jwt.sign(payload, process.env.JWT_SECRET, async (err, token) => {
        if (err) throw err;
        await createNotification({
          userID: user.id,
          title: "New Account",
          details: `Welcome ${user.name}, your account has been created successfully`,
          type: "success",
          link: "account",
        });
        res
          .status(200)
          .json({ token, email: user.email, name, role, user: returnUser });
      });
      return;
    } catch (err) {
      console.log(err);
      res.status(500).json({ msg: "Server Error" });
      return;
    }
  }
);

/**
 * @route       GET api/users/
 * @description Retrieve all Users Information
 * @access      Private
 * */

router.get("/", auth, async (req, res) => {
  try {
    if (req.user === "admin" || req.user === "superAdmin") {
      const allUsers = await User.find().select("-passwordHash");
      const drivers = allUsers.filter((user) => {
        user.role === "driver";
      });
      const clients = allUsers.filter((user) => {
        user.role === "client";
      });
      const deliveries = await Delivery.find();
      res.status(200).json({ allUsers, drivers, clients, deliveries });
      return;
    } else {
      let details;
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
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       GET api/users/ads
 * @description Retrieve all Ads
 * @access      Public
 * */

router.get("/ads", async (req, res) => {
  try {
    const ads = await Ads.find({ valid: true }).sort("-dateUploaded");
    res.status(200).json({ ads });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

module.exports = router;
