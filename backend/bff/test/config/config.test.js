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
    delete process.env.TOKEN_API_SECRET;
    process.env.JWT_SECRET = "test-secret-key-for-jest-1234567890";
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

  test("production requires explicit socket secret", () => {
    process.env.NODE_ENV = "production";
    process.env.BFF_CORS_ORIGINS = "https://admin.example.com";

    expect(() => loadConfig()).toThrow(/SOCKET_SERVER_API_SECRET|TOKEN_API_SECRET/);
  });

  test("production requires explicit cors origins", () => {
    process.env.NODE_ENV = "production";
    process.env.SOCKET_SERVER_API_SECRET = "socket-secret";

    expect(() => loadConfig()).toThrow(/BFF_CORS_ORIGINS|ADMIN_WEB_BASE_URL|SITE_WEB_BASE_URL/);
  });

  test("production accepts explicit cors origins and socket secret", () => {
    process.env.NODE_ENV = "production";
    process.env.SOCKET_SERVER_API_SECRET = "socket-secret";
    process.env.BFF_CORS_ORIGINS = "https://admin.example.com,https://ops.example.com";

    const config = loadConfig();
    expect(config.productionLike).toBe(true);
    expect(config.corsOrigins).toEqual([
      "https://admin.example.com",
      "https://ops.example.com",
    ]);
  });
});
