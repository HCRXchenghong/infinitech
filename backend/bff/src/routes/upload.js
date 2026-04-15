/**
 * 文件上传路由
 */

const express = require("express");
const multer = require("multer");
const config = require("../config");
const uploadController = require("../controllers/uploadController");
const adminSettingsController = require("../controllers/adminSettingsController");
const { requireAdminAuth } = require("../middleware/requireAdminAuth");
const { requireRequestAuth } = require("../middleware/requireRequestAuth");

const router = express.Router();
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: config.uploads.fileSizeBytes,
    fieldSize: config.uploads.fieldSizeBytes,
    files: config.uploads.files,
  },
});

router.post(
  "/",
  requireRequestAuth,
  upload.single("file"),
  uploadController.uploadFile,
);
router.post(
  "/image",
  requireAdminAuth,
  upload.single("image"),
  adminSettingsController.uploadEditorImage,
);

module.exports = router;
