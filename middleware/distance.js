const axios = require("axios");
const Prices = require("../models/Prices");
module.exports = async function (from, to, mode) {
  if (!(from.latitude && from.longitude && to.latitude && to.longitude && mode))
    throw "Incorrect distance coordinates format";
  const origin = from.latitude + "," + from.longitude;
  const destination = to.latitude + "," + to.longitude;
  googleMatrixAPI.apiKey = "AIzaSyAVa67y3wWEBxeAR5Q0p4PZtVknjarOlhQ";
  try {
    const res = await googleMatrixAPI.get({ origin, destination });
    const price = await calcPrice(res.distanceValue / 1000, mode);
    console.log("res...", res);
    console.log("price...", price);
    return { ...res, price };
  } catch (error) {
    console.log(error);
    return;
  }
};

const googleMatrixAPI = {
  apiKey: null,
  url: "https://maps.googleapis.com/maps/api/distancematrix/json?",
  get: async function (data) {
    const origin = "origins=" + data.origin;
    const destination = "destinations=" + data.destination;
    const query =
      googleMatrixAPI.url +
      origin +
      "&" +
      destination +
      "&key=" +
      googleMatrixAPI.apiKey;
    const res = await axios.get(query);
    const result = res.data.rows[0].elements[0];
    const distance = result.distance.text;
    const distanceValue = result.distance.value;
    const duration = result.duration.text;
    const durationValue = result.duration.value;
    return { distance, distanceValue, duration, durationValue };
  },
};

const calcPrice = async (distance, mode) => {
  const list = await Prices.find({ mode }).sort({ dateUpdated: -1 });
  const priceList = list[0].priceList.sort((a, b) => a.distance - b.distance);
  console.log(priceList);
  const array = priceList.filter((price) => price.distance <= distance);
  console.log(array);
  const price = array[array.length - 1].price;
  console.log(price);
  return price;
};
