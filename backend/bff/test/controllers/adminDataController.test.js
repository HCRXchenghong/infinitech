jest.mock('../../src/utils/goProxy', () => ({
  proxyGet: jest.fn(),
  proxyPost: jest.fn(),
  proxyPut: jest.fn(),
  proxyDelete: jest.fn(),
}));

const {
  exportData,
  importData,
  resolveDataActionPath,
} = require('../../src/controllers/adminDataController');
const { proxyGet, proxyPost } = require('../../src/utils/goProxy');

describe('adminDataController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
