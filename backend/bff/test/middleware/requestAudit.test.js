const crypto = require("crypto");

const { createRequestAuditMiddleware } = require("../../src/middleware/requestAudit");
const { extractVerifiedOperatorFromRequest } = require("../../src/utils/authIdentity");

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signToken(payload, secret) {
  const payloadPart = encodeBase64Url(JSON.stringify(payload));
  const signaturePart = crypto
    .createHmac("sha256", secret)
    .update(payloadPart)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `${payloadPart}.${signaturePart}`;
}

function createLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

function createReqRes({ path, method = "POST", token }) {
  let finishHandler = null;
  const req = {
    method,
    path,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    requestId: "req-audit-1",
    ip: "127.0.0.1",
    socket: {
      remoteAddress: "127.0.0.1",
    },
  };
  const res = {
    statusCode: 200,
    on: jest.fn((event, handler) => {
      if (event === "finish") {
        finishHandler = handler;
      }
    }),
  };

  return {
    req,
    res,
    emitFinish() {
      if (typeof finishHandler === "function") {
        finishHandler();
      }
    },
  };
}

describe("requestAudit verified operator attribution", () => {
  test("records verified admin operator identity on admin routes", () => {
    const logger = createLogger();
    const middleware = createRequestAuditMiddleware({
      logger,
      extractVerifiedOperatorFromRequest,
      slowRequestWarnMs: 999999,
    });
    const token = signToken(
      {
        principal_type: "admin",
        principal_id: "25072401000031",
        principal_legacy_id: 31,
        role: "super_admin",
        name: "Audit Admin",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.ADMIN_TOKEN_SECRET,
    );
    const { req, res, emitFinish } = createReqRes({
      path: "/api/admins/system-logs",
      token,
    });
    const next = jest.fn();

    middleware(req, res, next);
    emitFinish();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.operator).toEqual({
      operatorId: "25072401000031",
      operatorName: "Audit Admin",
    });
    expect(logger.info).toHaveBeenCalledWith(
      "POST /api/admins/system-logs",
      expect.objectContaining({
        operatorId: "25072401000031",
        operatorName: "Audit Admin",
      }),
    );
  });

  test("does not trust forged admin operator identity signed with the business secret", () => {
    const logger = createLogger();
    const middleware = createRequestAuditMiddleware({
      logger,
      extractVerifiedOperatorFromRequest,
      slowRequestWarnMs: 999999,
    });
    const token = signToken(
      {
        principal_type: "admin",
        principal_id: "25072401000032",
        principal_legacy_id: 32,
        role: "super_admin",
        name: "Forged Admin",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET,
    );
    const { req, res, emitFinish } = createReqRes({
      path: "/api/admins/system-logs",
      token,
    });

    middleware(req, res, jest.fn());
    emitFinish();

    expect(req.operator).toEqual({
      operatorId: "",
      operatorName: "",
    });
    expect(logger.info).toHaveBeenCalledWith(
      "POST /api/admins/system-logs",
      expect.objectContaining({
        operatorId: "",
        operatorName: "",
      }),
    );
  });

  test("records verified business operator identity on shared request routes", () => {
    const logger = createLogger();
    const middleware = createRequestAuditMiddleware({
      logger,
      extractVerifiedOperatorFromRequest,
      slowRequestWarnMs: 999999,
    });
    const token = signToken(
      {
        principal_type: "merchant",
        principal_id: "merchant_uid_42",
        principal_legacy_id: 42,
        role: "merchant",
        name: "Merchant Ops",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET,
    );
    const { req, res, emitFinish } = createReqRes({
      path: "/api/upload",
      token,
    });

    middleware(req, res, jest.fn());
    emitFinish();

    expect(req.operator).toEqual({
      operatorId: "merchant_uid_42",
      operatorName: "Merchant Ops",
    });
    expect(logger.info).toHaveBeenCalledWith(
      "POST /api/upload",
      expect.objectContaining({
        operatorId: "merchant_uid_42",
        operatorName: "Merchant Ops",
      }),
    );
  });
});
