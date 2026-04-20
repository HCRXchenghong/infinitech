const crypto = require("crypto");

const {
  extractVerifiedAdminIdentity,
  parseOperatorFromAuthHeader,
} = require("../../src/utils/authIdentity");

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signToken(payload, secret = process.env.ADMIN_TOKEN_SECRET) {
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

describe("authIdentity unified claims parsing", () => {
  test("extractVerifiedAdminIdentity prefers unified admin claims", () => {
    const payload = {
      phone: "13800138000",
      userId: 7,
      id: "25072401000007",
      sub: "25072401000007",
      adminId: "25072401000007",
      name: "Security Admin",
      type: "super_admin",
      principal_type: "admin",
      principal_id: "25072401000007",
      principal_legacy_id: 7,
      role: "super_admin",
      session_id: "admin_session_1",
      token_kind: "access",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = signToken(payload);
    const identity = extractVerifiedAdminIdentity(
      { headers: { authorization: `Bearer ${token}` } },
      { normalizeType: true }
    );

    expect(identity).toMatchObject({
      id: "25072401000007",
      legacyId: "7",
      name: "Security Admin",
      type: "super_admin",
      principalType: "admin",
      sessionId: "admin_session_1",
    });
    expect(identity.verification?.valid).toBe(true);
  });

  test("parseOperatorFromAuthHeader uses unified principal id", () => {
    const token = signToken({
      phone: "13800138001",
      userId: 18,
      principal_type: "admin",
      principal_id: "25072401000018",
      principal_legacy_id: 18,
      role: "admin",
      name: "Ops Admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const operator = parseOperatorFromAuthHeader(`Bearer ${token}`);
    expect(operator).toEqual({
      operatorId: "25072401000018",
      operatorName: "Ops Admin",
    });
  });

  test("extractVerifiedAdminIdentity rejects tokens signed with the business jwt secret", () => {
    const token = signToken(
      {
        principal_type: "admin",
        principal_id: "25072401000021",
        principal_legacy_id: 21,
        role: "super_admin",
        name: "Separated Secret Admin",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET,
    );

    const identity = extractVerifiedAdminIdentity(
      { headers: { authorization: `Bearer ${token}` } },
      { normalizeType: true }
    );

    expect(identity?.verification?.valid).toBe(false);
    expect(identity?.verification?.reason).toBe("signature_mismatch");
  });
});
