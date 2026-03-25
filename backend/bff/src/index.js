/**
 * BFF service entry
 * Port: 25500
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(createRequestAuditMiddleware({ logger, parseOperatorFromAuthHeader }));
app.use(createInviteRuntimeGuard({ logger }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "bff", timestamp: new Date().toISOString() });
});

app.use("/uploads", createUploadsProxy({ goApiUrl: config.goApiUrl, logger }));
app.use("/api", routes);
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
