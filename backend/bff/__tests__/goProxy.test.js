jest.mock("axios", () => jest.fn());

const axios = require("axios");
const { proxyDelete } = require("../src/utils/goProxy");

function createMockResponse() {
  return {
    status: jest.fn(function setStatus() {
      return this;
    }),
    json: jest.fn(function setJson() {
      return this;
    }),
  };
}

describe("goProxy.proxyDelete", () => {
  beforeEach(() => {
    axios.mockReset();
  });

  test("forwards query params and body by default", async () => {
    axios.mockResolvedValue({ status: 200, data: { ok: true } });

    const req = {
      query: { includeInactive: "1" },
      body: { force: true },
      headers: {},
    };
    const res = createMockResponse();
    const next = jest.fn();

    await proxyDelete(req, res, next, "/users/123");

    expect(axios).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "delete",
        params: { includeInactive: "1" },
        data: { force: true },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  test("does not send empty body for delete request", async () => {
    axios.mockResolvedValue({ status: 204, data: null });

    const req = {
      query: { hard: "1" },
      body: {},
      headers: {},
    };
    const res = createMockResponse();
    const next = jest.fn();

    await proxyDelete(req, res, next, "/users/123");

    const requestConfig = axios.mock.calls[0][0];
    expect(requestConfig.params).toEqual({ hard: "1" });
    expect(requestConfig).not.toHaveProperty("data");
    expect(next).not.toHaveBeenCalled();
  });
});
