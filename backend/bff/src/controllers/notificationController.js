/**
 * 通知控制器
 */

const { proxyGet, proxyPost, proxyPut, proxyDelete } = require('../utils/goProxy');

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

async function getAdminNotificationList(req, res, next) {
  await proxyGet(req, res, next, '/notifications/admin/all', {
    params: req.query || {}
  });
}

async function getAdminNotificationDetail(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyGet(req, res, next, `/notifications/admin/${id}`);
}

async function createAdminNotification(req, res, next) {
  await proxyPost(req, res, next, '/notifications/admin', {
    data: req.body || {}
  });
}

async function updateAdminNotification(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyPut(req, res, next, `/notifications/admin/${id}`, {
    data: req.body || {}
  });
}

async function deleteAdminNotification(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyDelete(req, res, next, `/notifications/admin/${id}`);
}

module.exports = {
  getNotificationList,
  getNotificationDetail,
  markNotificationRead,
  markAllNotificationsRead,
  getAdminNotificationList,
  getAdminNotificationDetail,
  createAdminNotification,
  updateAdminNotification,
  deleteAdminNotification,
};
