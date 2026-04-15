const {
  INVITE_RUNTIME_PORT,
  SITE_RUNTIME_PORT,
  isPublicRuntimeAllowedApiRequest,
} = require("../../src/utils/requestMeta");

describe("requestMeta public runtime allowlist", () => {
  it("allows scoped public upload routes only", () => {
    expect(
      isPublicRuntimeAllowedApiRequest(
        SITE_RUNTIME_PORT,
        "POST",
        "/api/official-site/exposures/assets",
      ),
    ).toBe(true);

    expect(
      isPublicRuntimeAllowedApiRequest(
        INVITE_RUNTIME_PORT,
        "POST",
        "/api/onboarding/invites/token-123/upload",
      ),
    ).toBe(true);
  });

  it("blocks legacy anonymous generic upload route", () => {
    expect(
      isPublicRuntimeAllowedApiRequest(
        SITE_RUNTIME_PORT,
        "POST",
        "/api/upload",
      ),
    ).toBe(false);

    expect(
      isPublicRuntimeAllowedApiRequest(
        INVITE_RUNTIME_PORT,
        "POST",
        "/api/upload",
      ),
    ).toBe(false);
  });
});
