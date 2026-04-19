import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultRoleSyncServiceGetter } from "./role-sync-shell.js";

test("role sync shell derives default sync settings from config", () => {
  let receivedOptions = null;

  createDefaultRoleSyncServiceGetter({
    config: {
      API_BASE_URL: "https://api.example.com",
      TIMEOUT: 5400,
      isDev: true,
    },
    getLocalDB() {
      return { type: "db" };
    },
    createMobileSyncServiceGetterImpl(options) {
      receivedOptions = options;
      return { type: "sync-service" };
    },
  });

  assert.equal(receivedOptions.baseUrl, "https://api.example.com");
  assert.equal(receivedOptions.timeout, 5400);
  assert.equal(receivedOptions.productShopMode, "shop-menu");
  assert.equal(receivedOptions.supportsShopCategory, false);
  assert.equal(receivedOptions.isDev, true);
});

test("role sync shell respects explicit sync overrides", () => {
  let receivedOptions = null;

  createDefaultRoleSyncServiceGetter({
    config: {
      API_BASE_URL: "https://api.example.com",
      TIMEOUT: 5400,
      isDev: false,
    },
    baseUrl: "https://override.example.com",
    timeout: 9100,
    productShopMode: "custom-mode",
    supportsShopCategory: true,
    isDev: true,
    getLocalDB() {
      return { type: "db" };
    },
    createMobileSyncServiceGetterImpl(options) {
      receivedOptions = options;
      return { type: "sync-service" };
    },
  });

  assert.equal(receivedOptions.baseUrl, "https://override.example.com");
  assert.equal(receivedOptions.timeout, 9100);
  assert.equal(receivedOptions.productShopMode, "custom-mode");
  assert.equal(receivedOptions.supportsShopCategory, true);
  assert.equal(receivedOptions.isDev, true);
});
