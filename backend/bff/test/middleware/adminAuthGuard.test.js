const {
  isAllowedAdminType: isAllowedAdminAuthType,
} = require("../../src/middleware/requireAdminAuth");
const {
  isAllowedAdminType: isAllowedQrAdminType,
} = require("../../src/services/adminController/qrCommon");

describe("admin auth type guards", () => {
  test("accepts only explicit admin role types", () => {
    expect(isAllowedAdminAuthType("admin")).toBe(true);
    expect(isAllowedAdminAuthType("super_admin")).toBe(true);
    expect(isAllowedAdminAuthType("")).toBe(false);
    expect(isAllowedAdminAuthType("   ")).toBe(false);
    expect(isAllowedAdminAuthType("merchant")).toBe(false);
  });

  test("qr login guard matches the same explicit role rules", () => {
    expect(isAllowedQrAdminType("admin")).toBe(true);
    expect(isAllowedQrAdminType("super_admin")).toBe(true);
    expect(isAllowedQrAdminType("")).toBe(false);
    expect(isAllowedQrAdminType("user")).toBe(false);
  });
});
