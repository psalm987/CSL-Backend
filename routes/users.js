var express = require("express");
var router = express.Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

const User = require("../models/User");
const Delivery = require("../models/Delivery");
const createNotification = require("../middleware/createNotification");
const Ads = require("../models/Ads");
const Coupons = require("../models/Coupons");
const { Types } = require("mongoose");

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

      const returnUser = { id: user._id, name, phone, email, birthday };
      // respond with payload
      const payload = {
        user: {
          id: user._id,
          role: user.role,
        },
      };
      jwt.sign(payload, process.env.JWT_SECRET, async (err, token) => {
        if (err) throw err;
        await createNotification({
          userID: user._id,
          title: "New Account",
          details: `Welcome ${user.name}, your account has been created successfully`,
          type: "success",
          link: "profile",
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
 * @route       GET api/users/ads
 * @description Retrieve all Ads
 * @access      Public
 * */

router.get("/ads", async (req, res) => {
  try {
    const ads = await Ads.find({
      valid: true,
      $or: [{ expires: null }, { expires: { $gt: new Date() } }],
    }).sort("-dateUploaded");
    res.status(200).json({ ads });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       GET api/users/coupons
 * @description Retrieve all valid Coupons
 * @access      Public
 * */

router.get("/coupons", async (req, res) => {
  try {
    let coupons = [];
    switch (req.body.role) {
      case "admin":
        coupons = await Coupons.find({
          usages: { $ne: 0 },
          expires: { $gt: new Date() },
        })
          .populate("client", "name _id phone email")
          .populate("cretedBy", "name _id phone email");

        break;
      case "client":
        coupons = await Coupons.find({
          _id: Types.ObjectId(req.user.id),
          usages: { $ne: 0 },
          expires: { $gt: new Date() },
        });
        break;
      default:
        break;
    }
    res.status(200).json({ coupons });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

module.exports = router;
