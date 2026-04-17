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
const { deleteTransactionLog } = require("../../src/controllers/financialController");

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
});
