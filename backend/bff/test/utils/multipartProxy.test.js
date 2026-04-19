jest.mock("fs", () => ({
  createReadStream: jest.fn(() => ({ mocked: true })),
  unlink: jest.fn((_path, callback) => {
    if (typeof callback === "function") {
      callback();
    }
  }),
}));

jest.mock("form-data", () => {
  return jest.fn().mockImplementation(() => ({
    append: jest.fn(),
    getHeaders: jest.fn(() => ({ "content-type": "multipart/form-data" })),
  }));
});

jest.mock("../../src/utils/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock("../../src/utils/goProxy", () => {
  const actual = jest.requireActual("../../src/utils/goProxy");
  return {
    ...actual,
    requestGoRaw: jest.fn(),
  };
});

const { requestGoRaw } = require("../../src/utils/goProxy");
const { proxyMultipartUpload } = require("../../src/utils/multipartProxy");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("multipartProxy envelopes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects missing file uploads with standardized invalid argument envelope", async () => {
    const req = {
      file: null,
    };
    const res = createResponse();
    const next = jest.fn();

    await proxyMultipartUpload(req, res, next, {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "INVALID_ARGUMENT",
        message: "没有上传文件",
        error: "没有上传文件",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("normalizes resolved upstream upload errors into standardized envelopes", async () => {
    requestGoRaw.mockResolvedValue({
      status: 409,
      data: {
        success: false,
        error: "上传冲突",
        asset_url: "/uploads/conflict.png",
      },
    });

    const req = {
      file: {
        path: "/tmp/mock-upload.png",
        originalname: "mock-upload.png",
      },
      body: {},
      headers: {
        origin: "https://uploads.example.com",
        "x-request-id": "req-upload-1",
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await proxyMultipartUpload(req, res, next, {
      path: "/uploads/common",
    });

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: "req-upload-1",
        success: false,
        code: "CONFLICT",
        message: "上传冲突",
        error: "上传冲突",
        asset_url: "https://uploads.example.com/uploads/conflict.png",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
