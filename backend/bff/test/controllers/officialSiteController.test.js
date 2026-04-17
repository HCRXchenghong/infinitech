jest.mock("axios", () => ({
  post: jest.fn(),
}));

jest.mock("../../src/config", () => ({
  socketServerApiSecret: "socket-secret",
  socketServerUrl: "http://socket.local",
}));

jest.mock("../../src/utils/goProxy", () => {
  const actual = jest.requireActual("../../src/utils/goProxy");
  return {
    ...actual,
    proxyGet: jest.fn(),
    proxyPost: jest.fn(),
    proxyPut: jest.fn(),
    requestGoRaw: jest.fn(),
  };
});

jest.mock("../../src/utils/multipartProxy", () => ({
  proxyMultipartUpload: jest.fn(),
}));

const { requestGoRaw } = require("../../src/utils/goProxy");
const {
  listPublicNews,
  getSupportSocketToken,
} = require("../../src/controllers/officialSiteController");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("officialSiteController envelopes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("normalizes resolved official-site upstream errors into standardized envelopes", async () => {
    requestGoRaw.mockResolvedValue({
      status: 409,
      data: {
        success: false,
        error: "提交冲突",
        asset_url: "/uploads/exposure.png",
      },
    });

    const req = {
      query: {},
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "site.example.com",
        "x-request-id": "req-site-1",
      },
      protocol: "https",
      get: jest.fn(() => "site.example.com"),
    };
    const res = createResponse();
    const next = jest.fn();

    await listPublicNews(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: "req-site-1",
        success: false,
        code: "CONFLICT",
        message: "提交冲突",
        error: "提交冲突",
        asset_url: "https://site.example.com/uploads/exposure.png",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("getSupportSocketToken normalizes non-2xx session lookup responses", async () => {
    requestGoRaw.mockResolvedValue({
      status: 404,
      data: "support session missing",
    });

    const req = {
      params: { token: "site-token-1" },
      headers: {
        "x-request-id": "req-site-404",
        "x-forwarded-proto": "https",
        "x-forwarded-host": "site.example.com",
      },
      protocol: "https",
      get: jest.fn(() => "site.example.com"),
    };
    const res = createResponse();
    const next = jest.fn();

    await getSupportSocketToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      request_id: "req-site-404",
      code: "NOT_FOUND",
      message: "support session missing",
      data: {},
      success: false,
      error: "support session missing",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
