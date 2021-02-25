var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

const { socket } = require("../config/socket");

const User = require("../models/User");
const Delivery = require("../models/Delivery");

const createNotification = require("../middleware/createNotification");
const Prices = require("../models/Prices");
const Ads = require("../models/Ads");
const Coupons = require("../models/Coupons");
const getPerformance = require("../middleware/getPerformance");
const { Types } = require("mongoose");

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
      res.status(400).json({ msg: "No authorisation" });
      return;
    }
    if (await User.findOne({ email })) {
      res.status(400).json({ msg: "User already exists" });
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
      createNotification({
        userID: user.id,
        title: "Account Created",
        details:
          "Your account has been created successfully, you can now login as an administrator",
        type: "success",
        link: "profile",
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
 * @route       POST api/admin/coupon
 * @description Create a discount coupon
 * @access      Private
 * */

router.post("/coupon", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      res.status(400).json({ msg: "Not authorized" });
      return;
    }
    const { type, usages, infinite, value, client, expires } = req.body;
    if (!usages && !infinte) {
      res
        .status(400)
        .json({ msg: "Specify the number of usages for this cooupon" });
      return;
    }
    let use = infinite ? -1 : usages;
    await new Coupons({
      type,
      value,
      client,
      expires,
      usages: use,
      createdBy: req.user.id,
    }).save();
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/admin/delivery
 * @description Make a new Delivery
 * @access      Private (Admins)
 * */

router.post("/delivery", auth, async (req, res) => {
  // destructure inputs
  if (req.user.role !== "admin") {
    res.status(400).json({ msg: "Not authorized" });
    return;
  }
  const {
    from,
    to,
    distance,
    mode,
    price,
    pickUpNumber,
    dropOffNumber,
    note,
    client,
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
    if (note) DeliveryInfo.note = note;
    DeliveryInfo.client = client;
    const delivery = new Delivery(DeliveryInfo);
    await delivery.save();
    await createNotification({
      userID: client,
      title: "Delivery request Successful",
      details: `A request for a ${mode} delivery has been made on your account. Our service agents will process your order in a few minutes.`,
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
 * @route       GET api/admin/coupons
 * @description Retreive all discount coupons
 * @access      Private
 * */
router.get("/coupons", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      res.status(400).json({ msg: "Not authorized" });
      return;
    }
    const valid = await Coupons.find({
      valid: true,
      usages: { $ne: 0 },
      expires: { $gte: new Date() },
    })
      .populate("client", "name _id")
      .populate("createdBy", "name _id");
    const invalid = await Coupons.find({
      $or: [{ valid: false }, { usages: 0 }, { expires: { $lt: new Date() } }],
    })
      .populate("client", "name _id")
      .populate("createdBy", "name _id");
    res.status(200).json({ valid, invalid });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/admin/coupons/cancel/:id
 * @description Retreive all discount coupons
 * @access      Private
 * */
router.post("/coupons/cancel/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    await Coupons.findByIdAndUpdate(id, { valid: false });
    res.status(200).json({ msg: "Coupon cancelled successfully" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       GET api/admin/performance
 * @description Get sales performance
 * @access      Private
 * */

const match = (prop, more, time) => {
  return {
    $match: {
      [prop]: { $gte: time },
      ...(more || {}),
    },
  };
};

function getMonday() {
  var d = new Date();
  var day = d.getDay();
  var diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
  console.log(day, diff);
  return new Date(d.setDate(diff));
}
function getDay() {
  return new Date(new Date().setHours(0, 0, 0, 0));
}
function getMonth() {
  return new Date(new Date(new Date().setDate(1)).setHours(0, 0, 0, 0));
}
function getYear() {
  return new Date(
    new Date(new Date(new Date().setMonth(0)).setDate(1)).setHours(0, 0, 0, 0)
  );
}

const dayMatch = (prop, more) => match(prop, more, getDay());
const monthMatch = (prop, more) => match(prop, more, getMonth());
const weekMatch = (prop, more) => match(prop, more, getMonday(new Date()));
const yearMatch = (prop, more) => match(prop, more, getYear());
const allMatch = (prop, more) => match(prop, more, new Date(0));

const getAllPerformance = async () => {
  const delivery = async (timeMatch) =>
    await Delivery.aggregate([
      timeMatch("dateCreated"),
      {
        $group: {
          _id: "$status",
          total: { $sum: 1 },
          revenue: { $sum: { $toInt: "$price" } },
        },
      },
    ]);

  const monthlyDelivery = await Delivery.aggregate([
    {
      $match: {
        dateCreated: { $gte: getYear() },
      },
    },
    {
      $group: {
        _id: {
          status: "$status",
          month: { $month: "$dateCreated" },
        },
        total: { $sum: 1 },
        revenue: { $sum: { $toInt: "$price" } },
      },
    },
  ]);
  const dailyDelivery = await Delivery.aggregate([
    {
      $match: {
        dateCreated: { $gte: getMonth() },
      },
    },
    {
      $group: {
        _id: {
          status: "$status",
          day: { $dayOfWeek: "$dateCreated" },
        },
        total: { $sum: 1 },
        revenue: { $sum: { $toInt: "$price" } },
      },
    },
  ]);

  const dayDelivery = await delivery(dayMatch);
  const monthDelivery = await delivery(monthMatch);
  const weekDelivery = await delivery(weekMatch);
  const yearDelivery = await delivery(yearMatch);
  const allDelivery = await delivery(allMatch);

  return {
    day: dayDelivery,
    month: monthDelivery,
    monthly: monthlyDelivery,
    weekly: dailyDelivery,
    week: weekDelivery,
    year: yearDelivery,
    all: allDelivery,
  };
};

router.get("/performance", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      res.status(400).json({ msg: "Not authorised" });
      return;
    }
    res.status(200).json(await getAllPerformance());
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/admin/user/approve/:id
 * @description Approve a user
 * @access      Private
 * */

router.post("/user/approve/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "superAdmin") {
      res.status(400).json({ msg: "Not authorised" });
      return;
    }
    await User.findByIdAndUpdate(req.params.id, { valid: true });
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
 * @route       POST api/admin/user/ban/:id
 * @description Ban a user
 * @access      Private
 * */

router.post("/user/ban/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      res.status(400).json({ msg: "Not authorised" });
      return;
    }
    await User.findOneAndUpdate(req.params.id, { valid: false });
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
    const drivers = await User.find({ role: "driver" })
      .sort("-dateCreated")
      .select("name staffID phone email photoUrl valid banned");
    res.status(200).json(drivers);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       GET api/admin/driver/:id
 * @description Retrieve  driver details
 * @access      Private
 * */

router.get("/driver/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(400).json({ msg: "No authorisation" });
    return;
  }
  try {
    const driver = await User.findById(req.params.id).select(
      "name staffID phone email photoUrl valid banned"
    );
    if (!driver) {
      res.status(404).json({ msg: "No driver found" });
      return;
    }
    const performance = await getPerformance(driver.id);
    res.status(200).json({ ...driver.toJSON(), performance });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       GET api/admin/users
 * @description Retrieve all user details
 * @access      Private
 * */

router.get("/users", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(400).json({ msg: "No authorisation" });
    return;
  }
  try {
    const users = await User.find({ role: "client" })
      .sort("-dateCreated")
      .select("name phone email valid banned");
    res.status(200).json(users);
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
      console.log("Not an admin");
      res.status(400).json({ msg: "No authorisation" });
      return;
    }
    const { id, driverID, reassign } = req.body;
    const delivery = await Delivery.findById(id);
    const driverAccount = await User.findById(driverID);
    if (!delivery) {
      console.log("Not a valid Delivery");
      res.status(400).json({ msg: "Enter valid Delivery" });
      return;
    }
    if (!["Processing", "Pending"].includes(delivery.status)) {
      console.log("Delivery cannot be re-assigned");
      res.status(400).json({ msg: "Delivery cannot be re-assigned" });
      return;
    }
    if (!driverAccount || driverAccount.role !== "driver") {
      console.log("Driver not valid", driverAccount, " _id", driverID);
      res.status(400).json({ msg: "Driver not valid" });
      return;
    }
    if (delivery.driver && !reassign) {
      console.log("Set reassign to true");
      res.status(400).json({ msg: "Set reassign to true" });
      return;
    }
    if (delivery.driver && delivery.driver.toString() === driverID) {
      console.log("Can't re-assign to same driver");
      res.status(400).json({ msg: "Can't re-assign to same driver" });
      return;
    }
    let DeliveryObj = {};
    DeliveryObj.status = "Processing";
    DeliveryObj.driver = driverID;
    DeliveryObj.track = [
      ...delivery.track,
      {
        action: reassign
          ? "Re-assigned to a dispatch rider"
          : "Assigned to a dispatch rider",
        timestamp: new Date().toISOString(),
      },
    ];
    await delivery.updateOne(DeliveryObj);
    await createNotification({
      userID: delivery.client,
      title: "Rider selected",
      details: `Your delivery request was just assigned to ${driverAccount.name}`,
      type: "success",
      link: "order",
      payload: delivery._id,
    });
    await createNotification({
      userID: driverID,
      title: "New Delivery",
      details: `A delivery request was just assigned to you.`,
      type: "success",
      link: "order",
      payload: delivery._id,
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
 * @route       POST api/admin/delivery/status
 * @description Set a delivery status
 * @access      Private
 * */

router.post("/delivery/status", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      console.log("Not an admin");
      res.status(400).json({ msg: "No authorisation" });
      return;
    }
    const { status, id } = req.body;
    const delivery = await Delivery.findByIdAndUpdate(id, {
      status,
      $push: {
        track: {
          action: `Status changed to ${status}`,
          timestamp: new Date().toISOString(),
        },
      },
    });
    if (!delivery) {
      console.log("Not found", delivery);
      res.status(400).json({ msg: "Not found" });
      return;
    }
    await createNotification({
      userID: delivery.client.toString(),
      title: "Status Change",
      details: `The status of your delivery has been changed`,
      type: "success",
      link: "order",
      payload: delivery._id,
    });
    delivery.driver &&
      (await createNotification({
        userID: delivery.driver.toString(),
        title: "Status Change",
        details: `The status of a delivery has been changed`,
        type: "success",
        link: "order",
        payload: delivery._id,
      }));
    res.status(200).json({ msg: "Status Changed successfully" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       GET api/admin/deliveries
 * @description Get all deliveries
 * @access      Private
 * */

router.get("/deliveries", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      res.status(400).json({ msg: "No authorisation" });
      return;
    }
    const deliveries = await Delivery.find()
      .select("dateCreated client from to distance mode status _id")
      .sort("-dateCreated")
      .populate("client", "name -_id");
    res.status(200).json(deliveries);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       GET api/admin/driver/deliveries/:id
 * @description Get all deliveries
 * @access      Private
 * */

router.get("/driver/deliveries/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      res.status(400).json({ msg: "No authorisation" });
      return;
    }
    if (!req.params.id) {
      res.status(400).json({ msg: "No delivery id" });
      return;
    }
    const deliveries = await Delivery.find({ driver: req.params.id })
      .select("dateCreated client from to distance mode status _id")
      .sort("-dateCreated")
      .populate("client", "name -_id");
    res.status(200).json(deliveries);
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
    if (req.user.role !== "admin") {
      res.status(400).json({ msg: "No authorisation" });
      return;
    }
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
 * @route       GET api/admin/ads
 * @description Retreive all ads
 * @access      Private
 * */
router.get("/ads", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      res.status(400).json({ msg: "No authorisation" });
      return;
    }
    const ads = await Ads.find().sort("-dateUploaded");
    res.status(200).json(ads);
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
    const { title, image, link, expires } = req.body;
    const ad = new Ads({
      title,
      image,
      link,
      expires,
      uploadedBy: req.user.id,
    });
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

/**
 * @route       POST api/admin/ads/valid/:id
 * @description Disable/Enable a single ad
 * @access      Private
 * */

router.post("/ads/valid/:id", auth, async (req, res) => {
  try {
    const ad = await Ads.findById(req.params.id);
    const { valid } = ad;
    await ad.update({ valid: !valid });
    socket && socket.broadcast.emit("ads");
    res.status(200).json({ msg: "Update successful", valid: !valid });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/admin/multi/ads
 * @description Create a multiple ads
 * @access      Private
 * */

router.post("/multi/ads", auth, async (req, res) => {
  try {
    const { adlist } = req.body;
    adlist.map((ad) => {
      return { ...ad, uploadedBy: req.user.id };
    });
    await Ads.create(adlist);
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

/**
 * @route       GET api/admin/price_matrix
 * @description Retrieve price matrix
 * @access      Private
 * */

router.get("/price_matrix", auth, async (req, res) => {
  try {
    const Motorcycle = await Prices.findOne(
      { mode: "Motorcycle" },
      {},
      { sort: { dateUpdated: -1 } }
    );
    const Car = await Prices.findOne(
      { mode: "Car" },
      {},
      { sort: { dateUpdated: -1 } }
    );
    const Minivan = await Prices.findOne(
      { mode: "Mini Van" },
      {},
      { sort: { dateUpdated: -1 } }
    );

    let car, motorcycle, minivan;

    if (Motorcycle) motorcycle = Motorcycle.toJSON();
    if (Car) car = Car.toJSON();
    if (Minivan) minivan = Minivan.toJSON();

    res.status(200).json({
      motorcycle,
      car,
      minivan,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

module.exports = router;
