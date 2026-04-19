jest.mock("axios", () => ({
  get: jest.fn(),
}));

jest.mock('../../src/utils/goProxy', () => ({
  proxyGet: jest.fn(),
  proxyPost: jest.fn(),
  proxyPut: jest.fn(),
  proxyDelete: jest.fn(),
  sendRejectedProxyError: jest.fn(),
  sendResolvedProxyResponse: jest.fn(),
}));

const {
  exportData,
  getRealtimeStats,
  importData,
  resolveDataActionPath,
} = require('../../src/controllers/adminDataController');
const axios = require("axios");
const {
  proxyGet,
  proxyPost,
  sendRejectedProxyError,
  sendResolvedProxyResponse,
} = require('../../src/utils/goProxy');
const config = require('../../src/config');

describe('adminDataController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    config.socketServerApiSecret = 'socket-secret';
    config.socketServerUrl = 'http://socket.local';
  });

  describe('resolveDataActionPath', () => {
    test.each([
      ['/users/export', 'export', '/users/export'],
      ['/riders/export', 'export', '/riders/export'],
      ['/orders/import', 'import', '/orders/import'],
      ['/merchants/import?mode=merge', 'import', '/merchants/import'],
    ])('maps %s to %s', (path, action, expected) => {
      expect(resolveDataActionPath({ path }, action)).toBe(expected);
    });

    it('throws for unsupported resources', () => {
      expect(() => resolveDataActionPath({ path: '/admins/export' }, 'export')).toThrow(
        'Unsupported admin data action path: /admins/export'
      );
    });
  });

  it('proxies export to the matching Go resource endpoint', async () => {
    const req = { path: '/users/export', query: { page: '1' } };
    const res = {};
    const next = jest.fn();

    await exportData(req, res, next);

    expect(proxyGet).toHaveBeenCalledWith(req, res, next, '/users/export', {
      params: { page: '1' },
    });
  });

  it('proxies import to the matching Go resource endpoint', async () => {
    const req = { path: '/orders/import', body: [{ id: '25072430000001' }] };
    const res = {};
    const next = jest.fn();

    await importData(req, res, next);

    expect(proxyPost).toHaveBeenCalledWith(req, res, next, '/orders/import');
  });

  it('proxies realtime stats through the trusted socket service channel', async () => {
    const req = {
      headers: {
        'x-request-id': 'req-realtime-stats',
      },
    };
    const res = {};
    const next = jest.fn();
    const upstreamResponse = {
      status: 200,
      data: {
        request_id: 'req-realtime-stats',
        code: 'OK',
        message: 'Socket server stats loaded successfully',
        data: {
          onlineUsers: 12,
        },
        success: true,
      },
    };
    axios.get.mockResolvedValue(upstreamResponse);

    await getRealtimeStats(req, res, next);

    expect(axios.get).toHaveBeenCalledWith('http://socket.local/api/stats', {
      timeout: 8000,
      validateStatus: expect.any(Function),
      headers: {
        'X-Socket-Server-Secret': 'socket-secret',
        'X-Request-ID': 'req-realtime-stats',
      },
    });
    expect(sendResolvedProxyResponse).toHaveBeenCalledWith(
      req,
      res,
      upstreamResponse,
      'failed to load socket realtime stats',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 503 when realtime stats proxy secret is missing', async () => {
    const req = {
      headers: {
        'x-request-id': 'req-realtime-stats-missing-secret',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    config.socketServerApiSecret = '';

    await getRealtimeStats(req, res, next);

    expect(axios.get).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: 'req-realtime-stats-missing-secret',
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'socket realtime stats proxy is not configured',
        success: false,
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('normalizes rejected realtime stats proxy responses', async () => {
    const req = {
      headers: {
        'x-request-id': 'req-realtime-stats-rejected',
      },
    };
    const res = {};
    const next = jest.fn();
    const error = {
      message: 'socket stats forbidden',
      response: {
        status: 403,
        data: {
          message: 'forbidden',
        },
      },
    };
    axios.get.mockRejectedValue(error);

    await getRealtimeStats(req, res, next);

    expect(sendRejectedProxyError).toHaveBeenCalledWith(
      req,
      res,
      error,
      'socket stats forbidden',
    );
    expect(next).not.toHaveBeenCalled();
  });
});
