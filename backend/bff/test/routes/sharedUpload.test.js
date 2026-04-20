jest.mock("multer", () => jest.fn(() => "multer-instance"));

const multer = require("multer");
const config = require("../../src/config");
const { createSharedUpload } = require("../../src/routes/sharedUpload");

describe("sharedUpload route policy", () => {
  beforeEach(() => {
    multer.mockClear();
  });

  test("creates upload middleware with shared BFF upload limits", () => {
    const middleware = createSharedUpload();

    expect(middleware).toBe("multer-instance");
    expect(multer).toHaveBeenCalledWith({
      dest: "uploads/",
      limits: {
        fileSize: config.uploads.fileSizeBytes,
        fieldSize: config.uploads.fieldSizeBytes,
        files: config.uploads.files,
      },
    });
  });

  test("allows explicit file-count overrides without weakening other limits", () => {
    createSharedUpload({ files: 3 });

    expect(multer).toHaveBeenCalledWith({
      dest: "uploads/",
      limits: {
        fileSize: config.uploads.fileSizeBytes,
        fieldSize: config.uploads.fieldSizeBytes,
        files: 3,
      },
    });
  });
});
