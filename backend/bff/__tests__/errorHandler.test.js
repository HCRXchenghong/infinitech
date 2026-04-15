jest.mock("../src/utils/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

const { errorHandler } = require("../src/middleware/errorHandler");

function createMockResponse() {
  return {
    status: jest.fn(function setStatus() {
      return this;
    }),
    json: jest.fn(function setJson() {
      return this;
    }),
  };
}

describe("errorHandler", () => {
  test("maps multer file size overflow to 413", () => {
    const err = { name: "MulterError", code: "LIMIT_FILE_SIZE" };
    const req = { path: "/api/upload", method: "POST", headers: { "x-request-id": "req-upload-001" } };
    const res = createMockResponse();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      request_id: "req-upload-001",
      code: "PAYLOAD_TOO_LARGE",
      message: "文件大小不能超过10MB",
      data: {},
      success: false,
      error: "文件大小不能超过10MB",
      statusCode: 413,
    });
  });

  test("maps generic multer error to 400", () => {
    const err = { name: "MulterError", message: "Unexpected field" };
    const req = { path: "/api/upload", method: "POST", headers: { "x-request-id": "req-upload-002" } };
    const res = createMockResponse();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      request_id: "req-upload-002",
      code: "INVALID_ARGUMENT",
      message: "Unexpected field",
      data: {},
      success: false,
      error: "Unexpected field",
      statusCode: 400,
    });
  });
});
