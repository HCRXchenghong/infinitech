import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_USER_CACHE_LIMIT,
  buildAdminUserCreatePayload,
  createAdminUserCacheKey,
  createAdminUserListParams,
  createEmptyAdminUserForm,
  DEFAULT_ADMIN_USER_TYPE,
  formatAdminUserDateTime,
  getAdminUserVipLabel,
  getAdminUserVipTagType,
  normalizeAdminUserSearchKeyword,
  validateAdminUserCreateForm,
} from "./user-management-resources.js";

test("user management resources build stable list params and cache keys", () => {
  assert.equal(DEFAULT_ADMIN_USER_TYPE, "customer");
  assert.equal(ADMIN_USER_CACHE_LIMIT, 20);
  assert.equal(normalizeAdminUserSearchKeyword(" 张三 "), "张三");
  assert.deepEqual(
    createAdminUserListParams({
      page: "3",
      limit: "30",
      searchKeyword: " 13800138000 ",
    }),
    {
      page: 3,
      limit: 30,
      type: "customer",
      search: "13800138000",
    },
  );
  assert.equal(
    createAdminUserCacheKey({
      page: 3,
      limit: 30,
      searchKeyword: " 13800138000 ",
    }),
    "3-30-customer-13800138000",
  );
});

test("user management resources validate and build create payloads", () => {
  assert.deepEqual(createEmptyAdminUserForm(), {
    phone: "",
    name: "",
    password: "",
  });

  assert.deepEqual(validateAdminUserCreateForm({}), {
    valid: false,
    message: "请填写完整信息",
    normalized: {
      phone: "",
      name: "",
      password: "",
    },
  });

  assert.deepEqual(
    validateAdminUserCreateForm({
      phone: " 123 ",
      name: " 张三 ",
      password: "123456",
    }),
    {
      valid: false,
      message: "请输入正确的手机号",
      normalized: {
        phone: "123",
        name: "张三",
        password: "123456",
      },
    },
  );

  assert.deepEqual(
    validateAdminUserCreateForm({
      phone: "13800138000",
      name: " 张三 ",
      password: "12345",
    }),
    {
      valid: false,
      message: "密码至少需要6位",
      normalized: {
        phone: "13800138000",
        name: "张三",
        password: "12345",
      },
    },
  );

  assert.deepEqual(
    buildAdminUserCreatePayload({
      phone: " 13800138000 ",
      name: " 张三 ",
      password: "123456",
    }),
    {
      phone: "13800138000",
      name: "张三",
      password: "123456",
      type: "customer",
    },
  );
});

test("user management resources keep user display semantics stable", () => {
  assert.equal(getAdminUserVipLabel(""), "普通用户");
  assert.equal(getAdminUserVipLabel(" 黄金VIP "), "黄金VIP");
  assert.equal(getAdminUserVipTagType("至尊VIP"), "warning");
  assert.equal(getAdminUserVipTagType("未知"), "");
  assert.equal(formatAdminUserDateTime(""), "-");
  assert.equal(formatAdminUserDateTime("not-a-date"), "not-a-date");
  assert.equal(
    formatAdminUserDateTime("2026-04-16T12:34:00+08:00"),
    "2026-04-16 12:34",
  );
});
