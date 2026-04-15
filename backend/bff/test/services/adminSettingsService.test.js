jest.mock('../../src/services/adminSettings/proxyClient', () => ({
  normalizePublicAssetUrl: jest.fn((_req, url) => `https://cdn.example.com${url}`),
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
  getAppDownloadConfig,
  normalizeAssetUrlFields,
} = require('../../src/services/adminSettingsService');
const { requestSettingsRaw } = require('../../src/services/adminSettings/proxyClient');

describe('adminSettingsService asset normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
