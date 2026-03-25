/**
 * 通知控制器
 */

const { proxyGet, proxyPost } = require('../utils/goProxy');

async function getNotificationList(req, res, next) {
  const page = Number(req.query?.page || 1);
  const pageSize = Number(req.query?.pageSize || 20);
  await proxyGet(req, res, next, '/notifications', {
    params: { page, pageSize },
  });
}

async function getNotificationDetail(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyGet(req, res, next, `/notifications/${id}`);
}

async function markNotificationRead(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyPost(req, res, next, `/notifications/${id}/read`, {
    data: {}
  });
}

async function markAllNotificationsRead(req, res, next) {
  await proxyPost(req, res, next, '/notifications/read-all', {
    data: {}
  });
}

module.exports = {
  getNotificationList,
  getNotificationDetail,
  markNotificationRead,
  markAllNotificationsRead,
};
