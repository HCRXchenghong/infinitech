/**
 * Admin 钱包操作 controller - 代理到 Go 后端
 */

const {
  proxyGet,
  proxyPost,
  requestGoRaw,
  buildNormalizedErrorPayload,
} = require('../utils/goProxy');
const { buildSuccessEnvelopePayload } = require('../utils/apiEnvelope');
const { extractVerifiedAdminIdentity } = require('../utils/authIdentity');
const { collectServiceStatus } = require('../services/systemLogs/healthStatus');

function resolveAdminIdentity(req) {
  const verifiedIdentity = req.adminAuth || extractVerifiedAdminIdentity(req, { normalizeType: true });
  const headerAdminId = String(req.headers['x-admin-id'] || '').trim();
  const headerAdminName = String(req.headers['x-admin-name'] || '').trim();

  return {
    id: headerAdminId || String(verifiedIdentity?.id || '').trim(),
    name: headerAdminName || String(verifiedIdentity?.name || '').trim(),
  };
}

function adminHeaders(req) {
  const identity = resolveAdminIdentity(req);
  return {
    'X-Admin-ID': identity.id,
    'X-Admin-Name': identity.name,
  };
}

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function filterItems(items, req, descriptors = []) {
  return items.filter((item) => {
    for (const descriptor of descriptors) {
      const rawExpected = req.query?.[descriptor.queryKey];
      if (rawExpected === undefined || rawExpected === null || String(rawExpected).trim() === '') {
        continue;
      }

      if (descriptor.type === 'boolean') {
        const expected = String(rawExpected).trim().toLowerCase();
        const actual = Boolean(item?.[descriptor.itemKey]);
        if ((expected === 'true' || expected === '1') && !actual) {
          return false;
        }
        if ((expected === 'false' || expected === '0') && actual) {
          return false;
        }
        continue;
      }

      const expected = String(rawExpected).trim().toLowerCase();
      const actual = String(item?.[descriptor.itemKey] || '').trim().toLowerCase();
      if (actual !== expected) {
        return false;
      }
    }
    return true;
  });
}

async function fetchPayCenterConfig(req) {
  return requestGoRaw(req, {
    method: 'get',
    path: '/admin/wallet/pay-center/config',
    headers: adminHeaders(req),
    params: req.query || {},
    validateStatus: (status) => status < 500,
  });
}

function sendUpstreamResponse(req, res, response, defaultErrorMessage = '钱包中心请求失败') {
  if (Number(response.status) >= 400) {
    return res.status(response.status).json(
      buildNormalizedErrorPayload(
        req,
        {
          message:
            response.data?.error ||
            response.data?.message ||
            defaultErrorMessage,
          response,
        },
        response.status,
        defaultErrorMessage,
      ),
    );
  }
  return res.status(response.status).json(response.data);
}

function sendWalletSuccess(req, res, message, payload) {
  return res.status(200).json(
    buildSuccessEnvelopePayload(req, message, payload, {
      legacy: payload,
    }),
  );
}

function sendWalletUpstreamError(req, res, error, defaultErrorMessage) {
  const status = Number(error.response?.status || 500);
  return res.status(status).json(
    buildNormalizedErrorPayload(req, error, status, defaultErrorMessage),
  );
}

async function respondFromPayCenterConfig(req, res, next, selector) {
  try {
    const response = await fetchPayCenterConfig(req);
    if (response.status >= 400) {
      return sendUpstreamResponse(req, res, response, '支付中心配置加载失败');
    }
    return sendWalletSuccess(req, res, '支付中心配置加载成功', selector(response.data || {}));
  } catch (error) {
    if (error.response) {
      return sendWalletUpstreamError(req, res, error, '支付中心配置加载失败');
    }
    return next(error);
  }
}

async function addBalance(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/add-balance', {
    headers: adminHeaders(req)
  });
}

async function deductBalance(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/deduct-balance', {
    headers: adminHeaders(req)
  });
}

async function freezeAccount(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/freeze', {
    headers: adminHeaders(req)
  });
}

async function unfreezeAccount(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/unfreeze', {
    headers: adminHeaders(req)
  });
}

async function listOperations(req, res, next) {
  await proxyGet(req, res, next, '/admin/wallet/operations', {
    headers: adminHeaders(req)
  });
}

async function listWithdrawRequests(req, res, next) {
  await proxyGet(req, res, next, '/admin/wallet/withdraw-requests', {
    headers: adminHeaders(req)
  });
}

async function listPaymentCallbacks(req, res, next) {
  await proxyGet(req, res, next, '/admin/wallet/payment-callbacks', {
    headers: adminHeaders(req)
  });
}

async function getPaymentCallbackDetail(req, res, next) {
  await proxyGet(req, res, next, `/admin/wallet/payment-callbacks/${encodeURIComponent(req.params.id)}`, {
    headers: adminHeaders(req)
  });
}

async function replayPaymentCallback(req, res, next) {
  await proxyPost(req, res, next, `/admin/wallet/payment-callbacks/${encodeURIComponent(req.params.id)}/replay`, {
    headers: adminHeaders(req)
  });
}

async function getPayCenterConfig(req, res, next) {
  await proxyGet(req, res, next, '/admin/wallet/pay-center/config', {
    headers: adminHeaders(req)
  });
}

async function savePayCenterConfig(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/pay-center/config', {
    headers: adminHeaders(req)
  });
}

async function previewSettlement(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/settlement/rule-preview', {
    headers: adminHeaders(req)
  });
}

async function getSettlementOrder(req, res, next) {
  await proxyGet(req, res, next, `/admin/wallet/settlement/orders/${encodeURIComponent(req.params.id)}`, {
    headers: adminHeaders(req)
  });
}

async function getRiderDepositOverview(req, res, next) {
  await proxyGet(req, res, next, '/admin/wallet/rider-deposit/overview', {
    headers: adminHeaders(req)
  });
}

async function listRiderDepositRecords(req, res, next) {
  await proxyGet(req, res, next, '/admin/wallet/rider-deposit/records', {
    headers: adminHeaders(req)
  });
}

async function reviewWithdraw(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/withdraw-requests/review', {
    headers: adminHeaders(req)
  });
}

async function recharge(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/recharge', {
    headers: adminHeaders(req)
  });
}

async function getChannelMatrix(req, res, next) {
  await respondFromPayCenterConfig(req, res, next, (data) => ({
    items: filterItems(normalizeList(data.channel_matrix), req, [
      { queryKey: 'userType', itemKey: 'user_type' },
      { queryKey: 'platform', itemKey: 'platform' },
      { queryKey: 'scene', itemKey: 'scene' },
      { queryKey: 'channel', itemKey: 'channel' },
      { queryKey: 'enabled', itemKey: 'enabled', type: 'boolean' },
    ]),
    gateway_summary: data.gateway_summary || {},
    pay_mode: data.pay_mode || {},
  }));
}

async function getPayCenterHealth(req, res, next) {
  try {
    const [configResponse, serviceStatus] = await Promise.all([
      fetchPayCenterConfig(req),
      collectServiceStatus(),
    ]);

    if (configResponse.status >= 400) {
      return sendUpstreamResponse(req, res, configResponse, '支付中心健康状态加载失败');
    }

    return sendWalletSuccess(req, res, '支付中心健康状态加载成功', {
      checkedAt: serviceStatus?.checkedAt || new Date().toISOString(),
      gateway_summary: configResponse.data?.gateway_summary || {},
      pay_mode: configResponse.data?.pay_mode || {},
      serviceStatus,
    });
  } catch (error) {
    if (error.response) {
      return sendWalletUpstreamError(req, res, error, '支付中心健康状态加载失败');
    }
    return next(error);
  }
}

async function listSettlementSubjects(req, res, next) {
  await respondFromPayCenterConfig(req, res, next, (data) => ({
    items: filterItems(normalizeList(data.settlement_subjects), req, [
      { queryKey: 'subjectType', itemKey: 'subject_type' },
      { queryKey: 'scopeType', itemKey: 'scope_type' },
      { queryKey: 'scopeId', itemKey: 'scope_id' },
      { queryKey: 'enabled', itemKey: 'enabled', type: 'boolean' },
    ]),
  }));
}

async function listSettlementRuleSets(req, res, next) {
  await respondFromPayCenterConfig(req, res, next, (data) => ({
    items: filterItems(normalizeList(data.settlement_rules), req, [
      { queryKey: 'scopeType', itemKey: 'scope_type' },
      { queryKey: 'scopeId', itemKey: 'scope_id' },
      { queryKey: 'enabled', itemKey: 'enabled', type: 'boolean' },
    ]),
  }));
}

async function listWithdrawFeeRules(req, res, next) {
  await respondFromPayCenterConfig(req, res, next, (data) => ({
    items: filterItems(normalizeList(data.withdraw_fee_rules), req, [
      { queryKey: 'userType', itemKey: 'user_type' },
      { queryKey: 'withdrawMethod', itemKey: 'withdraw_method' },
      { queryKey: 'enabled', itemKey: 'enabled', type: 'boolean' },
    ]),
  }));
}

module.exports = {
  addBalance,
  deductBalance,
  freezeAccount,
  unfreezeAccount,
  listOperations,
  listWithdrawRequests,
  listPaymentCallbacks,
  getPaymentCallbackDetail,
  replayPaymentCallback,
  getPayCenterConfig,
  savePayCenterConfig,
  getChannelMatrix,
  getPayCenterHealth,
  previewSettlement,
  getSettlementOrder,
  listSettlementSubjects,
  listSettlementRuleSets,
  listWithdrawFeeRules,
  getRiderDepositOverview,
  listRiderDepositRecords,
  reviewWithdraw,
  recharge,
};
