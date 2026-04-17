jest.mock("../../src/utils/goProxy", () => {
  const actual = jest.requireActual("../../src/utils/goProxy");
  return {
    ...actual,
    proxyGet: jest.fn(),
    proxyPost: jest.fn(),
    requestGoRaw: jest.fn(),
  };
});

jest.mock("../../src/utils/authIdentity", () => ({
  extractVerifiedAdminIdentity: jest.fn(() => null),
}));

jest.mock("../../src/services/systemLogs/healthStatus", () => ({
  collectServiceStatus: jest.fn(),
}));

const { requestGoRaw } = require("../../src/utils/goProxy");
const { proxyGet } = require("../../src/utils/goProxy");
const { collectServiceStatus } = require("../../src/services/systemLogs/healthStatus");
const {
  getPayCenterHealth,
  listOperations,
} = require("../../src/controllers/adminWalletController");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("adminWalletController envelopes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getPayCenterHealth returns standardized success envelope with legacy root fields", async () => {
    requestGoRaw.mockResolvedValue({
      status: 200,
      data: {
        gateway_summary: { wxpay: true },
        pay_mode: { mode: "auto" },
      },
    });
    collectServiceStatus.mockResolvedValue({
      checkedAt: "2026-04-17T00:00:00.000Z",
      goApi: { ok: true },
    });

    const req = {
      headers: {
        "x-admin-id": "admin-1",
        "x-admin-name": "Ops",
      },
      query: {},
      requestId: "req-wallet-1",
    };
    const res = createResponse();
    const next = jest.fn();

    await getPayCenterHealth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: "req-wallet-1",
        success: true,
        code: "OK",
        message: "支付中心健康状态加载成功",
        checkedAt: "2026-04-17T00:00:00.000Z",
        gateway_summary: { wxpay: true },
        pay_mode: { mode: "auto" },
        data: expect.objectContaining({
          serviceStatus: expect.objectContaining({
            goApi: { ok: true },
          }),
        }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("listOperations opts into normalized proxy envelopes and forwarded admin headers", async () => {
    const req = {
      headers: {
        "x-admin-id": "admin-9",
        "x-admin-name": "FinanceOps",
      },
      query: { page: "2" },
    };
    const res = createResponse();
    const next = jest.fn();

    await listOperations(req, res, next);

    expect(proxyGet).toHaveBeenCalledWith(
      req,
      res,
      next,
      "/admin/wallet/operations",
      expect.objectContaining({
        normalizeErrorResponse: true,
        defaultErrorMessage: "钱包操作记录加载失败",
        headers: {
          "X-Admin-ID": "admin-9",
          "X-Admin-Name": "FinanceOps",
        },
      }),
    );
  });
});
