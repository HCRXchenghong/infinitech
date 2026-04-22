/**
 * 文件上传路由
 */

const express = require("express");
const uploadController = require("../controllers/uploadController");
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

module.exports = router;
