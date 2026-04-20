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
  const originalFinancialVerifyAccount = process.env.FINANCIAL_LOG_VERIFY_ACCOUNT;
  const originalFinancialVerifyPassword = process.env.FINANCIAL_LOG_VERIFY_PASSWORD;
  const originalSystemLogVerifyAccount = process.env.SYSTEM_LOG_DELETE_ACCOUNT;
  const originalSystemLogVerifyPassword = process.env.SYSTEM_LOG_DELETE_PASSWORD;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FINANCIAL_LOG_VERIFY_ACCOUNT = "ops-admin";
    process.env.FINANCIAL_LOG_VERIFY_PASSWORD = "secure-pass";
    delete process.env.SYSTEM_LOG_DELETE_ACCOUNT;
    delete process.env.SYSTEM_LOG_DELETE_PASSWORD;
  });

  afterAll(() => {
    if (originalFinancialVerifyAccount === undefined) {
      delete process.env.FINANCIAL_LOG_VERIFY_ACCOUNT;
    } else {
      process.env.FINANCIAL_LOG_VERIFY_ACCOUNT = originalFinancialVerifyAccount;
    }
    if (originalFinancialVerifyPassword === undefined) {
      delete process.env.FINANCIAL_LOG_VERIFY_PASSWORD;
    } else {
      process.env.FINANCIAL_LOG_VERIFY_PASSWORD = originalFinancialVerifyPassword;
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

  test("deleteTransactionLog requires dedicated financial verification credentials", async () => {
    delete process.env.FINANCIAL_LOG_VERIFY_ACCOUNT;
    delete process.env.FINANCIAL_LOG_VERIFY_PASSWORD;
    process.env.SYSTEM_LOG_DELETE_ACCOUNT = "system-ops";
    process.env.SYSTEM_LOG_DELETE_PASSWORD = "system-pass";

    const req = {
      body: {
        recordId: "txn-2",
        verifyAccount: "system-ops",
        verifyPassword: "system-pass",
      },
      operator: {},
      ip: "127.0.0.1",
    };
    const res = createResponse();
    const next = jest.fn();

    await deleteTransactionLog(req, res, next);

    expect(verifyCriticalCredential).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "UPSTREAM_UNAVAILABLE",
        message: "财务日志敏感操作未配置二次校验口令，请联系管理员",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
