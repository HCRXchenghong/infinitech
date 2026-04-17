jest.mock("../../src/utils/authIdentity", () => ({
  extractVerifiedAdminIdentity: jest.fn(),
  verifyAdminTokenSignature: jest.fn(),
}));

jest.mock("../../src/utils/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const {
  extractVerifiedAdminIdentity,
  verifyAdminTokenSignature,
} = require("../../src/utils/authIdentity");
const { verifyToken } = require("../../src/services/adminController/qrCommon");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("admin qr common envelopes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("verifyToken keeps valid=false compatibility while using standardized error envelope", async () => {
    extractVerifiedAdminIdentity.mockReturnValue(null);

    const req = {};
    const res = createResponse();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        valid: false,
        code: "UNAUTHORIZED",
        message: "缺少鉴权信息",
        error: "缺少鉴权信息",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("verifyToken returns standardized success envelope with legacy root fields", async () => {
    extractVerifiedAdminIdentity.mockReturnValue({
      token: "token",
      id: "admin-1",
      name: "Ops",
      type: "admin",
      payload: {
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    });
    verifyAdminTokenSignature.mockReturnValue({ valid: true });

    const req = { requestId: "req-qr-1" };
    const res = createResponse();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: "req-qr-1",
        success: true,
        code: "OK",
        message: "管理员令牌校验通过",
        valid: true,
        user: {
          id: "admin-1",
          name: "Ops",
          type: "admin",
          mustChangeBootstrap: false,
        },
        data: expect.objectContaining({
          valid: true,
          user: expect.objectContaining({
            id: "admin-1",
            name: "Ops",
          }),
        }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
