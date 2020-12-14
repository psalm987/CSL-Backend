const Notifications = require("../models/Notifications");
const User = require("../models/User");
const { getSocket } = require("../config/socket");
const { default: Axios } = require("axios");
const createNotification = async ({
  userID,
  title,
  details,
  type,
  link,
  payload,
}) => {
  console.log({
    userID,
    title,
    details,
    type,
    link,
    payload,
  });
  try {
    const notifications = new Notifications({
      user: userID,
      title,
      details,
      type,
      link,
      payload,
    });
    const userObj = await User.findById(userID);
    userObj.pushtoken &&
      (await Axios.post("https://exp.host/--/api/v2/push/send", {
        to: userObj.pushtoken,
        title,
        body: details,
        sound: "default",
        channelId: "default",
      }));
    await notifications.save();
    if (userObj.socketID) {
      const io = getSocket();
      io.to(userObj.socketID).emit("NewNotification");
      console.log("sent to io...", io, " with socket id ", userObj.socketID);
    }
  } catch (err) {
    console.log(err);
  }
};

module.exports = createNotification;
