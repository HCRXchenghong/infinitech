process.env.FINANCIAL_LOG_VERIFY_ACCOUNT = "ops-admin";
process.env.FINANCIAL_LOG_VERIFY_PASSWORD = "secure-pass";

jest.mock("../../src/utils/goProxy", () => {
  const actual = jest.requireActual("../../src/utils/goProxy");
  return {
    ...actual,
    proxyGet: jest.fn(),
    requestGoRaw: jest.fn(),
  };
});

jest.mock("../../src/utils/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("../../src/utils/criticalActionVerify", () => ({
  verifyCriticalCredential: jest.fn(),
}));

const { verifyCriticalCredential } = require("../../src/utils/criticalActionVerify");
const { proxyGet, requestGoRaw } = require("../../src/utils/goProxy");
const {
  deleteTransactionLog,
  getOverview,
} = require("../../src/controllers/financialController");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("financialController envelopes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("deleteTransactionLog returns standardized invalid argument envelope when record id is missing", async () => {
    verifyCriticalCredential.mockReturnValue({
      ok: true,
      principal: "ops-admin",
    });

    const req = {
      body: {},
      operator: {},
      ip: "127.0.0.1",
    };
    const res = createResponse();
    const next = jest.fn();

    await deleteTransactionLog(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "INVALID_ARGUMENT",
        message: "缺少必要参数（recordId）",
        error: "缺少必要参数（recordId）",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("getOverview opts into normalized financial proxy envelopes", async () => {
    const req = { query: { date: "today" } };
    const res = createResponse();
    const next = jest.fn();

    await getOverview(req, res, next);

    expect(proxyGet).toHaveBeenCalledWith(
      req,
      res,
      next,
      "/admin/financial/overview",
      expect.objectContaining({
        normalizeErrorResponse: true,
        defaultErrorMessage: "财务概览加载失败",
      }),
    );
  });

  test("deleteTransactionLog normalizes resolved upstream conflicts", async () => {
    verifyCriticalCredential.mockReturnValue({
      ok: true,
      principal: "ops-admin",
    });
    requestGoRaw.mockResolvedValue({
      status: 409,
      data: {
        success: false,
        error: "日志记录删除冲突",
        lockedUntil: 123,
      },
    });

    const req = {
      body: {
        recordId: "txn-1",
        reason: "cleanup",
      },
      headers: {
        "x-request-id": "req-fin-409",
      },
      operator: {},
      ip: "127.0.0.1",
    };
    const res = createResponse();
    const next = jest.fn();

    await deleteTransactionLog(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      request_id: "req-fin-409",
      code: "CONFLICT",
      message: "日志记录删除冲突",
      data: {},
      success: false,
      error: "日志记录删除冲突",
      lockedUntil: 123,
    });
    expect(next).not.toHaveBeenCalled();
  });
});
