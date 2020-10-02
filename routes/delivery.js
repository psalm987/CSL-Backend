var express = require("express");
var router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");

const Delivery = require("../models/Delivery");
const Notifications = require("../models/Notifications");
const User = require("../models/User");

/**
 * @route       POST api/delivery
 * @description Make a new Delivery
 * @access      Private (Client & Admins)
 * */

router.post(
  "/",
  [
    auth,
    check("pickLoc", "Pick up location is required").notEmpty(),
    check("dropLoc", "Drop off location is required").notEmpty(),
    check(
      "altPhone",
      "An alternative phone number for pick up or delivery is required"
    ).exists(),
    check("mode", "Mode of transportation is required").exists(),
    check("payment", "Mode of payment is required").exists(),
    check("payer", "Payer information is requires").exists(),
    check("type", "Type of delivery is required").exists(),
  ],
  async (req, res) => {
    // Check for input errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errors.array());
      return;
    }

    // destructure inputs
    const {
      type,
      mode,
      altPhone,
      pickDate,
      description,
      pickLoc,
      dropLoc,
      payment,
      payer,
      clientID,
    } = req.body;
    if (!["client", "admin", "superAdmin"].includes(req.user.role)) {
      res.status(400).json({ msg: "Not authorised" });
      return;
    } else if (req.user.role !== "client" && !clientID) {
      res.status(400).json({ msg: "Client ID required" });
      return;
    }

    try {
      let DeliveryInfo = {};
      if (type) DeliveryInfo.type = type;
      if (mode) DeliveryInfo.mode = mode;
      if (altPhone) DeliveryInfo.altPhone = altPhone;
      if (pickDate) DeliveryInfo.pickDate = pickDate;
      if (description) DeliveryInfo.description = description;
      if (pickLoc) DeliveryInfo.pickLoc = pickLoc;
      if (dropLoc) DeliveryInfo.dropLoc = dropLoc;
      if (payment) DeliveryInfo.payment = payment;
      if (payer) DeliveryInfo.payer = payer;
      DeliveryInfo.clientID =
        req.user.role === "client" ? req.user.id : clientID;

      const delivery = new Delivery(DeliveryInfo);
      const deliveryID = await delivery.save();
      const notification = new Notifications({
        userID: req.user.id,
        title: "Delivery request Successful",
        details: `made a delivery request by ${mode.title()}`,
        type: "delivery",
        payloadID: deliveryID,
      });
      await notification.save();
      res.status(200).json({ msg: "Delivery request successful" });
    } catch (err) {
      console.log(err);
      res.status(200).json({ msg: "Server Error" });
      return;
    }
  }
);

/**
 * @route       POST api/delivery/accept
 * @description Accept a new Delivery
 * @access      Private (Driver)
 * */

router.post(
  "/accept",
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
    const { id } = req.body;

    try {
      const delivery = await Delivery.findById(id);
      const driver = await User.findById(req.user.id);
      if (!delivery.driverID) {
        deliveryID = await delivery.update({
          driverID: req.user.id,
          status: "processing",
        });
        res.status(200).json({ msg: "Delivery accepted!" });
        const notification = new Notifications({
          userID: delivery.clientID,
          title: "Rider selected",
          details: `Your delivery request was just accepted by ${driver.name}`,
          type: "delivery",
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
module.exports = router;
