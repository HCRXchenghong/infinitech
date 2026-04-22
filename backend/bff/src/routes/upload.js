/**
 * 文件上传路由
 */

const express = require("express");
const uploadController = require("../controllers/uploadController");
const adminSettingsController = require("../controllers/adminSettingsController");
const { requireAdminAuth } = require("../middleware/requireAdminAuth");
const { requireUploadAuth } = require("../middleware/requireUploadAuth");
const { createSharedUpload } = require("./sharedUpload");

const router = express.Router();
const upload = createSharedUpload();

router.post(
  "/",
  requireUploadAuth,
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
