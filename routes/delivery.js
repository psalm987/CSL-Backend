var express = require("express");
var router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const dist = require("../middleware/distance");

const Delivery = require("../models/Delivery");
const Notifications = require("../models/Notifications");
const User = require("../models/User");
const concurrently = require("concurrently");
const { update } = require("../models/Delivery");
const DriverDetails = require("../models/DriverDetails");

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
  } = req.body;
  if (!["client", "admin", "superAdmin"].includes(req.user.role)) {
    res.status(400).json({ msg: "Not authorised" });
    return;
  }

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
    DeliveryInfo.track = [{ action: "Created", timestamp: Date.now }];
    DeliveryInfo.clientID = req.user.id;

    const delivery = new Delivery(DeliveryInfo);
    const deliveryID = await delivery.save();
    const notification = new Notifications({
      userID: req.user.id,
      title: "Delivery request Successful",
      details: `You made a delivery request by ${mode}. Our service agents will process your order in a few minutes.`,
      type: "delivery",
      payloadID: deliveryID,
    });
    await notification.save();
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
 * @route       POST api/delivery/accept/:id
 * @description Accept a new Delivery
 * @access      Private (Driver)
 * */

router.post(
  "/accept/:id",
  [auth, check("id", "Delivery ID is required").exists()],
  async (req, res) => {
    // Check for input errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errors.array());
      return;
    }
    if (req.user.id !== "driver") {
      res.status(400).json({ msg: "Not Authorised" });
      return;
    }

    // destructure inputs
    const { id } = req.params;

    try {
      const delivery = await Delivery.findById(id);
      const driver = await User.findById(req.user.id);
      if (!delivery.driverID) {
        deliveryID = await delivery.update({
          status: "processing",
          track: [
            ...deliveryID.track,
            { action: "Assigned", timestamp: Date.now },
          ],
        });
        res.status(200).json({ msg: "Delivery accepted!" });
        const notification = new Notifications({
          userID: delivery.clientID,
          title: "Rider selected",
          details: `Your delivery request was just accepted by ${driver.name}`,
          type: "success",
          link: "order",
          payloadID: deliveryID,
        });
        notification.save();
        return;
      } else {
        res.status(400).json({ msg: "Delivery already accepted" });
        return;
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ msg: "Server Error" });
      return;
    }
  }
);

/**
 * @route       GET api/delivery
 * @description Get all Deliveries
 * @access      Private (Client & Admins)
 * */

router.get("/", auth, async (req, res) => {
  try {
    const deliveries = await Delivery.find({ clientID: req.user.id });
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
 * @description Calculate Delivery Details
 * @access      Private
 * */
router.post("/cancel/:id", auth, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (delivery.clientID !== req.user.id) {
      res.status(400).json({ msg: "Not authorized" });
      return;
    }
    await delivery.updateOne({
      status: "Cancelled",
      track: [...update.track, { action: "Cancelled", timestamp: Date.now }],
    });
    res.status(200).json(delivery);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/delivery/assign/:id
 * @description Assign  Delivery to driver
 * @access      Public
 * */

router.post("/assign/:id", auth, async (res, req) => {
  try {
    if (req.user.role !== "admin") {
      res.status(400).json({ msg: "Not authorized" });
      return;
    }
    const driverUser = await User.findById(req.body.driverID);
    const driverDetails = await DriverDetails.findOne({
      userID: req.body.driverID,
    });
    const delivery = await Delivery.findById(req.params.id);
    await delivery.updateOne({
      driver: {
        name: driverUser.name,
        phone: driverUser.phone,
        image: driverDetails.photoUrl,
        id: req.body.driverID,
      },
      track: [...delivery.track, { action: "Assigned", timestamp: Date.now }],
    });
    const notification = new Notifications({
      userID: req.user.id,
      title: "Assigned successfully",
      details: `${driverUser.name} has been assigned to your order. The driver would pick up your package shortly`,
      type: "success",
      link: "order",
      payloadID: deliveryID,
    });
    await notification.save();
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

module.exports = router;
