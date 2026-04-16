import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_MANAGEMENT_ROLE_OPTIONS,
  buildAdminManagementCredentialReceiptMeta,
  buildAdminManagementPayload,
  createAdminManagementFormRules,
  createAdminManagementFormState,
  extractAdminManagementPage,
  filterAdminManagementRecords,
  formatAdminManagementTime,
  getAdminManagementDialogTitle,
  getAdminManagementRoleLabel,
  getAdminManagementRoleTagType,
  normalizeAdminManagementRecord,
  resolveAdminManagementId,
  validateAdminManagementPayload,
} from "./admin-management-resources.js";

test("admin management resources normalize records and role semantics", () => {
  assert.deepEqual(ADMIN_MANAGEMENT_ROLE_OPTIONS, [
    { label: "管理员", value: "admin" },
    { label: "超级管理员", value: "super_admin" },
  ]);

  assert.deepEqual(
    normalizeAdminManagementRecord({
      id: 9,
      phone: " 13800138000 ",
      name: " Ops ",
      type: " SUPER_ADMIN ",
      createdAt: "2026-04-16T08:09:10Z",
    }),
    {
      id: "9",
      legacyId: "9",
      uid: "",
      tsid: "",
      phone: "13800138000",
      name: "Ops",
      type: "super_admin",
      created_at: "2026-04-16T08:09:10Z",
      createdAt: "2026-04-16T08:09:10Z",
    },
  );

  assert.equal(getAdminManagementRoleLabel("admin"), "管理员");
  assert.equal(getAdminManagementRoleLabel("super_admin"), "超级管理员");
  assert.equal(getAdminManagementRoleTagType("super_admin"), "danger");
  assert.equal(formatAdminManagementTime("2026-04-16T08:09:10Z"), "2026-04-16 16:09");
});

test("admin management resources keep page extraction and filtering stable", () => {
  const page = extractAdminManagementPage({
    data: {
      admins: [
        { id: 1, phone: "13800138000", name: "Alice", type: "admin" },
        { legacyId: 2, phone: "13900139000", name: "Bob", type: "super_admin" },
      ],
      total: 2,
    },
  });

  assert.equal(page.total, 2);
  assert.equal(page.items[0].id, "1");
  assert.equal(page.items[1].legacyId, "2");
  assert.equal(resolveAdminManagementId(page.items[1]), "2");
  assert.deepEqual(
    filterAdminManagementRecords(page.items, "bob").map((item) => item.name),
    ["Bob"],
  );
});

test("admin management resources keep forms, payloads and receipt metadata stable", () => {
  assert.deepEqual(createAdminManagementFormState(), {
    phone: "",
    name: "",
    type: "admin",
    password: "",
  });
  assert.deepEqual(
    createAdminManagementFormState({
      phone: "13800138000",
      name: "Alice",
      type: "super_admin",
    }),
    {
      phone: "13800138000",
      name: "Alice",
      type: "super_admin",
      password: "",
    },
  );
  assert.equal(getAdminManagementDialogTitle(null), "添加管理员");
  assert.equal(getAdminManagementDialogTitle({ id: 1 }), "编辑管理员");
  assert.equal(createAdminManagementFormRules({ requirePassword: false }).password.length, 0);

  assert.deepEqual(
    buildAdminManagementPayload(
      { phone: " 13800138000 ", name: " Ops ", type: "super_admin", password: "StrongPass123!" },
      { includePassword: true },
    ),
    {
      phone: "13800138000",
      name: "Ops",
      type: "super_admin",
      password: "StrongPass123!",
    },
  );
  assert.deepEqual(
    buildAdminManagementPayload(
      { phone: "13800138000", name: "Ops", type: "admin", password: "ignored" },
      { includePassword: false },
    ),
    {
      phone: "13800138000",
      name: "Ops",
      type: "admin",
    },
  );
  assert.equal(validateAdminManagementPayload({}, { requirePassword: true }), "请输入手机号");
  assert.equal(
    validateAdminManagementPayload(
      { phone: "13800138000", name: "Ops", type: "admin", password: "" },
      { requirePassword: true },
    ),
    "请输入密码",
  );
  assert.equal(
    validateAdminManagementPayload(
      { phone: "13800138000", name: "Ops", type: "admin" },
      { requirePassword: false },
    ),
    "",
  );
  assert.deepEqual(
    buildAdminManagementCredentialReceiptMeta({
      id: 7,
      phone: "13800138000",
      name: "Alice",
    }),
    {
      scene: "admin-reset-password",
      subject: "管理员 Alice",
      account: "13800138000",
    },
  );
});
