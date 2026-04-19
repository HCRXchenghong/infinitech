jest.mock("axios", () => jest.fn());

const axios = require("axios");
const { createUploadsProxy } = require("../../src/middleware/uploadsProxy");

function createResponse() {
  return {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    end: jest.fn(),
  };
}

describe("uploadsProxy envelopes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects unsupported methods with standardized method-not-allowed envelope", async () => {
    const req = {
      method: "POST",
      headers: {},
    };
    const res = createResponse();
    const next = jest.fn();
    const logger = { error: jest.fn() };
    const proxy = createUploadsProxy({
      goApiUrl: "http://localhost:8080",
      logger,
    });

    await proxy(req, res, next);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "METHOD_NOT_ALLOWED",
        message: "Method not allowed",
        error: "Method not allowed",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("forwards HEAD upload responses through shared stream passthrough", async () => {
    const stream = {
      pipe: jest.fn(),
      destroy: jest.fn(),
    };
    axios.mockResolvedValue({
      status: 200,
      data: stream,
      headers: {
        "content-type": "image/png",
        "content-length": "8",
        connection: "keep-alive",
      },
    });

    const req = {
      method: "HEAD",
      headers: {},
      originalUrl: "/uploads/banner.png",
    };
    const res = createResponse();
    const next = jest.fn();
    const logger = { error: jest.fn() };
    const proxy = createUploadsProxy({
      goApiUrl: "http://localhost:8080",
      logger,
    });

    await proxy(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledWith("content-type", "image/png");
    expect(res.setHeader).toHaveBeenCalledWith("content-length", "8");
    expect(res.setHeader).not.toHaveBeenCalledWith("connection", "keep-alive");
    expect(stream.destroy).toHaveBeenCalledTimes(1);
    expect(stream.pipe).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });
});
