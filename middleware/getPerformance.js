const Delivery = require("../models/Delivery");
const { Types } = require("mongoose");
const Reviews = require("../models/Reviews");

const match = (prop, more, time) => {
  return {
    $match: {
      [prop]: { $gte: time },
      ...(more || {}),
    },
  };
};

function getMonday(d) {
  d = new Date(d);
  var day = d.getDay(),
    diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
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

const getPerformance = async (id) => {
  const review = async (timeMatch) =>
    (
      await Reviews.aggregate([
        timeMatch("timestamp", { driver: Types.ObjectId(id) }),
        {
          $group: {
            _id: "null",
            average: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ])
    )[0];
  const dayReview = await review(dayMatch);
  const monthReview = await review(monthMatch);
  const weekReview = await review(weekMatch);
  const yearReview = await review(yearMatch);
  const allReview = await review(allMatch);

  const delivery = async (timeMatch) =>
    await Delivery.aggregate([
      timeMatch("dateCreated", { driver: Types.ObjectId(id) }),
      {
        $group: {
          _id: "$status",
          total: { $sum: 1 },
        },
      },
    ]);

  const monthlyDelivery = await Delivery.aggregate([
    {
      $match: {
        dateCreated: { $gte: getYear() },
        driver: Types.ObjectId(id),
      },
    },
    {
      $group: {
        _id: {
          status: "$status",
          month: { $month: "$dateCreated" },
        },
        total: { $sum: 1 },
      },
    },
  ]);

  const dayDelivery = await delivery(dayMatch);
  const monthDelivery = await delivery(monthMatch);
  const weekDelivery = await delivery(weekMatch);
  const yearDelivery = await delivery(yearMatch);
  const allDelivery = await delivery(allMatch);
  return {
    reviews: {
      day: dayReview,
      month: monthReview,
      week: weekReview,
      year: yearReview,
      all: allReview,
    },
    deliveries: {
      day: dayDelivery,
      month: monthDelivery,
      monthly: monthlyDelivery,
      week: weekDelivery,
      year: yearDelivery,
      all: allDelivery,
    },
  };
};

module.exports = getPerformance;
