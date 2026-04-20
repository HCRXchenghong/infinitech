jest.mock('../../src/services/adminSettings/proxyClient', () => ({
  normalizePublicAssetUrl: jest.fn((_req, url) => `https://cdn.example.com${url}`),
  normalizeSettingsProxyPayload: jest.fn((_req, response) => response.data),
  handleProxyError: jest.fn(),
  requestSettingsRaw: jest.fn(),
  proxySettingsRequest: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../src/utils/criticalActionVerify', () => ({
  verifyCriticalCredential: jest.fn(),
}));

jest.mock('../../src/services/adminSettings/fileOps', () => ({
  safeUnlinkTempFile: jest.fn(),
  clearLogFile: jest.fn(() => ({ cleared: 0 })),
}));

const {
  clearAllData,
  getAppDownloadConfig,
  normalizeAssetUrlFields,
} = require('../../src/services/adminSettingsService');
const {
  normalizeSettingsProxyPayload,
  requestSettingsRaw,
} = require('../../src/services/adminSettings/proxyClient');
const { verifyCriticalCredential } = require('../../src/utils/criticalActionVerify');

describe('adminSettingsService asset normalization', () => {
  const originalClearAllVerifyAccount = process.env.CLEAR_ALL_DATA_VERIFY_ACCOUNT;
  const originalClearAllVerifyPassword = process.env.CLEAR_ALL_DATA_VERIFY_PASSWORD;
  const originalSystemLogVerifyAccount = process.env.SYSTEM_LOG_DELETE_ACCOUNT;
  const originalSystemLogVerifyPassword = process.env.SYSTEM_LOG_DELETE_PASSWORD;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLEAR_ALL_DATA_VERIFY_ACCOUNT = 'clear-all-ops';
    process.env.CLEAR_ALL_DATA_VERIFY_PASSWORD = 'clear-all-pass';
    delete process.env.SYSTEM_LOG_DELETE_ACCOUNT;
    delete process.env.SYSTEM_LOG_DELETE_PASSWORD;
  });

  afterAll(() => {
    if (originalClearAllVerifyAccount === undefined) {
      delete process.env.CLEAR_ALL_DATA_VERIFY_ACCOUNT;
    } else {
      process.env.CLEAR_ALL_DATA_VERIFY_ACCOUNT = originalClearAllVerifyAccount;
    }
    if (originalClearAllVerifyPassword === undefined) {
      delete process.env.CLEAR_ALL_DATA_VERIFY_PASSWORD;
    } else {
      process.env.CLEAR_ALL_DATA_VERIFY_PASSWORD = originalClearAllVerifyPassword;
    }
    if (originalSystemLogVerifyAccount === undefined) {
      delete process.env.SYSTEM_LOG_DELETE_ACCOUNT;
    } else {
      process.env.SYSTEM_LOG_DELETE_ACCOUNT = originalSystemLogVerifyAccount;
    }
    if (originalSystemLogVerifyPassword === undefined) {
      delete process.env.SYSTEM_LOG_DELETE_PASSWORD;
    } else {
      process.env.SYSTEM_LOG_DELETE_PASSWORD = originalSystemLogVerifyPassword;
    }
  });

  it('normalizes nested envelope asset urls for admin upload/download payloads', () => {
    expect(
      normalizeAssetUrlFields(
        {},
        {
          request_id: 'req-1',
          code: 'OK',
          message: 'loaded',
          imageUrl: '/uploads/banner.png',
          data: {
            ios_url: '/uploads/app.ipa',
            asset_url: '/uploads/banner.png',
            mini_program_qr_url: '/uploads/qr.png',
          },
        },
        ['imageUrl', 'ios_url', 'asset_url', 'mini_program_qr_url'],
      ),
    ).toEqual({
      request_id: 'req-1',
      code: 'OK',
      message: 'loaded',
      imageUrl: 'https://cdn.example.com/uploads/banner.png',
      data: {
        ios_url: 'https://cdn.example.com/uploads/app.ipa',
        asset_url: 'https://cdn.example.com/uploads/banner.png',
        mini_program_qr_url: 'https://cdn.example.com/uploads/qr.png',
      },
    });
  });

  it('normalizes enveloped app download config before returning to clients', async () => {
    requestSettingsRaw.mockResolvedValue({
      status: 200,
      data: {
        request_id: 'req-app',
        code: 'OK',
        message: 'APP 下载配置加载成功',
        data: {
          ios_url: '/uploads/packages/app.ipa',
          android_url: '/uploads/packages/app.apk',
          mini_program_qr_url: '/uploads/qr.png',
        },
      },
    });

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getAppDownloadConfig(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      request_id: 'req-app',
      code: 'OK',
      message: 'APP 下载配置加载成功',
      data: {
        ios_url: 'https://cdn.example.com/uploads/packages/app.ipa',
        android_url: 'https://cdn.example.com/uploads/packages/app.apk',
        mini_program_qr_url: 'https://cdn.example.com/uploads/qr.png',
      },
    });
  });

  it('normalizes resolved app download config errors before returning to clients', async () => {
    requestSettingsRaw.mockResolvedValue({
      status: 404,
      data: {
        success: false,
        error: '下载配置不存在',
        mini_program_qr_url: '/uploads/qr-missing.png',
      },
    });

    normalizeSettingsProxyPayload.mockImplementation((_req, response) => ({
      request_id: 'req-app-missing',
      code: 'NOT_FOUND',
      message: '下载配置不存在',
      data: {
        mini_program_qr_url: response.data.mini_program_qr_url,
      },
      success: false,
      error: '下载配置不存在',
    }));

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getAppDownloadConfig(req, res);

    expect(normalizeSettingsProxyPayload).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        status: 404,
        data: expect.objectContaining({
          success: false,
          error: '下载配置不存在',
        }),
      }),
      '获取 APP 下载配置失败',
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      request_id: 'req-app-missing',
      code: 'NOT_FOUND',
      message: '下载配置不存在',
      data: {
        mini_program_qr_url: 'https://cdn.example.com/uploads/qr-missing.png',
      },
      success: false,
      error: '下载配置不存在',
    });
  });

  it('clearAllData requires dedicated clear-all verification credentials', async () => {
    delete process.env.CLEAR_ALL_DATA_VERIFY_ACCOUNT;
    delete process.env.CLEAR_ALL_DATA_VERIFY_PASSWORD;
    process.env.SYSTEM_LOG_DELETE_ACCOUNT = 'system-ops';
    process.env.SYSTEM_LOG_DELETE_PASSWORD = 'system-pass';

    const req = {
      body: {
        verifyAccount: 'system-ops',
        verifyPassword: 'system-pass',
      },
      operator: {},
      ip: '127.0.0.1',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await clearAllData(req, res);

    expect(verifyCriticalCredential).not.toHaveBeenCalled();
    expect(requestSettingsRaw).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'UPSTREAM_UNAVAILABLE',
        message: '清空全量数据未配置二次校验口令，请联系管理员',
      }),
    );
  });
});
