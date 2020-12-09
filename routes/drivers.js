var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

const fs = require("fs");

const { upload, getGfs } = require("../config/db");

const User = require("../models/User");
const Delivery = require("../models/Delivery");
const createNotification = require("../middleware/createNotification");
const Reviews = require("../models/Reviews");

const {
  sum,
  dDay,
  dWeek,
  dMonth,
  dYear,
} = require("../middleware/sumOfArrayProp");
const mongoose = require("mongoose");
const { getSocket } = require("../config/socket");
const getPerformance = require("../middleware/getPerformance");

/**
 * @route       GET api/drivers/performacne
 * @description Retreive a Driver Performance - Average review
 * @access      Private
 * */

router.get("/performance", auth, async (req, res) => {
  try {
    console.log(req.user.id);
    if (req.user.role === "driver") {
      res.status(200).json(await getPerformance(req.user.id));
      return;
    } else if (
      (req.user.role === "admin" || req.user.role === "superAdmin") &&
      req.body.id
    ) {
      res.status(200).json(await getPerformance(req.body.id));
      return;
    } else {
      res.status(400).json({ msg: "Invalid request" });
      return;
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/drivers
 * @description Register a new Driver
 * @access      Public
 * */

router.post("/", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      birthday,
      staffID,
      password,
      photoUrl,
    } = req.body;
    const UserObj = {
      name,
      email,
      phone,
      birthday,
      role: "driver",
      photoUrl,
      staffID,
    };
    let user = await User.findOne({ email });
    if (user) {
      res.status(400).json({ msg: "User already exists" });
      return;
    }
    user = new User(UserObj);

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };
    const returnUser = { phone, birthday, photoUrl };
    jwt.sign(payload, process.env.JWT_SECRET, async (err, token) => {
      if (err) throw err;
      await createNotification({
        userID: user.id,
        title: "New Account",
        details: `Welcome ${user.name}, your account has been created successfully`,
        type: "success",
        link: "account",
      });
      res.status(200).json({
        token,
        email: user.email,
        name,
        role: user.role,
        user: returnUser,
      });
    });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       GET api/drivers/deliveries
 * @description Get all assigned deliveries to the driver
 * @access      Private
 * */

router.get("/deliveries", auth, async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      res.status(400).json({ msg: "Not a dispatch account" });
      return;
    }
    const deliveries = await Delivery.find({ driverID: req.user.id });
    res.status(200).json({ deliveries });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/drivers/pickup/:id
 * @description Mark a delivery as ready for pick up
 * @access      Private
 * */

router.post("/pickup/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      res.status(400).json({ msg: "Not a dispatch account" });
      console.log("Not a dispatch account");
      return;
    }
    if (!req.params.id) {
      res.status(400).json({ msg: "Invalid request" });
      console.log("Invalid request");
      return;
    }
    const delivery = await Delivery.findById(req.params.id)
      .populate("driver", "name _id")
      .populate("client", "name _id");
    console.log(delivery);
    if (delivery.driver._id.toString() !== req.user.id) {
      res.status(400).json({ msg: "Not authorized" });
      console.log("Not authorized");
      return;
    }
    if (delivery.status === "Cancelled") {
      res.status(400).json({ msg: "Invalid request" });
      return;
    }
    let DeliveryObj = {};
    DeliveryObj.track = [
      ...delivery.track,
      {
        action: "Driver is ready for pick up",
        timestamp: new Date().toISOString(),
      },
    ];
    await delivery.updateOne(DeliveryObj);
    await createNotification({
      userID: delivery.client._id,
      title: "Ready for pickup",
      details: `Your package is ready to be recieved by ${delivery.driver.name}.`,
      type: "success",
      link: "order",
      payload: delivery.id,
    });
    await createNotification({
      userID: delivery.driver._id,
      title: "Ready for pickup",
      details: `You are ready to recieve a package for ${delivery.client.name}.`,
      type: "success",
      link: "order",
      payload: delivery.id,
    });
    res.status(200).json({ msg: "Ready for pickup" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/dropoff/:id
 * @description Mark a delivery as ready for dropoff
 * @access      Private
 * */

router.post("/dropoff/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      res.status(400).json({ msg: "Not a dispatch account" });
      return;
    }
    if (!req.params.id) {
      res.status(400).json({ msg: "Invalid request" });
      return;
    }
    const delivery = await Delivery.findById(req.params.id)
      .populate("driver", "name _id")
      .populate("client", "name _id");
    if (delivery.driver._id.toString() !== req.user.id) {
      res.status(400).json({ msg: "Not authorized" });
      return;
    }
    if (delivery.status === "Cancelled") {
      res.status(400).json({ msg: "Invalid request" });
      return;
    }
    let DeliveryObj = {};
    DeliveryObj.track = [
      ...delivery.track,
      {
        action: "Driver is ready for drop off",
        timestamp: new Date().toISOString(),
      },
    ];
    await delivery.updateOne(DeliveryObj);
    await createNotification({
      userID: delivery.client._id,
      title: "Ready for drop off",
      details: `Your package is ready to be delivered by ${delivery.driver.name}.`,
      type: "success",
      link: "order",
      payload: delivery.id,
    });
    await createNotification({
      userID: delivery.driver._id,
      title: "Ready for drop off",
      details: `You are ready to drop off a package for ${delivery.client.name}.`,
      type: "success",
      link: "order",
      payload: delivery.id,
    });
    res.status(200).json({ msg: "Ready for drop off" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/recieved/:id
 * @description Mark a delivery as recieved
 * @access      Private
 * */

router.post("/received/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      res.status(400).json({ msg: "Not a dispatch account" });
      return;
    }
    if (!req.params.id) {
      res.status(400).json({ msg: "Invalid request" });
      return;
    }
    const delivery = await Delivery.findById(req.params.id)
      .populate("driver", "name _id")
      .populate("client", "name _id");
    if (delivery.driver._id.toString() !== req.user.id) {
      res.status(400).json({ msg: "Not authorized" });
      return;
    }
    if (delivery.status === "Cancelled") {
      res.status(400).json({ msg: "Invalid request" });
      return;
    }
    let DeliveryObj = {};
    DeliveryObj.status = "Processing";
    DeliveryObj.track = [
      ...delivery.track,
      {
        action: "Picked up by a dispatch rider",
        timestamp: new Date().toISOString(),
      },
    ];
    await delivery.updateOne(DeliveryObj);
    await createNotification({
      userID: delivery.client._id,
      title: "Pick up successful",
      details: `Your package has succefully be recieved by ${delivery.driver.name}.`,
      type: "success",
      link: "order",
      payload: delivery._id,
    });
    await createNotification({
      userID: delivery.driver,
      title: "Pick up successful",
      details: `You have successfully recieved a package for ${delivery.client.name}.`,
      type: "success",
      link: "order",
      payload: delivery._id,
    });
    res.status(200).json({ msg: "Delivery Picked up successfully" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/drivers/delivered/:id
 * @description Mark a delivery as delivered
 * @access      Private
 * */

router.post("/delivered/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      res.status(400).json({ msg: "Not a dispatch account" });
      return;
    }
    if (!req.params.id) {
      res.status(400).json({ msg: "Invalid request" });
      return;
    }
    const delivery = await Delivery.findById(req.params.id)
      .populate("driver", "name _id")
      .populate("client", "name _id");
    if (delivery.driver._id.toString() !== req.user.id) {
      res.status(400).json({ msg: "Not authorized" });
      return;
    }
    if (delivery.status === "Cancelled") {
      res.status(400).json({ msg: "Invalid request" });
      return;
    }
    let DeliveryObj = {};
    DeliveryObj.status = "Delivered";
    DeliveryObj.track = [
      ...delivery.track,
      { action: "Delivered", timestamp: new Date().toISOString() },
    ];
    await delivery.updateOne(DeliveryObj);
    await createNotification({
      userID: delivery.client._id,
      title: "Delivery successful",
      details: `Your package has succefully be delivered by ${delivery.driver.name}.`,
      type: "success",
      link: "order",
      payload: delivery.id,
    });
    await createNotification({
      userID: delivery.driver._id,
      title: "Delivery successful",
      details: `You have successfully delivered a package for ${delivery.client.name}, Well done!`,
      type: "success",
      link: "order",
      payload: delivery.id,
    });
    res.status(200).json({ msg: "Delivered successfully" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/drivers/location
 * @description Update driver's location
 * @access      Private
 * */

var drivers = {};

router.post("/location", auth, async (req, res) => {
  if (req.user.role !== "driver") {
    console.log(req.user);
    res.status(400).json({ msg: "Not authorized" });
    return;
  }
  const { latitude, longitude, heading } = req.body;
  if (!(latitude && longitude && heading)) {
    res.status(400).json({ msg: "Bad request" });
    return;
  }
  try {
    const { name, phone, photoUrl } = await User.findById(req.user.id).select(
      "name phone photoUrl"
    );
    const timestamp = new Date();
    drivers[req.user.id] = {
      latitude,
      longitude,
      heading,
      name,
      phone,
      photoUrl,
      timestamp,
    };
    const io = getSocket();
    io.emit("drivers", drivers);
    io.on("getDrivers", () => {
      io.emit("drivers", drivers);
    });
    res.status(200).json({ msg: "Location updated" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

module.exports = router;
