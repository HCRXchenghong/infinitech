/**
 * BFF service entry
 * Port: 25500
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { createServer } = require("http");
const os = require("os");
require("dotenv").config();

const config = require("./config");
const routes = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");
const { logger } = require("./utils/logger");
const { parseOperatorFromAuthHeader } = require("./utils/authIdentity");
const { createRequestAuditMiddleware } = require("./middleware/requestAudit");
const { createInviteRuntimeGuard } = require("./middleware/inviteRuntimeGuard");
const { createUploadsProxy } = require("./middleware/uploadsProxy");

const app = express();
const httpServer = createServer(app);
httpServer.requestTimeout = config.http.requestTimeoutMs;
httpServer.headersTimeout = config.http.headersTimeoutMs;
httpServer.keepAliveTimeout = config.http.keepAliveTimeoutMs;

const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip(req) {
    return req.path === "/health" || req.path === "/api/health";
  },
  message: {
    success: false,
    error: "请求过于频繁，请稍后再试",
  },
});

function resolveLanIPv4() {
  const interfaces = os.networkInterfaces() || {};
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface || []) {
      if (addr && addr.family === "IPv4" && !addr.internal) {
        return addr.address;
      }
    }
  }
  return "127.0.0.1";
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (config.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    logger.warn("Blocked BFF CORS origin", { origin });
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};

app.disable("x-powered-by");
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.set("trust proxy", 1);
app.use(express.json({ limit: config.bodyLimits.jsonBytes }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimits.urlencodedBytes }));

app.use(createRequestAuditMiddleware({ logger, parseOperatorFromAuthHeader }));
app.use(createInviteRuntimeGuard({ logger }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "bff", timestamp: new Date().toISOString() });
});

app.use("/uploads", createUploadsProxy({ goApiUrl: config.goApiUrl, logger }));
app.use("/api", apiRateLimiter, routes);
app.use(errorHandler);

const PORT = config.port || 25500;
httpServer.listen(PORT, "0.0.0.0", () => {
  const lanIp = resolveLanIPv4();
  logger.info(`BFF Server running on port ${PORT}`);
  logger.info(`Allowed CORS origins: ${config.corsOrigins.join(", ")}`);
  logger.info(`Server accessible at http://${lanIp}:${PORT}`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  httpServer.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

module.exports = { app };
