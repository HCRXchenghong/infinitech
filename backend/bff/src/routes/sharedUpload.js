const multer = require("multer");

const config = require("../config");

function resolveUploadFilesLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return config.uploads.files;
}

function createSharedUpload(options = {}) {
  return multer({
    dest: "uploads/",
    limits: {
      fileSize: config.uploads.fileSizeBytes,
      fieldSize: config.uploads.fieldSizeBytes,
      files: resolveUploadFilesLimit(options.files),
    },
  });
}

module.exports = {
  createSharedUpload,
};
