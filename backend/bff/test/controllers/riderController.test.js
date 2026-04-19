jest.mock("fs", () => ({
  createReadStream: jest.fn(() => "file-stream"),
  unlinkSync: jest.fn(),
}));

jest.mock("form-data", () =>
  jest.fn().mockImplementation(() => ({
    append: jest.fn(),
    getHeaders: jest.fn(() => ({ "content-type": "multipart/form-data" })),
  })),
);

jest.mock("../../src/utils/goProxy", () => {
  const actual = jest.requireActual("../../src/utils/goProxy");
  return {
    ...actual,
    proxyGet: jest.fn(),
    proxyPost: jest.fn(),
    proxyPut: jest.fn(),
    proxyDelete: jest.fn(),
    requestGoRaw: jest.fn(),
  };
});

jest.mock("../../src/utils/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const { requestGoRaw } = require("../../src/utils/goProxy");
const { getRiderCert, uploadCert } = require("../../src/controllers/riderController");

function createResponse() {
  return {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    end: jest.fn(),
  };
}

describe("riderController envelopes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("uploadCert rejects missing file with standardized envelope", async () => {
    const req = {
      params: { riderId: "r-1" },
    };
    const res = createResponse();

    await uploadCert(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "INVALID_ARGUMENT",
        message: "未检测到上传文件",
        error: "未检测到上传文件",
      }),
    );
  });

  test("uploadCert normalizes legacy upstream string errors", async () => {
    requestGoRaw.mockRejectedValue({
      message: "upload conflict",
      response: {
        status: 409,
        data: "证件已存在",
      },
    });

    const req = {
      params: { riderId: "r-1" },
      file: {
        path: "/tmp/rider-cert.png",
        originalname: "rider-cert.png",
      },
      body: { field: "id_card" },
    };
    const res = createResponse();

    await uploadCert(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "CONFLICT",
        message: "证件已存在",
        error: "证件已存在",
      }),
    );
  });

  test("uploadCert normalizes resolved upstream 4xx payloads", async () => {
    requestGoRaw.mockResolvedValue({
      status: 409,
      data: {
        success: false,
        error: "证件上传冲突",
        field: "id_card",
      },
    });

    const req = {
      params: { riderId: "r-1" },
      headers: { "x-request-id": "req-rider-409" },
      file: {
        path: "/tmp/rider-cert.png",
        originalname: "rider-cert.png",
      },
      body: { field: "id_card" },
    };
    const res = createResponse();

    await uploadCert(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      request_id: "req-rider-409",
      code: "CONFLICT",
      message: "证件上传冲突",
      data: {},
      success: false,
      error: "证件上传冲突",
      field: "id_card",
    });
  });

  test("getRiderCert forwards stream responses with passthrough headers", async () => {
    const stream = {
      pipe: jest.fn(),
      destroy: jest.fn(),
    };
    requestGoRaw.mockResolvedValue({
      status: 200,
      data: stream,
      headers: {
        "content-type": "image/jpeg",
        "content-disposition": 'inline; filename="cert.jpg"',
        "transfer-encoding": "chunked",
      },
    });

    const req = {
      method: "GET",
      params: { riderId: "r-1" },
      query: {},
    };
    const res = createResponse();
    const next = jest.fn();

    await getRiderCert(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledWith("content-type", "image/jpeg");
    expect(res.setHeader).toHaveBeenCalledWith("content-disposition", 'inline; filename="cert.jpg"');
    expect(res.setHeader).not.toHaveBeenCalledWith("transfer-encoding", "chunked");
    expect(stream.pipe).toHaveBeenCalledWith(res);
    expect(next).not.toHaveBeenCalled();
  });
});
