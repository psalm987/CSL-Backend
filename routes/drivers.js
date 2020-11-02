var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

const fs = require("fs");

const { upload, getGfs } = require("../config/db");

const User = require("../models/User");
const DriverDetails = require("../models/DriverDetails");
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

/**
 * @route       GET api/drivers/performacne
 * @description Retreive a Driver Performance - Average review
 * @access      Private
 * */

router.get("/performance", auth, async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      res.status(400).json({ msg: "Not a dispatch account" });
      return;
    }
    const reviews = await Reviews.where({ driverID: req.user.id });
    const totalRatings = sum(reviews, "rating");
    const averageTotalRating = totalRatings.length
      ? totalRatings / totalRatings.length
      : 3;

    const dayReviews = await Reviews.where({ driverID: req.user.id }).gte(
      "timestamp",
      dDay
    );
    const totalDayRatings = sum(dayReviews, "rating");
    const averageDayRating = totalDayRatings.length
      ? totalDayRatings / totalDayRatings.length
      : 3;

    const weekReviews = await Reviews.where({ driverID: req.user.id }).gte(
      "timestamp",
      dWeek
    );
    const totalWeekRatings = sum(weekReviews, "rating");
    const averageWeekRating = totalWeekRatings.length
      ? totalWeekRatings / totalWeekRatings.length
      : 3;

    const monthReviews = await Reviews.where({ driverID: req.user.id }).gte(
      "timestamp",
      dMonth
    );
    const totalMonthRatings = sum(monthReviews, "rating");
    const averageMonthRating = totalMonthRatings.length
      ? totalMonthRatings / totalMonthRatings.length
      : 3;

    const yearReviews = await Reviews.where({ driverID: req.user.id }).gte(
      "timestamp",
      dYear
    );
    const totalYearRatings = sum(yearReviews, "rating");
    const averageYearRating = totalYearRatings.length
      ? totalYearRatings / totalYearRatings.length
      : 3;

    const totalDayDeliveries = await Delivery.where({ driverID: req.user.id })
      .gte("dateCreated", dDay)
      .countDocuments();
    const onGoingDay = await Delivery.where({ driverID: req.user.id })
      .gte("dateCreated", dDay)
      .or([{ status: "Pending" }, { status: "Processing" }])
      .countDocuments();
    const deliveredDay = await Delivery.where({ driverID: req.user.id })
      .gte("dateCreated", dDay)
      .where("status", "Delivered")
      .countDocuments();
    const cancelledDay = await Delivery.where({ driverID: req.user.id })
      .gte("dateCreated", dDay)
      .where("status", "Cancelled")
      .countDocuments();

    const totalWeekDeliveries = await Delivery.where({ driverID: req.user.id })
      .gte("dateCreated", dWeek)
      .countDocuments();
    const onGoingWeek = await Delivery.where({ driverID: req.user.id })
      .gte("dateCreated", dWeek)
      .or([{ status: "Pending" }, { status: "Processing" }])
      .countDocuments();
    const deliveredWeek = await Delivery.where({
      driverID: req.user.id,
      status: "Delivered",
    })
      .gte("dateCreated", dWeek)
      .countDocuments();
    const cancelledWeek = await Delivery.where({
      driverID: req.user.id,
      status: "Cancelled",
    })
      .gte("dateCreated", dWeek)
      .countDocuments();

    const totalMonthDeliveries = await Delivery.where({ driverID: req.user.id })
      .gte("dateCreated", dMonth)
      .countDocuments();
    const onGoingMonth = await Delivery.where({ driverID: req.user.id })
      .gte("dateCreated", dMonth)
      .or([{ status: "Pending" }, { status: "Processing" }])
      .countDocuments();
    const deliveredMonth = await Delivery.where({ driverID: req.user.id })
      .gte("dateCreated", dMonth)
      .where("status", "Delivered")
      .countDocuments();
    const cancelledMonth = await Delivery.where({ driverID: req.user.id })
      .gte("dateCreated", dMonth)
      .where("status", "Cancelled")
      .countDocuments();

    const totalYearDeliveries = await Delivery.where({ driverID: req.user.id })
      .gte("dateCreated", dYear)
      .countDocuments();
    const onGoingYear = await Delivery.where({ driverID: req.user.id })
      .gte("dateCreated", dYear)
      .or([{ status: "Pending" }, { status: "Processing" }])
      .countDocuments();
    const deliveredYear = await Delivery.where({
      driverID: req.user.id,
      status: "Delivered",
    })
      .gte("dateCreated", dYear)
      .countDocuments();
    const cancelledYear = await Delivery.where({
      driverID: req.user.id,
      status: "Cancelled",
    })
      .gte("dateCreated", dYear)
      .countDocuments();

    const totalAll = await Delivery.where({
      driverID: req.user.id,
    }).countDocuments();
    const onGoingAll = await Delivery.where({ driverID: req.user.id })
      .or([{ status: "Pending" }, { status: "Processing" }])
      .countDocuments();
    const deliveredAll = await Delivery.where({
      driverID: req.user.id,
      status: "Delivered",
    }).countDocuments();
    const cancelledAll = await Delivery.where({
      driverID: req.user.id,
      status: "Cancelled",
    }).countDocuments();

    const monthlyDeliveredGroups = (
      await Delivery.find({
        driverID: req.user.id,
      })
        .gte("dateCreated", dYear)
        .sort("-dateCreated")
    ).reduce((list, doc) => {
      const month = new Date(doc.timestamp).getMonth();
      switch (doc.status) {
        case "Cancelled":
          return {
            ...list,
            [month]: {
              cancelled:
                list[month] && list[month].cancelled
                  ? list[month].cancelled + 1
                  : 1,
              delivered: list[month] && list[month].delivered,
            },
          };
        case "Delivered":
          return {
            ...list,
            [month]: {
              cancelled: list[month] && list[month].cancelled,
              delivered:
                list[month] && list[month].delivered
                  ? list[month].delivered + 1
                  : 1,
            },
          };
        default:
          return list;
      }
    }, {});

    const result = {
      daily: {
        deliveries: {
          total: totalDayDeliveries,
          ongoing: onGoingDay,
          delivered: deliveredDay,
          cancelled: cancelledDay,
        },
        ratings: { total: totalDayRatings, average: averageDayRating },
      },
      weekly: {
        deliveries: {
          total: totalWeekDeliveries,
          ongoing: onGoingWeek,
          delivered: deliveredWeek,
          cancelled: cancelledWeek,
        },
        ratings: { total: totalWeekRatings, average: averageWeekRating },
      },
      monthly: {
        deliveries: {
          total: totalMonthDeliveries,
          ongoing: onGoingMonth,
          delivered: deliveredMonth,
          cancelled: cancelledMonth,
        },
        ratings: { total: totalMonthRatings, average: averageMonthRating },
      },
      yearly: {
        deliveries: {
          total: totalYearDeliveries,
          ongoing: onGoingYear,
          delivered: deliveredYear,
          cancelled: cancelledYear,
        },
        ratings: { total: totalYearRatings, average: averageYearRating },
      },
      all: {
        deliveries: {
          total: totalAll,
          ongoing: onGoingAll,
          delivered: deliveredAll,
          cancelled: cancelledAll,
          groups: monthlyDeliveredGroups,
        },
        ratings: { total: totalRatings, average: averageTotalRating },
      },
    };

    res.status(200).json(result);
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
    const DriverObj = { userID: user._id, photoUrl, staffID };
    const driver = new DriverDetails(DriverObj);
    await driver.save();
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
 * @route       POST api/drivers/delivery/recieved
 * @description Mark a delivery as recieved
 * @access      Private
 * */

router.post("/delivery/received", auth, async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      res.status(400).json({ msg: "Not a dispatch account" });
      return;
    }
    if (!req.body.id) {
      res.status(400).json({ msg: "Invalid request" });
      return;
    }
    const delivery = await Delivery.findById(req.body.id);
    if (delivery.driverID !== req.user.id) {
      res.status(400).json({ msg: "Not authorized" });
      return;
    }
    const client = await User.findById(delivery.clientID);
    let DeliveryObj = {};
    DeliveryObj.status = "Pending";
    DeliveryObj.track = [
      ...delivery.track,
      {
        action: "Picked up by a dispatch rider",
        timestamp: new Date().toISOString(),
      },
    ];
    delivery.updateOne(DeliveryObj);
    await createNotification({
      userID: delivery.clientID,
      title: "Pick up successful",
      details: `Your package has succefully be recieved by ${delivery.driver.name}.`,
      type: "success",
      link: "order",
      payload: delivery.id,
    });
    await createNotification({
      userID: delivery.driverID,
      title: "Pick up successful",
      details: `You have successfully recieved a package for ${client.name}.`,
      type: "success",
      link: "order",
      payload: delivery.id,
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
 * @route       POST api/drivers/delivery/delivered
 * @description Mark a delivery as delivered
 * @access      Private
 * */

router.post("/delivery/delivered", auth, async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      res.status(400).json({ msg: "Not a dispatch account" });
      return;
    }
    if (!req.body.id) {
      res.status(400).json({ msg: "Invalid request" });
      return;
    }
    const delivery = await Delivery.findById(req.body.id);
    if (delivery.driverID !== req.user.id) {
      res.status(400).json({ msg: "Not authorized" });
      return;
    }
    if (delivery.status !== "Processing") {
      res.status(400).json({ msg: "Invalid request" });
      return;
    }
    const client = await User.findById(delivery.clientID);
    let DeliveryObj = {};
    DeliveryObj.status = "Pending";
    DeliveryObj.track = [
      ...delivery.track,
      { action: "Delivered", timestamp: new Date().toISOString() },
    ];
    delivery.updateOne(DeliveryObj);
    await createNotification({
      userID: delivery.clientID,
      title: "Delivery successful",
      details: `Your package has succefully be delivered by ${delivery.driver.name}.`,
      type: "success",
      link: "order",
      payload: delivery.id,
    });
    await createNotification({
      userID: delivery.driverID,
      title: "Pick up successful",
      details: `You have successfully delivered a package for ${client.name}, Well done!`,
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

module.exports = router;
