/**
 * 文件上传代理控制器
 */

const { proxyMultipartUpload } = require("../utils/multipartProxy");

async function uploadFile(req, res, next) {
  await proxyMultipartUpload(req, res, next, {
    path: "/upload",
  });
}

module.exports = {
  uploadFile,
};
