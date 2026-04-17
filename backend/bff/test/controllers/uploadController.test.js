jest.mock("../../src/utils/multipartProxy", () => ({
  proxyMultipartUpload: jest.fn(),
}));

const { proxyMultipartUpload } = require("../../src/utils/multipartProxy");
const { uploadFile } = require("../../src/controllers/uploadController");

describe("uploadController uploadFile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    proxyMultipartUpload.mockResolvedValue(undefined);
  });

  it("forwards upload domain metadata to go upload service", async () => {
    const req = { body: { upload_domain: "profile_image" } };
    const res = {};
    const next = jest.fn();

    await uploadFile(req, res, next);

    expect(proxyMultipartUpload).toHaveBeenCalledWith(req, res, next, {
      path: "/upload",
      forwardFields: ["upload_domain"],
    });
  });
});
