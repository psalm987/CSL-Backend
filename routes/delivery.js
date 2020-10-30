var express = require("express");
var router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const dist = require("../middleware/distance");

const Delivery = require("../models/Delivery");

const User = require("../models/User");
const DriverDetails = require("../models/DriverDetails");

const createNotification = require("../middleware/createNotification");
const { route } = require("./admin");

/**
 * @route       POST api/delivery
 * @description Make a new Delivery
 * @access      Private (Client & Admins)
 * */

router.post("/", auth, async (req, res) => {
  // destructure inputs
  const {
    from,
    to,
    distance,
    mode,
    price,
    pickUpNumber,
    dropOffNumber,
    payer,
    payment,
    note,
    schedule,
  } = req.body;

  try {
    let DeliveryInfo = {};
    if (from) DeliveryInfo.from = from;
    if (to) DeliveryInfo.to = to;
    if (distance) DeliveryInfo.distance = distance;
    if (mode) DeliveryInfo.mode = mode;
    if (price) DeliveryInfo.price = price;
    if (pickUpNumber) DeliveryInfo.pickUpNumber = pickUpNumber;
    if (dropOffNumber) DeliveryInfo.dropOffNumber = dropOffNumber;
    if (payer) DeliveryInfo.payer = payer;
    if (payment) DeliveryInfo.payment = payment;
    if (note) DeliveryInfo.note = note;
    if (schedule) DeliveryInfo.schedule = schedule;
    DeliveryInfo.clientID = req.user.id;

    const delivery = new Delivery(DeliveryInfo);
    const deliveryID = await delivery.save();
    await createNotification({
      userID: req.user.id,
      title: "Delivery request Successful",
      details: `You made a delivery request by ${mode}. Our service agents will process your order in a few minutes.`,
      type: "success",
      link: "order",
      payloadID: deliveryID,
    });
    res.status(200).json({ msg: "Delivery request successful" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/delivery/check
 * @description Calculate Delivery Details
 * @access      Public
 * */
router.post("/check", async (req, res) => {
  const { from, to, mode } = req.body;
  try {
    const { distance, duration, price } = await dist(from, to, mode);
    res.status(200).json({ from, to, mode, distance, duration, price });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       GET api/delivery
 * @description Get all Deliveries
 * @access      Private (Client & Admins)
 * */

router.get("/", auth, async (req, res) => {
  try {
    const deliveries = await (async () => {
      switch (req.user.role) {
        case "client":
          return await Delivery.find({ clientID: req.user.id }).sort(
            "-dateCreated"
          );
        case "driver":
          return await Delivery.find({ driverID: req.user.id }).sort(
            "-dateCreated"
          );
        default:
          return await Delivery.find().sort("-dateCreated");
      }
    })();
    res.status(200).json(deliveries);
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/delivery/cancel/:id
 * @description Cancel delivery
 * @access      Private
 * */
router.post("/cancel/:id", auth, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (delivery.clientID !== req.user.id) {
      res.status(400).json({ msg: "Not authorized" });
      return;
    }
    if (!["Pending", "Processing"].includes(delivery.status)) {
      res.status(400).json({ msg: "Delivery cannot be cancelled" });
      return;
    }
    await delivery.updateOne({
      status: "Cancelled",
      track: [...update.track, { action: "Cancelled", timestamp: Date.now }],
    });
    const client = await User.findById(delivery.clientID);
    await createNotification({
      userID: req.user.id,
      title: "Delivery Cancelled",
      details: `Your delivery has been cancelled successfully.`,
      type: "success",
      link: "order",
      payload: delivery._id,
    });
    await createNotification({
      userID: delivery.driverID,
      title: "Delivery Cancelled",
      details: `A delivery for ${client.name} has been cancelled.`,
      type: "success",
      link: "order",
      payload: delivery._id,
    });
    res.status(200).json(delivery);
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/delivery/review/:id
 * @description Review a delivery
 * @access      Private
 * */

router.post("/review/:id", auth, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (delivery.clientID !== req.user.id) {
      res.status(400).json({ msg: "Not authorized" });
      return;
    }
    if (!["Cancelled", "Delivered"].includes(delivery.status)) {
      res.status(400).json({ msg: "Delivery cannot be reviewed" });
      return;
    }
    await delivery.updateOne({
      track: [...update.track, { action: "Cancelled", timestamp: Date.now }],
    });
    const client = await User.findById(delivery.clientID);
    await createNotification({
      userID: req.user.id,
      title: "Delivery Cancelled",
      details: `Your delivery has been cancelled successfully.`,
      type: "success",
      link: "order",
      payload: delivery._id,
    });
    await createNotification({
      userID: delivery.driverID,
      title: "Delivery Cancelled",
      details: `A delivery for ${client.name} has been cancelled.`,
      type: "success",
      link: "order",
      payload: delivery._id,
    });
    res.status(200).json(delivery);
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

module.exports = router;
