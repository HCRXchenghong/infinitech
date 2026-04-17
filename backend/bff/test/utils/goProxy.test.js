jest.mock('axios', () => jest.fn());
jest.mock('../../src/utils/forwardAuth', () => ({
  withForwardAuth: jest.fn((_req, options) => options),
}));

const axios = require('axios');
const { proxyPost } = require('../../src/utils/goProxy');

function createResponse() {
  const res = {
    setHeader: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe('goProxy response headers', () => {
  beforeEach(() => {
    axios.mockReset();
  });

  test('forwards no-store headers from Go responses', async () => {
    axios.mockResolvedValue({
      status: 200,
      data: { success: true, newPassword: 'TempPass123!' },
      headers: {
        'cache-control': 'no-store, no-cache, must-revalidate, private',
        pragma: 'no-cache',
        expires: '0',
        'x-content-type-options': 'nosniff',
      },
    });

    const req = {
      body: {},
      headers: {},
      connection: {},
      socket: {},
      ip: '127.0.0.1',
    };
    const res = createResponse();
    const next = jest.fn();

    await proxyPost(req, res, next, '/admins/1/reset-password', { data: {} });

    expect(res.setHeader).toHaveBeenCalledWith('cache-control', 'no-store, no-cache, must-revalidate, private');
    expect(res.setHeader).toHaveBeenCalledWith('pragma', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('expires', '0');
    expect(res.setHeader).toHaveBeenCalledWith('x-content-type-options', 'nosniff');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, newPassword: 'TempPass123!' });
    expect(next).not.toHaveBeenCalled();
  });

  test('normalizes resolved upstream 4xx responses when standard error mode is enabled', async () => {
    axios.mockResolvedValue({
      status: 409,
      data: {
        success: false,
        error: '支付配置冲突',
        lockedUntil: 123,
      },
      headers: {},
    });

    const req = {
      body: {},
      headers: { 'x-request-id': 'req-bff-409' },
      connection: {},
      socket: {},
      ip: '127.0.0.1',
    };
    const res = createResponse();
    const next = jest.fn();

    await proxyPost(req, res, next, '/admin/wallet/pay-center/config', {
      data: {},
      normalizeErrorResponse: true,
      defaultErrorMessage: '支付中心配置保存失败',
    });

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      request_id: 'req-bff-409',
      code: 'CONFLICT',
      message: '支付配置冲突',
      data: {},
      success: false,
      error: '支付配置冲突',
      lockedUntil: 123,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('normalizes fallback upstream errors into standardized envelope', async () => {
    axios.mockRejectedValue({
      message: 'socket upstream timeout',
      response: {
        status: 504,
        data: 'socket upstream timeout',
        headers: {},
      },
    });

    const req = {
      body: {},
      headers: { 'x-request-id': 'req-bff-001' },
      connection: {},
      socket: {},
      ip: '127.0.0.1',
    };
    const res = createResponse();
    const next = jest.fn();

    await proxyPost(req, res, next, '/rtc/calls', {
      data: {},
      normalizeErrorResponse: true,
    });

    expect(res.status).toHaveBeenCalledWith(504);
    expect(res.json).toHaveBeenCalledWith({
      request_id: 'req-bff-001',
      code: 'UPSTREAM_TIMEOUT',
      message: 'socket upstream timeout',
      data: {},
      success: false,
      error: 'socket upstream timeout',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
