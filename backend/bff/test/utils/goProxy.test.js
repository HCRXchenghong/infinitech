jest.mock('axios', () => jest.fn());
jest.mock('../../src/utils/forwardAuth', () => ({
  withForwardAuth: jest.fn((_req, options) => options),
}));

const axios = require('axios');
const {
  applyPassthroughResponseHeaders,
  buildRejectedProxyErrorPayload,
  buildResolvedProxyPayload,
  proxyPost,
  sendBufferProxyResponse,
  sendStreamProxyResponse,
} = require('../../src/utils/goProxy');

function createResponse() {
  const res = {
    setHeader: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    end: jest.fn(),
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
      data: {
        success: true,
        temporaryCredential: {
          temporaryPassword: 'TempPass123!',
          deliveryMode: 'operator_receipt',
        },
      },
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
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      temporaryCredential: {
        temporaryPassword: 'TempPass123!',
        deliveryMode: 'operator_receipt',
      },
    });
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

describe('goProxy normalized proxy payload helpers', () => {
  test('buildResolvedProxyPayload preserves successful upstream payloads', () => {
    const req = { headers: { 'x-request-id': 'req-success-1' } };

    expect(
      buildResolvedProxyPayload(
        req,
        {
          status: 200,
          data: { ok: true, nested: { count: 1 } },
        },
        'fallback',
      ),
    ).toEqual({ ok: true, nested: { count: 1 } });
  });

  test('buildRejectedProxyErrorPayload supports controller-specific error resolvers', () => {
    const req = { headers: { 'x-request-id': 'req-custom-1' } };
    const error = {
      message: 'custom failure',
      response: {
        status: 404,
        data: '<!DOCTYPE html><html></html>',
      },
    };

    expect(
      buildRejectedProxyErrorPayload(req, error, 'fallback', {
        resolveErrorPayload(currentReq, status, payload) {
          return {
            request_id: currentReq.headers['x-request-id'],
            code: status === 404 ? 'NOT_FOUND' : 'UNKNOWN',
            message: typeof payload === 'string' ? 'html not found' : 'fallback',
            data: {},
            success: false,
            error: 'html not found',
          };
        },
      }),
    ).toEqual({
      request_id: 'req-custom-1',
      code: 'NOT_FOUND',
      message: 'html not found',
      data: {},
      success: false,
      error: 'html not found',
    });
  });
});

describe('goProxy passthrough helpers', () => {
  test('applyPassthroughResponseHeaders excludes hop-by-hop headers', () => {
    const res = createResponse();

    applyPassthroughResponseHeaders(res, {
      'content-type': 'image/png',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });

    expect(res.setHeader).toHaveBeenCalledWith('content-type', 'image/png');
    expect(res.setHeader).toHaveBeenCalledWith('cache-control', 'no-store');
    expect(res.setHeader).not.toHaveBeenCalledWith('connection', 'keep-alive');
  });

  test('sendBufferProxyResponse forwards passthrough headers and body', () => {
    const res = createResponse();
    const body = Buffer.from('captcha');

    sendBufferProxyResponse(res, {
      status: 200,
      data: body,
      headers: {
        'content-type': 'image/png',
        pragma: 'no-cache',
        connection: 'keep-alive',
      },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledWith('content-type', 'image/png');
    expect(res.setHeader).toHaveBeenCalledWith('pragma', 'no-cache');
    expect(res.setHeader).not.toHaveBeenCalledWith('connection', 'keep-alive');
    expect(res.send).toHaveBeenCalledWith(body);
  });

  test('sendStreamProxyResponse drains head requests without piping', () => {
    const res = createResponse();
    const stream = {
      pipe: jest.fn(),
      destroy: jest.fn(),
    };

    sendStreamProxyResponse(
      { method: 'HEAD' },
      res,
      {
        status: 206,
        data: stream,
        headers: {
          'content-type': 'image/jpeg',
          'content-length': '10',
          'transfer-encoding': 'chunked',
        },
      },
    );

    expect(res.status).toHaveBeenCalledWith(206);
    expect(res.setHeader).toHaveBeenCalledWith('content-type', 'image/jpeg');
    expect(res.setHeader).toHaveBeenCalledWith('content-length', '10');
    expect(res.setHeader).not.toHaveBeenCalledWith('transfer-encoding', 'chunked');
    expect(stream.destroy).toHaveBeenCalledTimes(1);
    expect(stream.pipe).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledTimes(1);
  });
});
