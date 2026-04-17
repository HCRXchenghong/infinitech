const crypto = require("crypto");

const { requireRequestAuth } = require("../../src/middleware/requireRequestAuth");

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signToken(payload, secret = process.env.JWT_SECRET || process.env.ADMIN_TOKEN_SECRET) {
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

function createResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe("requireRequestAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects missing authorization headers", () => {
    const req = { headers: {} };
    const res = createResponse();
    const next = jest.fn();

    requireRequestAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "未授权，请先登录",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects invalid token signatures", () => {
    const req = { headers: { authorization: "Bearer invalid.token.value" } };
    const res = createResponse();
    const next = jest.fn();

    requireRequestAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects refresh tokens on protected upload routes", () => {
    const token = signToken({
      principal_type: "user",
      principal_id: "25072401000008",
      principal_legacy_id: 8,
      role: "user",
      token_kind: "refresh",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createResponse();
    const next = jest.fn();

    requireRequestAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("accepts signed access tokens and exposes normalized auth identity", () => {
    const token = signToken({
      principal_type: "merchant",
      principal_id: "merchant_uid_18",
      principal_legacy_id: 18,
      role: "merchant",
      token_kind: "access",
      session_id: "merchant_session_1",
      name: "商户A",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createResponse();
    const next = jest.fn();

    requireRequestAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.authIdentity).toMatchObject({
      id: "merchant_uid_18",
      principalType: "merchant",
      tokenKind: "access",
      sessionId: "merchant_session_1",
    });
    expect(req.authIdentity?.verification?.valid).toBe(true);
  });
});
