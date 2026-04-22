const ORIGINAL_ENV = process.env;

function loadConfig() {
  jest.resetModules();
  return require("../../src/config");
}

describe("bff config hardening", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.BFF_CORS_ORIGINS;
    delete process.env.CORS_ORIGINS;
    delete process.env.ADMIN_WEB_BASE_URL;
    delete process.env.SITE_WEB_BASE_URL;
    delete process.env.SOCKET_SERVER_API_SECRET;
    process.env.JWT_SECRET = "test-request-secret-key-for-jest-1234567890";
    process.env.ADMIN_TOKEN_SECRET = "test-admin-secret-key-for-jest-1234567890";
    process.env.ADMIN_QR_LOGIN_SECRET = "test-admin-qr-login-secret-key-for-jest-1234567890";
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test("development keeps localhost cors defaults", () => {
    process.env.NODE_ENV = "development";

    const config = loadConfig();
    expect(config.corsOrigins).toContain("http://127.0.0.1:8888");
    expect(config.corsOrigins).toContain("http://localhost:1888");
  });

  test("admin debug mode settings stay disabled by default", () => {
    const config = loadConfig();

    expect(config.adminDebugModeSettingsEnabled).toBe(false);
  });

  test("admin debug mode settings require explicit opt in", () => {
    process.env.ENABLE_ADMIN_DEBUG_MODE_SETTINGS = "true";

    const config = loadConfig();
    expect(config.adminDebugModeSettingsEnabled).toBe(true);
  });

  test("production requires explicit socket secret", () => {
    process.env.NODE_ENV = "production";
    process.env.BFF_CORS_ORIGINS = "https://admin.example.com";
    process.env.GO_API_URL = "https://go.internal.example.com";
    process.env.SOCKET_SERVER_URL = "https://socket.internal.example.com";

    expect(() => loadConfig()).toThrow(/SOCKET_SERVER_API_SECRET/);
  });

  test("production requires explicit go api url", () => {
    process.env.NODE_ENV = "production";
    process.env.BFF_CORS_ORIGINS = "https://admin.example.com";
    process.env.SOCKET_SERVER_API_SECRET = "socket-secret";
    process.env.SOCKET_SERVER_URL = "https://socket.internal.example.com";

    expect(() => loadConfig()).toThrow(/GO_API_URL/);
  });

  test("production requires explicit socket server url", () => {
    process.env.NODE_ENV = "production";
    process.env.BFF_CORS_ORIGINS = "https://admin.example.com";
    process.env.SOCKET_SERVER_API_SECRET = "socket-secret";
    process.env.GO_API_URL = "https://go.internal.example.com";

    expect(() => loadConfig()).toThrow(/SOCKET_SERVER_URL/);
  });

  test("startup requires explicit business jwt secret", () => {
    delete process.env.JWT_SECRET;

    expect(() => loadConfig()).toThrow(/JWT_SECRET/);
  });

  test("startup requires explicit admin token secret", () => {
    delete process.env.ADMIN_TOKEN_SECRET;

    expect(() => loadConfig()).toThrow(/ADMIN_TOKEN_SECRET/);
  });

  test("startup requires explicit admin qr login secret", () => {
    delete process.env.ADMIN_QR_LOGIN_SECRET;

    expect(() => loadConfig()).toThrow(/ADMIN_QR_LOGIN_SECRET/);
  });

  test("production requires explicit cors origins", () => {
    process.env.NODE_ENV = "production";
    process.env.SOCKET_SERVER_API_SECRET = "socket-secret";
    process.env.GO_API_URL = "https://go.internal.example.com";
    process.env.SOCKET_SERVER_URL = "https://socket.internal.example.com";

    expect(() => loadConfig()).toThrow(/BFF_CORS_ORIGINS|ADMIN_WEB_BASE_URL|SITE_WEB_BASE_URL/);
  });

  test("production accepts explicit cors origins and socket secret", () => {
    process.env.NODE_ENV = "production";
    process.env.SOCKET_SERVER_API_SECRET = "socket-secret";
    process.env.BFF_CORS_ORIGINS = "https://admin.example.com,https://ops.example.com";
    process.env.GO_API_URL = "https://go.internal.example.com/";
    process.env.SOCKET_SERVER_URL = "https://socket.internal.example.com/";

    const config = loadConfig();
    expect(config.productionLike).toBe(true);
    expect(config.goApiUrl).toBe("https://go.internal.example.com");
    expect(config.socketServerUrl).toBe("https://socket.internal.example.com");
    expect(config.corsOrigins).toEqual([
      "https://admin.example.com",
      "https://ops.example.com",
    ]);
  });
});
