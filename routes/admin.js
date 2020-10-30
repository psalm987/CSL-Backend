var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

const { socket } = require("../config/socket");

const User = require("../models/User");
const DriverDetails = require("../models/DriverDetails");
const Delivery = require("../models/Delivery");

const createNotification = require("../middleware/createNotification");
const Prices = require("../models/Prices");
const { type } = require("os");
const Ads = require("../models/Ads");

const SECRET = process.env.ADMIN_SECRET;

/**
 * @route       POST api/admin
 * @description Register a new Admin
 * @access      Public
 * */

router.post("/", async (req, res) => {
  try {
    const { name, email, password, phone, birthday, secret } = req.body;
    if (!secret || secret !== SECRET) {
      res.status(200).json({ msg: "No authorisation" });
      return;
    }
    const user = new User({
      name,
      email,
      password,
      phone,
      birthday,
      role: "admin",
    });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };
    const returnUser = { name, phone, email, birthday };
    jwt.sign(payload, process.env.JWT_SECRET, (err, token) => {
      if (err) throw err;
      res.status(200).json({
        token,
        email: user.email,
        name,
        role: user.role,
        user: returnUser,
      });
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/admin/drivers
 * @description Edit driver details
 * @access      Private
 * */

router.post("/drivers", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(400).json({ msg: "No authorisation" });
    return;
  }
  try {
    await DriverDetails.findByIdAndUpdate(req.body.id, { ...req.body });
    res.status(200).json({ msg: "Driver updated successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/admin/drivers/approve/:id
 * @description Approve a driver details
 * @access      Private
 * */

router.post("/drivers/approve/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      res.status(400).json({ msg: "Not authorised" });
      return;
    }
    await DriverDetails.findOneAndUpdate(
      { userID: req.params.id },
      { valid: true }
    );
    await createNotification({
      userID: req.params.id,
      title: "Account approved",
      details:
        "Your account has been approved successfully. You may now recieve delivery requests.",
      type: "success",
      link: "account",
    });
    res.status(200).json({ msg: "Driver approved" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/admin/drivers/approve/:id
 * @description Ban a driver
 * @access      Private
 * */

router.post("/drivers/ban/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      res.status(400).json({ msg: "Not authorised" });
      return;
    }
    await DriverDetails.findOneAndUpdate(
      { userID: req.params.id },
      { valid: false }
    );
    await createNotification({
      userID: req.params.id,
      title: "Account blacklisted",
      details:
        "Your account has been banned! You will not receive any more delivery requests.",
      type: "error",
      link: "account",
    });
    res.status(200).json({ msg: "Driver Banned" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       GET api/admin/drivers
 * @description Retrieve all driver details
 * @access      Private
 * */

router.get("/drivers", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(400).json({ msg: "No authorisation" });
    return;
  }
  try {
    const drivers = await User.find({ role: "driver" });
    const details = await DriverDetails.find();
    res.status(200).json({ drivers, details });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/admin/delivery/assign
 * @description Assign a delivery
 * @access      Private
 * */

router.post("/delivery/assign", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      res.status(400).json({ msg: "No authorisation" });
      return;
    }
    const { id, driverID, reassign } = req.body;
    const delivery = await Delivery.findById(id);
    const driverAccount = await User.findById(driverID);
    const details = await DriverDetails.findOne({ userID: driverID });
    if (!delivery) {
      res.status(400).json({ msg: "Enter valid Delivery" });
      return;
    }
    if (!["Processing", "Pending"].includes(delivery.status)) {
      res.status(400).json({ msg: "Delivery cannot be re-assigned" });
      return;
    }
    if (!details || !details.valid) {
      res.status(400).json({ msg: "Driver not valid" });
      return;
    }
    if (delivery.driver && !reassign) {
      res.status(400).json({ msg: "Set reassign to true" });
      return;
    }
    let DeliveryObj = {};
    DeliveryObj.status = "Processing";
    DeliveryObj.driverID = driverID;
    DeliveryObj.driver = {
      id: driverID,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
    };
    DeliveryObj.track = [
      delivery.track,
      {
        action: reassign
          ? "Re-assigned to a dispatch rider"
          : "Assigned to a dispatch rider",
        timestamp: Date.now,
      },
    ];
    await delivery.updateOne(DeliveryObj);
    await createNotification({
      userID: delivery.clientID,
      title: "Rider selected",
      details: `Your delivery request was just assigned to ${driverAccount.name}`,
      type: "success",
      link: "order",
      payloadID: delivery._id,
    });
    await createNotification({
      userID: delivery.clientID,
      title: "New Delivery",
      details: `A delivery request was just assigned to you.`,
      type: "success",
      link: "order",
      payloadID: delivery._id,
    });
    res.status(200).json({ msg: "Delivery assigned successfully" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/admin/price
 * @description Update price list
 * @access      Private
 * */

router.post("/price", auth, async (req, res) => {
  try {
    const { mode, priceList } = req.body;
    const prices = new Prices({ mode, priceList, updatedBy: req.user.id });
    await prices.save();
    createNotification({
      userID: req.user.id,
      title: "Price Update",
      details: `You have succcessfully updated the price list for ${mode}, all orders from now on will be processed based on this matrix.`,
      type: "success",
    });
    res.status(200).json({ msg: "Update successful" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/admin/ads
 * @description Create a single ad
 * @access      Private
 * */

router.post("/ads", auth, async (req, res) => {
  try {
    const { name, image, link, expires } = req.body;
    const ad = new Ads({ name, image, link, expires, uploadedBy: req.user.id });
    await ad.save();
    createNotification({
      userID: req.user.id,
      title: "Advert Update",
      details: `You have succcessfully updated the mobile app advert, all clients will be able to view the ads now.`,
      type: "success",
    });
    socket && socket.broadcast.emit("ads");
    res.status(200).json({ msg: "Update successful" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

module.exports = router;
