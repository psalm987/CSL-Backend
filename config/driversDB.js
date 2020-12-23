const { JsonDB } = require("node-json-db");
const { Config } = require("node-json-db/dist/lib/JsonDBConfig");

module.exports = new JsonDB(new Config("./drivers.json", true, true, "/"));
