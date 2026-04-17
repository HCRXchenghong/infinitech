jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
}));

jest.mock("../../src/services/systemLogs/parsing", () => ({
  loadEntries: jest.fn(),
}));

jest.mock("../../src/services/systemLogs/healthStatus", () => ({
  collectServiceStatus: jest.fn(),
}));

jest.mock("../../src/services/systemLogs/helpers", () => ({
  toPositiveInt: jest.fn((value, fallback) => Number(value || fallback)),
  parseDateToMs: jest.fn(() => null),
  normalizeSource: jest.fn((value) => String(value || "").trim()),
  getFilePathBySource: jest.fn(() => "/tmp/system.log"),
  summarizeAction: jest.fn(() => ({ total: 1 })),
  removeFirstMatchedLine: jest.fn(() => ({ removed: true })),
  clearLogFile: jest.fn(() => ({ exists: true, cleared: 0 })),
}));

jest.mock("../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const { loadEntries } = require("../../src/services/systemLogs/parsing");
const { collectServiceStatus } = require("../../src/services/systemLogs/healthStatus");
const { listSystemLogs } = require("../../src/services/systemLogsService");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("systemLogsService envelopes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("listSystemLogs returns standardized success envelope with legacy pagination fields", async () => {
    loadEntries.mockReturnValue([
      {
        timestampMs: 100,
        source: "bff",
        sourceLabel: "BFF",
        actionType: "login",
        actionLabel: "登录",
        operation: "登录",
        method: "POST",
        path: "/api/admin/login",
        operatorId: "admin-1",
        operatorName: "Ops",
        actorType: "admin",
        actionScene: "admin",
        actionSubject: "login",
        message: "ok",
        raw: "raw log",
      },
    ]);
    collectServiceStatus.mockResolvedValue({
      checkedAt: "2026-04-17T00:00:00.000Z",
      goApi: { ok: true },
    });

    const req = {
      query: {
        page: "1",
        limit: "20",
      },
      requestId: "req-log-1",
    };
    const res = createResponse();

    await listSystemLogs(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: "req-log-1",
        success: true,
        code: "OK",
        message: "系统日志加载成功",
        items: expect.any(Array),
        pagination: expect.objectContaining({
          page: 1,
          limit: 20,
          total: 1,
        }),
        data: expect.objectContaining({
          items: expect.any(Array),
          summary: { total: 1 },
          serviceStatus: expect.objectContaining({
            checkedAt: "2026-04-17T00:00:00.000Z",
          }),
        }),
      }),
    );
  });
});
