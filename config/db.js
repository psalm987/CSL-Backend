const mongoose = require("mongoose");
const db = process.env.MONGO_URI;

const methodDveride = require("method-override");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const crypto = require("crypto");

let upload = multer({});

const connectDB = async () => {
  try {
    console.log("connecting...");
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    console.log("MongoDB Connected...");
    const storage = new GridFsStorage({
      url: db,
      file: (req, file) => {
        return new Promise((resolve, reject) => {
          const filename = file.originalname;
          const fileInfo = {
            filename: filename,
            bucketName: "images",
          };
          resolve(fileInfo);
        });
      },
    });
    upload = multer({ storage });
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

const getGfs = async () => {
  const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "images",
  });
  return gfs;
};

module.exports = connectDB;
