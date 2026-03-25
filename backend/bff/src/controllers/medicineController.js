const { proxyPost } = require('../utils/goProxy');

async function consult(req, res, next) {
  return proxyPost(req, res, next, '/medicine/consult', {
    normalizeErrorResponse: true,
    defaultErrorMessage: '问诊服务暂不可用'
  });
}

module.exports = {
  consult
};
