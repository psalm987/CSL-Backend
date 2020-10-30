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
  try {
    const notifications = new Notifications({
      userID,
      title,
      details,
      type,
      link,
      payload,
    });
    const user = await User.findById(userID);
    user.pushtoken &&
      (await Axios.post("https://exp.host/--/api/v2/push/send", {
        to: user.pushtoken,
        title,
        body: details,
        sound: "default",
        channelId: "default",
      }));
    await notifications.save();
    if (user.socketID) {
      const { io } = getSocket();
      io.to(user.socketID).emit("NewNotification");
      console.log("sent to io...", io, " with socket id ", user.socketID);
    }
  } catch (err) {
    console.log(err);
  }
};

module.exports = createNotification;
