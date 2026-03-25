/**
 * 钱包 controller（用户端）- 代理到 Go 后端
 */

const { proxyGet, proxyPost } = require('../utils/goProxy');

async function getBalance(req, res, next) {
  await proxyGet(req, res, next, '/wallet/balance');
}

async function getTransactions(req, res, next) {
  await proxyGet(req, res, next, '/wallet/transactions');
}

async function recharge(req, res, next) {
  await proxyPost(req, res, next, '/wallet/recharge', {
    headers: {
      'Idempotency-Key': req.headers['idempotency-key'] || '',
    }
  });
}

async function payment(req, res, next) {
  await proxyPost(req, res, next, '/wallet/payment', {
    headers: {
      'Idempotency-Key': req.headers['idempotency-key'] || '',
    }
  });
}

async function withdraw(req, res, next) {
  await proxyPost(req, res, next, '/wallet/withdraw', {
    headers: {
      'Idempotency-Key': req.headers['idempotency-key'] || '',
    }
  });
}

async function getWithdrawRecords(req, res, next) {
  await proxyGet(req, res, next, '/wallet/withdraw/records');
}

module.exports = {
  getBalance,
  getTransactions,
  recharge,
  payment,
  withdraw,
  getWithdrawRecords,
};
