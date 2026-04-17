const {
  getQrLoginSessionStatus,
  scanQrLoginSession,
} = require("../../src/services/adminController/qrLogin");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("admin qr login envelopes", () => {
  test("getQrLoginSessionStatus rejects empty ticket with standardized envelope", async () => {
    const req = { params: {} };
    const res = createResponse();

    await getQrLoginSessionStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "INVALID_ARGUMENT",
        message: "缺少二维码会话编号",
        error: "缺少二维码会话编号",
      }),
    );
  });

  test("scanQrLoginSession rejects invalid scan payload with standardized envelope", async () => {
    const req = { body: {} };
    const res = createResponse();

    await scanQrLoginSession(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "INVALID_ARGUMENT",
        message: "二维码内容无效或已过期",
        error: "二维码内容无效或已过期",
      }),
    );
  });
});
