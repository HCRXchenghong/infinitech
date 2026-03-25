const { proxyGet, proxyPost, proxyPut } = require('../utils/goProxy');

async function getHomeFeed(req, res, next) {
  await proxyGet(req, res, next, '/home/feed', {
    params: req.query || {},
  });
}

async function listCampaigns(req, res, next) {
  await proxyGet(req, res, next, '/home-campaigns', {
    params: req.query || {},
  });
}

async function createCampaign(req, res, next) {
  await proxyPost(req, res, next, '/home-campaigns');
}

async function updateCampaign(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyPut(req, res, next, `/home-campaigns/${id}`);
}

async function changeCampaignStatus(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  const action = encodeURIComponent(req.params.action);
  await proxyPost(req, res, next, `/home-campaigns/${id}/${action}`);
}

async function getHomeSlots(req, res, next) {
  await proxyGet(req, res, next, '/home-slots', {
    params: req.query || {},
  });
}

async function upsertLockedSlot(req, res, next) {
  await proxyPut(req, res, next, '/home-slots');
}

module.exports = {
  getHomeFeed,
  listCampaigns,
  createCampaign,
  updateCampaign,
  changeCampaignStatus,
  getHomeSlots,
  upsertLockedSlot,
};
