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
const {
  normalizeUploadPayload,
  proxyMultipartUpload,
} = require("../../src/utils/multipartProxy");

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

  test("keeps protected legacy document upload paths non-public for private assets", () => {
    const req = {
      headers: {
        origin: "https://uploads.example.com",
      },
    };

    expect(
      normalizeUploadPayload(
        {
          request_id: "req-private-1",
          code: "OK",
          message: "上传成功",
          data: {
            access_policy: "private",
            asset_url: "/uploads/merchant_document/license.png",
            previewUrl: "/api/private-assets/preview?asset_id=private://document/merchant_document/merchant/18/license.png",
            owner_scope: "merchant_document:merchant:18",
          },
        },
        req,
      ),
    ).toEqual({
      request_id: "req-private-1",
      code: "OK",
      message: "上传成功",
      data: {
        access_policy: "private",
        asset_url: "/uploads/merchant_document/license.png",
        previewUrl: "/api/private-assets/preview?asset_id=private://document/merchant_document/merchant/18/license.png",
        owner_scope: "merchant_document:merchant:18",
      },
    });
  });

  test("still normalizes public upload paths for public assets", () => {
    const req = {
      headers: {
        origin: "https://uploads.example.com",
      },
    };

    expect(
      normalizeUploadPayload(
        {
          access_policy: "public",
          asset_url: "/uploads/profile_image/avatar.png",
          nested: {
            url: "https://api.example.com/uploads/review_media/review.png",
          },
        },
        req,
      ),
    ).toEqual({
      access_policy: "public",
      asset_url: "https://uploads.example.com/uploads/profile_image/avatar.png",
      nested: {
        url: "https://uploads.example.com/uploads/review_media/review.png",
      },
    });
  });
});
