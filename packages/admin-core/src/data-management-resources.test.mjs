import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDataManagementConfigImportConfirmMessage,
  buildDataManagementContentItemCount,
  buildDataManagementImportConfirmMessage,
  buildDataManagementImportPayload,
  buildDataManagementSummaryCards,
  buildPlatformBackupSummary,
  createDataManagementExportSummary,
  DATA_MANAGEMENT_BUSINESS_TYPES,
  DATA_MANAGEMENT_CONFIG_SCOPES,
  DATA_MANAGEMENT_IMPORT_MAX_MB,
  formatDataManagementExportDate,
  getDataManagementBusinessMeta,
  getDataManagementConfigMeta,
  isPlatformBackupPayload,
  validateDataManagementBusinessData,
  validateDataManagementConfigBundle,
  validateDataManagementImportFile,
} from "./data-management-resources.js";

test("data management resources expose stable metadata and export defaults", () => {
  assert.equal(DATA_MANAGEMENT_IMPORT_MAX_MB, 10);
  assert.equal(DATA_MANAGEMENT_BUSINESS_TYPES.length, 4);
  assert.equal(DATA_MANAGEMENT_CONFIG_SCOPES.length, 4);
  assert.deepEqual(createDataManagementExportSummary(), {
    users: 0,
    riders: 0,
    orders: 0,
    merchants: 0,
    systemSettingKeys: 0,
    contentItems: 0,
    publicApiCount: 0,
    paymentConfigGroups: 0,
  });
  assert.equal(
    formatDataManagementExportDate(new Date("2026-04-16T08:00:00.000Z")),
    "2026-04-16",
  );
  assert.deepEqual(getDataManagementBusinessMeta("users"), {
    key: "users",
    label: "用户",
    exportEndpoint: "/api/users/export",
    importEndpoint: "/api/users/import",
    requestKey: "users",
    filenamePrefix: "users_backup",
  });
  assert.equal(getDataManagementConfigMeta("payment_config")?.label, "支付配置");
});

test("data management resources keep summary and platform backup semantics stable", () => {
  assert.equal(
    buildDataManagementContentItemCount({
      carousel_count: "2",
      push_message_count: 3,
      home_campaign_count: "4",
    }),
    9,
  );
  assert.deepEqual(
    buildDataManagementSummaryCards(
      {
        users: 12,
        riders: 8,
        orders: 33,
        merchants: 4,
        systemSettingKeys: 21,
        contentItems: 7,
        publicApiCount: 5,
        paymentConfigGroups: 3,
      },
      true,
    ),
    [
      { label: "用户", value: 12, tip: "用户数据已校验总量" },
      { label: "骑手", value: 8, tip: "骑手数据已校验总量" },
      { label: "订单", value: 33, tip: "订单数据已校验总量" },
      { label: "商户", value: 4, tip: "商户数据已校验总量" },
      { label: "系统配置", value: 21, tip: "可导出配置键数量" },
      { label: "内容运营", value: 7, tip: "轮播、推送、首页投放总数" },
      { label: "API 配置", value: 5, tip: "第三方与开放接口数量" },
      { label: "支付配置", value: 3, tip: "支付配置组数量" },
    ],
  );
  assert.equal(buildDataManagementSummaryCards({}, false)[0].value, "--");
  assert.deepEqual(
    buildPlatformBackupSummary({
      users: [{ id: 1 }],
      riders: [{ id: 2 }, { id: 3 }],
      orders: [{ id: 4 }],
      merchants: [{ id: 5 }],
      system_settings: { summary: { setting_keys: 9 } },
      content_config: {
        summary: { carousel_count: 1, push_message_count: 2, home_campaign_count: 3 },
      },
      api_config: { summary: { public_api_count: 4 } },
      payment_config: { summary: { config_groups: 2 } },
    }),
    {
      usersCount: 1,
      ridersCount: 2,
      ordersCount: 1,
      merchantsCount: 1,
      systemSettingKeys: 9,
      contentItemsCount: 6,
      publicApiCount: 4,
      paymentConfigGroups: 2,
    },
  );
  assert.equal(isPlatformBackupPayload({ users: [] }), true);
  assert.equal(isPlatformBackupPayload({ backupType: "platform_snapshot" }), true);
  assert.equal(isPlatformBackupPayload({ foo: "bar" }), false);
});

test("data management resources validate import files and type payloads", () => {
  assert.deepEqual(
    validateDataManagementImportFile({ name: "backup.txt", type: "text/plain", size: 10 }),
    { valid: false, message: "请选择JSON格式的文件" },
  );
  assert.deepEqual(
    validateDataManagementImportFile({
      name: "backup.json",
      type: "application/json",
      size: 11 * 1024 * 1024,
    }),
    { valid: false, message: "文件大小不能超过10MB" },
  );
  assert.deepEqual(
    validateDataManagementImportFile({
      name: "backup.json",
      type: "application/json",
      size: 1024,
    }),
    { valid: true, message: "" },
  );

  assert.deepEqual(
    validateDataManagementBusinessData(
      [{ rider_id: 1, daily_order_count: 9 }],
      "users",
    ),
    { valid: false, error: "检测到这是骑手数据，不能导入到用户数据中！" },
  );
  assert.deepEqual(
    validateDataManagementBusinessData(
      [{ customer_id: 3, order_count_today: 1 }],
      "orders",
    ),
    { valid: false, error: "检测到这是用户数据，不能导入到订单数据中！" },
  );
  assert.deepEqual(
    validateDataManagementBusinessData([{ id: 1, name: "正常商户" }], "merchants"),
    { valid: true },
  );
});

test("data management resources keep config validation and import metadata stable", () => {
  assert.deepEqual(
    validateDataManagementConfigBundle(
      { scope: "api_config", sms_config: {} },
      "system_settings",
    ),
    {
      valid: false,
      error: "检测到这是 api_config 导出文件，不能导入到 system_settings 中！",
    },
  );
  assert.deepEqual(
    validateDataManagementConfigBundle(
      { carousel_settings: {}, push_messages: [] },
      "content_config",
    ),
    { valid: true },
  );
  assert.deepEqual(
    buildDataManagementImportPayload("orders", [{ id: 1 }]),
    { orders: [{ id: 1 }] },
  );
  assert.equal(
    buildDataManagementImportConfirmMessage("users", 5),
    "即将导入 5 条用户数据，这将覆盖或创建用户（包括已删除的用户）。是否继续？",
  );
  assert.equal(
    buildDataManagementConfigImportConfirmMessage("api_config"),
    "即将导入API 配置，这会按备份内容覆盖或创建对应配置。是否继续？",
  );
});
