var express = require("express");
var router = express.Router();
const auth = require("../middleware/auth");

const Notifications = require("../models/Notifications");
const User = require("../models/User");
const createNotification = require("../middleware/createNotification");

/**
 * @route       GET api/notifications
 * @description Get all notifications
 * @access      Private
 * */

router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notifications.find({
      userID: req.user.id,
    })
      .limit(100)
      .sort("-dateCreated");
    await Notifications.updateMany(
      { userID: req.user.id, delivered: false },
      { delivered: true }
    );
    res.status(200).json(notifications);
  } catch (err) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/notifications/read/all
 * @description Read all notifications
 * @access      Private
 * */

router.post("/read/all", auth, async (req, res) => {
  try {
    await Notifications.updateMany(
      { userID: req.user.id, read: false },
      {
        read: true,
        delivered: true,
      }
    );
    const notifications = await Notifications.find({
      userID: req.user.id,
    }).sort("-dateCreated");
    res.status(200).json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/notifications/pushtoken
 * @description Store expo puch token
 * @access      Private
 * */

router.post("/pushtoken", auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { pushtoken: req.body.token });
    res.status(200).json({ msg: "Expo Token stored successfully" });
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/notifications/socket
 * @description Store socket ID
 * @access      Private
 * */

router.post("/socket", auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { socketID: req.body.id });
    res.status(200).json({ msg: "Scket ID stored successfully" });
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/notifications/read/:id
 * @description Read notification
 * @access      Private
 * */

router.post("/read/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    await Notifications.findByIdAndUpdate(id, { read: true });
    const notifications = await Notifications.find({
      userID: req.user.id,
    }).sort("-dateCreated");
    res.status(200).json(notifications);
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

/**
 * @route       POST api/notifications/mock
 * @description Read notification
 * @access      Private
 * */

router.post("/mock", auth, async (req, res) => {
  try {
    const { userID, title, details, type, link, payload } = req.body;
    if (!userID || !title || !details) {
      res.status(400).json("Bad request");
      return;
    }
    await createNotification({ userID, title, details, type, link, payload });
    res.status(200).json("Notification sent");
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
    return;
  }
});

module.exports = router;
