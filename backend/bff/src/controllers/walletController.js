/**
 * 钱包 controller（用户端）- 代理到 Go 后端
 */

const { proxyGet, proxyPost } = require('../utils/goProxy');

function mergeQuery(req, defaults = {}) {
  return {
    ...defaults,
    ...(req.query || {}),
  };
}

async function getBalance(req, res, next) {
  await proxyGet(req, res, next, '/wallet/balance');
}

async function getTransactions(req, res, next) {
  await proxyGet(req, res, next, '/wallet/transactions');
}

async function getTransactionStatus(req, res, next) {
  await proxyGet(req, res, next, `/wallet/transactions/${encodeURIComponent(req.params.transactionId)}`);
}

async function getPaymentOptions(req, res, next) {
  await proxyGet(req, res, next, '/wallet/payment-options');
}

async function getRechargeOptions(req, res, next) {
  await proxyGet(req, res, next, '/wallet/payment-options', {
    params: mergeQuery(req, { scene: 'wallet_recharge' }),
  });
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

async function getRechargeStatus(req, res, next) {
  await proxyGet(req, res, next, '/wallet/recharge/status');
}

async function getWithdrawOptions(req, res, next) {
  await proxyGet(req, res, next, '/wallet/withdraw/options');
}

async function previewWithdrawFee(req, res, next) {
  await proxyPost(req, res, next, '/wallet/withdraw/fee-preview');
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

async function getWithdrawStatus(req, res, next) {
  await proxyGet(req, res, next, '/wallet/withdraw/status');
}

async function getWithdrawStatusById(req, res, next) {
  const requestId = String(req.params.requestId || '').trim();
  await proxyGet(req, res, next, '/wallet/withdraw/status', {
    params: mergeQuery(req, {
      requestId,
      request_id: requestId,
      withdrawRequestId: requestId,
      withdraw_request_id: requestId,
    }),
  });
}

async function getRiderDepositStatus(req, res, next) {
  await proxyGet(req, res, next, '/rider/deposit/status');
}

async function createRiderDepositPayIntent(req, res, next) {
  await proxyPost(req, res, next, '/rider/deposit/pay-intent', {
    headers: {
      'Idempotency-Key': req.headers['idempotency-key'] || '',
    }
  });
}

async function withdrawRiderDeposit(req, res, next) {
  await proxyPost(req, res, next, '/rider/deposit/withdraw', {
    headers: {
      'Idempotency-Key': req.headers['idempotency-key'] || '',
    }
  });
}

module.exports = {
  getBalance,
  getTransactions,
  getTransactionStatus,
  getPaymentOptions,
  getRechargeOptions,
  recharge,
  getRechargeStatus,
  payment,
  getWithdrawOptions,
  previewWithdrawFee,
  withdraw,
  getWithdrawStatus,
  getWithdrawStatusById,
  getWithdrawRecords,
  getRiderDepositStatus,
  createRiderDepositPayIntent,
  withdrawRiderDeposit,
};
