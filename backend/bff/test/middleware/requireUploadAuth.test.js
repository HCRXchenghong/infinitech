const crypto = require("crypto");

const { requireUploadAuth } = require("../../src/middleware/requireUploadAuth");

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signToken(payload, secret = process.env.JWT_SECRET) {
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

describe("requireUploadAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("accepts signed request access tokens on unified upload routes", () => {
    const token = signToken({
      principal_type: "merchant",
      principal_id: "merchant_uid_18",
      principal_legacy_id: 18,
      role: "merchant",
      token_kind: "access",
      session_id: "merchant_upload_session",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createResponse();
    const next = jest.fn();

    requireUploadAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.authIdentity).toMatchObject({
      principalType: "merchant",
      tokenKind: "access",
      sessionId: "merchant_upload_session",
    });
    expect(req.adminAuth).toBeUndefined();
  });

  test("accepts admin tokens on unified upload routes", () => {
    const token = signToken(
      {
        principal_type: "admin",
        principal_id: "25072401000007",
        principal_legacy_id: 7,
        role: "admin",
        token_kind: "access",
        session_id: "admin_upload_session",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.ADMIN_TOKEN_SECRET,
    );

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createResponse();
    const next = jest.fn();

    requireUploadAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.adminAuth).toMatchObject({
      principalType: "admin",
      type: "admin",
      sessionId: "admin_upload_session",
    });
    expect(req.authIdentity).toMatchObject({
      principalType: "admin",
    });
  });

  test("rejects refresh-only request tokens when no admin fallback exists", () => {
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

    requireUploadAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("blocks bootstrap-pending admin identities on unified upload routes", () => {
    const token = signToken(
      {
        principal_type: "admin",
        principal_id: "25072401000007",
        principal_legacy_id: 7,
        role: "admin",
        token_kind: "access",
        bootstrapPending: true,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.ADMIN_TOKEN_SECRET,
    );

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createResponse();
    const next = jest.fn();

    requireUploadAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "ADMIN_BOOTSTRAP_REQUIRED",
        message: "请先完成首次管理员初始化",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
