const path = require("path");
const config = require("../../config");

const BACKEND_URL = config.goApiUrl;
const CLEAR_ALL_VERIFY_ACCOUNT = process.env.SYSTEM_LOG_DELETE_ACCOUNT || "infinitech";
const CLEAR_ALL_VERIFY_PASSWORD = process.env.SYSTEM_LOG_DELETE_PASSWORD || "20250724";

const BFF_COMBINED_LOG_PATH = path.resolve(__dirname, "../../../logs/combined.log");
const BFF_ERROR_LOG_PATH = path.resolve(__dirname, "../../../logs/error.log");
const GO_COMBINED_LOG_PATH = path.resolve(__dirname, "../../../../go/logs/combined.log");
const GO_ERROR_LOG_PATH = path.resolve(__dirname, "../../../../go/logs/error.log");

module.exports = {
  BACKEND_URL,
  CLEAR_ALL_VERIFY_ACCOUNT,
  CLEAR_ALL_VERIFY_PASSWORD,
  BFF_COMBINED_LOG_PATH,
  BFF_ERROR_LOG_PATH,
  GO_COMBINED_LOG_PATH,
  GO_ERROR_LOG_PATH,
};
