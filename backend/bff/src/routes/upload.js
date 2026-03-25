/**
 * 文件上传路由
 */

const express = require('express');
const multer = require('multer');
const uploadController = require('../controllers/uploadController');

const router = express.Router();
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.post('/', upload.single('file'), uploadController.uploadFile);

module.exports = router;
