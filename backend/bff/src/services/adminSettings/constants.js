const path = require("path");
const config = require("../../config");

const BACKEND_URL = config.goApiUrl;
const CLEAR_ALL_VERIFY_ACCOUNT = String(process.env.SYSTEM_LOG_DELETE_ACCOUNT || "").trim();
const CLEAR_ALL_VERIFY_PASSWORD = String(process.env.SYSTEM_LOG_DELETE_PASSWORD || "");

function isClearAllVerifyConfigured() {
  return Boolean(CLEAR_ALL_VERIFY_ACCOUNT && CLEAR_ALL_VERIFY_PASSWORD);
}

const BFF_COMBINED_LOG_PATH = path.resolve(__dirname, "../../../logs/combined.log");
const BFF_ERROR_LOG_PATH = path.resolve(__dirname, "../../../logs/error.log");
const GO_COMBINED_LOG_PATH = path.resolve(__dirname, "../../../../go/logs/combined.log");
const GO_ERROR_LOG_PATH = path.resolve(__dirname, "../../../../go/logs/error.log");

module.exports = {
  BACKEND_URL,
  CLEAR_ALL_VERIFY_ACCOUNT,
  CLEAR_ALL_VERIFY_PASSWORD,
  isClearAllVerifyConfigured,
  BFF_COMBINED_LOG_PATH,
  BFF_ERROR_LOG_PATH,
  GO_COMBINED_LOG_PATH,
  GO_ERROR_LOG_PATH,
};
