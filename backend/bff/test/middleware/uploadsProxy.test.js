const { createUploadsProxy } = require("../../src/middleware/uploadsProxy");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("uploadsProxy envelopes", () => {
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
});
