var express = require("express");
var router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const dist = require("../middleware/distance");

const Delivery = require("../models/Delivery");

const User = require("../models/User");

const createNotification = require("../middleware/createNotification");
const { route } = require("./admin");
const Reviews = require("../models/Reviews");
const { Types } = require("mongoose");
const Coupons = require("../models/Coupons");
const { getSocket } = require("../config/socket");

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
    payment,
    note,
    schedule,
    coupons,
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
    if (payment && payment.type && payment.ref && payment.amount) {
      const { type, ref, amount } = payment;
      DeliveryInfo.payment = { type, ref, amount, timestamp: new Date() };
    }
    if (note) DeliveryInfo.note = note;
    if (schedule) DeliveryInfo.schedule = schedule;
    let ids;
    if (coupons && Array.isArray(coupons) && coupons.length > 0) {
      try {
        ids = coupons.map((id) => Types.ObjectId(id));
        const wrongCoupon = await Coupons.find({
          _id: { $in: ids },
          $or: [
            { client: { $ne: Types.ObjectId(req.user.id) } },
            { usages: 0 },
            { expires: { $lte: new Date() } },
            { valid: false },
          ],
        });
        const validCoupons = await Coupons.find({
          _id: { $in: ids },
        }).countDocuments();
        if (wrongCoupon.length || validCoupons !== ids.length) {
          throw "Invalid coupon code";
        }
        DeliveryInfo.coupons = ids;
      } catch (err) {
        console.log(err);
        res.status(400).json({ msg: "Invalid coupon code" });
        return;
      }
    }
    DeliveryInfo.client = req.user.id;
    const delivery = new Delivery(DeliveryInfo);
    await delivery.save();
    if (ids)
      await Coupons.updateMany(
        { _id: { $in: ids }, client: Types.ObjectId(req.user.id) },
        {
          transactions: {
            $push: {
              delivery: delivery._id,
              timestamp: new Date(),
            },
          },
          $inc: { usages: -1 },
        }
      );
    await createNotification({
      userID: req.user.id,
      title: "Delivery request Successful",
      details: `You made a delivery request by ${mode}. Our service agents will process your order in a few minutes.`,
      type: "success",
      link: "order",
      payload: delivery._id,
    });
    const io = getSocket();
    io.emit("NewDelivery");
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
    console.log(error);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/delivery/calc
 * @description Calculate Delivery Details
 * @access      Private
 * */

router.post("/calc", auth, async (req, res) => {
  const { from, to, mode } = req.body;
  console.log(req.body);
  try {
    const { distance, duration, price } = await dist(from, to, mode);

    console.log("items...", { distance, duration, price });
    console.log("id", req.user.id);
    const coupons = await Coupons.find({
      client: Types.ObjectId(req.user.id),
      expires: { $gt: new Date() },
      valid: true,
      usages: { $ne: 0 },
    });
    res
      .status(200)
      .json({ from, to, mode, distance, duration, price, coupons });
    return;
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/delivery/coupon
 * @description Apply coupon to price
 * @access      Private
 * */

router.post("/coupon", auth, async (req, res) => {
  const { price, coupons } = req.body;
  if (!(price && coupons && Array.isArray(coupons))) {
    res.status(400).json({ msg: "Bad request" });
    return;
  }
  try {
    const couponIDs = coupons.map((coupon) => coupon._id);
    const validCoupons = await Coupons.find({
      client: Types.ObjectId(req.user.id),
      _id: { $in: couponIDs },
      expires: { $gt: new Date() },
      valid: true,
      usages: { $ne: 0 },
    });
    let finalPrice = price;
    validCoupons.map((coupon) => {
      switch (coupon.type) {
        case "Flat Rate":
          if (finalPrice > coupon.value) {
            finalPrice = coupon.value;
          }
          break;
        case "Value":
          if (finalPrice > coupon.value) {
            finalPrice = finalPrice - coupon.value;
          }
          break;
        case "Percentage":
          finalPrice = finalPrice * (1 - coupon.value / 100);
          break;
        default:
          break;
      }
    });
    res.status(200).json({ price: finalPrice });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       GET api/delivery
 * @description Get all Deliveries
 * @access      Private (Client & Drivers)
 * */

router.get("/", auth, async (req, res) => {
  try {
    const deliveries = await (async () => {
      switch (req.user.role) {
        case "client":
          return await Delivery.find({ client: Types.ObjectId(req.user.id) })
            .populate("driver", "name photoUrl")
            .select(
              "driver status distance price dateCreated from to schedule mode"
            )
            .sort("-dateCreated")
            .limit(100);
        case "driver":
          return await Delivery.find({ driver: Types.ObjectId(req.user.id) })
            .select("status price distance dateCreated from to schedule mode")
            .sort("-dateCreated")
            .limit(100);
        default:
          return [];
      }
    })();
    res.status(200).json(deliveries);
    return;
  } catch (err) {
    console.log(err);
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
    if (delivery.client.toString() !== req.user.id) {
      res.status(400).json({ msg: "Not authorized" });
      return;
    }
    if (!["Pending", "Processing"].includes(delivery.status)) {
      res.status(400).json({ msg: "Delivery cannot be cancelled" });
      return;
    }
    await delivery.updateOne({
      status: "Cancelled",
      track: [
        ...delivery.track,
        { action: "Cancelled", timestamp: new Date().toISOString() },
      ],
    });
    await new Reviews({
      driver: delivery.driver,
      client: req.user.id,
      delivery: req.params.id,
      rating: 1,
      remark: req.body.remark,
    }).save();
    const client = await User.findById(delivery.client);
    await createNotification({
      userID: req.user.id,
      title: "Delivery Cancelled",
      details: `Your delivery has been cancelled successfully.`,
      type: "success",
      link: "order",
      payload: req.params.id,
    });
    await createNotification({
      userID: delivery.driver,
      title: "Delivery Cancelled",
      details: `A delivery for ${client.name} has been cancelled.`,
      type: "success",
      link: "order",
      payload: req.params.id,
    });
    res.status(200).json({ msg: "Delivery cancelled" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       GET api/delivery/:id
 * @description Retrieve a delivery
 * @access      Private
 * */

router.get("/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const delivery = await Delivery.findById(id)
      .populate("driver", "photoUrl name phone _id")
      .populate("client", "_id name phone");
    let rating;
    delivery.driver &&
      (await Reviews.aggregate([
        { $match: { driver: delivery.driver._id } },
        {
          $group: {
            _id: "rating",
            average: { $avg: "rating" },
            count: { $sum: 1 },
          },
        },
      ]));
    if (!delivery) {
      res.status(400).json({ msg: "Delivery does not exist" });
      console.log("Delivery does not exist");
      return;
    }
    if (
      (req.user.role === "client" &&
        delivery.client._id.toString() !== req.user.id) ||
      (req.user.role === "driver" &&
        delivery.driver._id.toString() !== req.user.id)
    ) {
      res.status(400).json({ msg: "Not Authorised" });
      return;
    }
    console.log(delivery);
    res.status(200).json({ ...delivery.toJSON(), rating });
    return;
  } catch (err) {
    console.log(err);
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
    const { rating, remark } = req.body;
    if (delivery.client.toString() !== req.user.id) {
      res.status(400).json({ msg: "Not authorized" });
      return;
    }
    if (!["Cancelled", "Delivered"].includes(delivery.status)) {
      res.status(400).json({ msg: "Delivery cannot be reviewed" });
      return;
    }
    await new Reviews({
      driver: delivery.driver,
      client: req.user.id,
      delivery: req.params.id,
      rating,
      remark,
    }).save();
    await delivery.updateOne({
      track: [
        ...delivery.track,
        { action: "Reviewed", timestamp: new Date().toISOString() },
      ],
    });
    const client = await User.findById(delivery.client);
    await createNotification({
      userID: req.user.id,
      title: "Review successful",
      details: `You have succefully reviewed a delivery order.`,
      type: "success",
      link: "order",
      payload: delivery._id,
    });
    await createNotification({
      userID: delivery.driver,
      title: "Delivery Cancelled",
      details: `A delivery for ${client.name} has been reviewed with a rating of ${rating}.`,
      type: "success",
      link: "order",
      payload: delivery._id,
    });
    res.status(200).json(delivery);
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

module.exports = router;
