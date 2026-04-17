const { proxyMultipartUpload } = require("../../src/utils/multipartProxy");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("multipartProxy envelopes", () => {
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
});
