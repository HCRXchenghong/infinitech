jest.mock("../../src/utils/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

const {
  handleProxyError,
  normalizeSettingsProxyPayload,
} = require("../../src/services/adminSettings/proxyClient");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("admin settings proxy client envelope normalization", () => {
  test("wraps network failures into standardized upstream unavailable envelope", () => {
    const req = { requestId: "req-settings-1" };
    const res = createResponse();
    const error = new Error("network down");

    handleProxyError(req, res, error, "proxySettingsRequest");

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: "req-settings-1",
        success: false,
        code: "UPSTREAM_UNAVAILABLE",
        message: "network down",
        error: "network down",
      }),
    );
  });

  test("normalizes legacy upstream error payloads while keeping legacy fields", () => {
    const req = { requestId: "req-settings-2" };
    const res = createResponse();
    const error = {
      message: "conflict",
      response: {
        status: 409,
        data: {
          success: false,
          error: "配置冲突",
          lockedUntil: 123,
        },
      },
    };

    handleProxyError(req, res, error, "proxySettingsRequest");

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: "req-settings-2",
        success: false,
        code: "CONFLICT",
        message: "配置冲突",
        error: "配置冲突",
        lockedUntil: 123,
      }),
    );
  });

  test("normalizes resolved proxy responses with legacy error payloads", () => {
    const req = { requestId: "req-settings-3" };

    expect(
      normalizeSettingsProxyPayload(
        req,
        {
          status: 409,
          data: {
            success: false,
            error: "配置冲突",
            lockedUntil: 456,
          },
        },
        "配置请求失败",
      ),
    ).toEqual({
      request_id: "req-settings-3",
      code: "CONFLICT",
      message: "配置冲突",
      data: {},
      success: false,
      error: "配置冲突",
      lockedUntil: 456,
    });
  });
});
