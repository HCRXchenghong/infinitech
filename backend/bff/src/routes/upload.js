/**
 * 文件上传路由
 */

const express = require('express');
const multer = require('multer');
const config = require('../config');
const uploadController = require('../controllers/uploadController');

const router = express.Router();
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: config.uploads.fileSizeBytes,
    fieldSize: config.uploads.fieldSizeBytes,
    files: config.uploads.files
  }
});

router.post('/', upload.single('file'), uploadController.uploadFile);

module.exports = router;
