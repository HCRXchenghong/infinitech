jest.mock('../../src/utils/goProxy', () => ({
  goUrl: jest.fn(),
  proxyPost: jest.fn(),
  requestGoRaw: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const { requestSMSCode } = require('../../src/controllers/authController');
const { goUrl, requestGoRaw } = require('../../src/utils/goProxy');
const { logger } = require('../../src/utils/logger');

function createResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe('authController requestSMSCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    goUrl.mockReturnValue('http://go-api.local/api/sms/request');
  });

  it('normalizes html upstream errors without leaking debug metadata', async () => {
    requestGoRaw.mockRejectedValue({
      response: {
        status: 404,
        data: '<!DOCTYPE html><html><body>missing</body></html>',
      },
    });

    const req = { body: { phone: '13800000000' }, headers: { 'x-request-id': 'req-sms-404' } };
    const res = createResponse();
    const next = jest.fn();

    await requestSMSCode(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      request_id: 'req-sms-404',
      code: 'NOT_FOUND',
      message: 'Go 后端路由不存在，请检查路由配置',
      data: {},
      success: false,
      error: 'Go 后端路由不存在，请检查路由配置',
      statusCode: 404,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns upstream unavailable envelope when go service is down', async () => {
    requestGoRaw.mockRejectedValue({
      code: 'ECONNREFUSED',
      message: 'connect ECONNREFUSED',
    });

    const req = { body: { phone: '13800000000' }, headers: { 'x-request-id': 'req-sms-503' } };
    const res = createResponse();
    const next = jest.fn();

    await requestSMSCode(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      request_id: 'req-sms-503',
      code: 'UPSTREAM_UNAVAILABLE',
      message: 'Go 后端服务未启动，请检查 Go 后端服务状态',
      data: {},
      success: false,
      error: 'Go 后端服务未启动，请检查 Go 后端服务状态',
      statusCode: 503,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns timeout envelope without debug payload', async () => {
    requestGoRaw.mockRejectedValue({
      code: 'ETIMEDOUT',
      message: 'timeout',
    });

    const req = { body: { phone: '13800000000' }, headers: { 'x-request-id': 'req-sms-504' } };
    const res = createResponse();
    const next = jest.fn();

    await requestSMSCode(req, res, next);

    expect(res.status).toHaveBeenCalledWith(504);
    expect(res.json).toHaveBeenCalledWith({
      request_id: 'req-sms-504',
      code: 'UPSTREAM_TIMEOUT',
      message: '请求 Go 后端超时，请检查 Go 后端服务状态',
      data: {},
      success: false,
      error: '请求 Go 后端超时，请检查 Go 后端服务状态',
      statusCode: 504,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes unexpected errors to next after logging', async () => {
    const error = { code: 'EUNKNOWN', message: 'boom' };
    requestGoRaw.mockRejectedValue(error);

    const req = { body: { phone: '13800000000' }, headers: { 'x-request-id': 'req-sms-500' } };
    const res = createResponse();
    const next = jest.fn();

    await requestSMSCode(req, res, next);

    expect(logger.error).toHaveBeenCalledWith('Request SMS code unexpected error:', {
      code: 'EUNKNOWN',
      message: 'boom',
      url: 'http://go-api.local/api/sms/request',
    });
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
