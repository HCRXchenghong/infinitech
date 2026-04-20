const path = require("path");
const config = require("../../config");

const BACKEND_URL = config.goApiUrl;

function resolveClearAllVerifyCredential() {
  return {
    account: String(process.env.CLEAR_ALL_DATA_VERIFY_ACCOUNT || "").trim(),
    password: String(process.env.CLEAR_ALL_DATA_VERIFY_PASSWORD || ""),
  };
}

function isClearAllVerifyConfigured() {
  const credential = resolveClearAllVerifyCredential();
  return Boolean(credential.account && credential.password);
}

const BFF_COMBINED_LOG_PATH = path.resolve(__dirname, "../../../logs/combined.log");
const BFF_ERROR_LOG_PATH = path.resolve(__dirname, "../../../logs/error.log");
const GO_COMBINED_LOG_PATH = path.resolve(__dirname, "../../../../go/logs/combined.log");
const GO_ERROR_LOG_PATH = path.resolve(__dirname, "../../../../go/logs/error.log");

module.exports = {
  BACKEND_URL,
  resolveClearAllVerifyCredential,
  isClearAllVerifyConfigured,
  BFF_COMBINED_LOG_PATH,
  BFF_ERROR_LOG_PATH,
  GO_COMBINED_LOG_PATH,
  GO_ERROR_LOG_PATH,
};
