var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var cors = require("cors");
var logger = require("morgan");
require("dotenv").config();

// Connect to the database
const { connectDB } = require("./config/db");
connectDB();

// Create routes variables
var usersRouter = require("./routes/users");
var authRouter = require("./routes/auth");
var deliveryRouter = require("./routes/delivery");
var notificationsRouter = require("./routes/notifications");
var driversRouter = require("./routes/drivers");
var adminRouter = require("./routes/admin");

// Initialize app
var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// define routes
app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
app.use("/api/delivery", deliveryRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/drivers", driversRouter);
app.use("/api/admin", adminRouter);

app.use(express.static(path.join(__dirname, "client", "build")));
app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500).json({ msg: "404 error" });
});

module.exports = app;
