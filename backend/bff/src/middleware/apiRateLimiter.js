const { createClient } = require("redis");

function createFixedWindowLimiter(windowMs, maxRequests) {
  const records = new Map();
  let lastCleanupAt = Date.now();

  return {
    allow(key) {
      const now = Date.now();
      if (now - lastCleanupAt >= windowMs * 2) {
        for (const [recordKey, record] of records.entries()) {
          if (now - record.windowStart >= windowMs * 2) {
            records.delete(recordKey);
          }
        }
        lastCleanupAt = now;
      }

      const existing = records.get(key);
      if (!existing || now - existing.windowStart >= windowMs) {
        records.set(key, { windowStart: now, count: 1 });
        return { allowed: true, retryAfterMs: 0 };
      }

      if (existing.count >= maxRequests) {
        return {
          allowed: false,
          retryAfterMs: Math.max(windowMs - (now - existing.windowStart), 0),
        };
      }

      existing.count += 1;
      records.set(key, existing);
      return { allowed: true, retryAfterMs: 0 };
    },
  };
}

function getClientIdentifier(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || String(req.ip || req.socket?.remoteAddress || "unknown").trim() || "unknown";
}

function sendRateLimitResponse(res, retryAfterMs) {
  res.set("Retry-After", String(Math.max(1, Math.ceil(retryAfterMs / 1000))));
  res.status(429).json({
    success: false,
    error: "请求过于频繁，请稍后再试",
  });
}

function createRedisRateLimiter(options) {
  const {
    windowMs,
    max,
    prefix,
    enabled,
    redisConfig,
    logger,
    skip = () => false,
  } = options;

  const fallbackLimiter = createFixedWindowLimiter(windowMs, max);
  let redisClient = null;
  let redisConnectionAttempt = null;
  let redisDisabledUntil = 0;

  async function connectRedis() {
    if (!enabled || !redisConfig?.enabled) {
      return null;
    }
    if (redisClient?.isOpen) {
      return redisClient;
    }
    if (redisConnectionAttempt) {
      return redisConnectionAttempt;
    }
    if (Date.now() < redisDisabledUntil) {
      return null;
    }

    const client = createClient({
      socket: {
        host: redisConfig.host,
        port: Number(redisConfig.port || 2550),
        connectTimeout: Number(options.redisConnectTimeoutMs || 1000),
        reconnectStrategy: false,
      },
      password: redisConfig.password || undefined,
      database: Number(redisConfig.db || 0),
    });

    client.on("error", (err) => {
      logger.warn("BFF redis rate limit client error", { message: err.message });
    });

    redisConnectionAttempt = client.connect()
      .then(() => {
        redisClient = client;
        redisDisabledUntil = 0;
        return redisClient;
      })
      .catch((err) => {
        redisDisabledUntil = Date.now() + 30_000;
        logger.warn("BFF redis rate limiter falling back to in-memory limiter", {
          message: err.message,
        });
        try {
          client.disconnect();
        } catch (_err) {
          // ignore cleanup errors
        }
        return null;
      })
      .finally(() => {
        redisConnectionAttempt = null;
      });

    return redisConnectionAttempt;
  }

  return async function apiRateLimiter(req, res, next) {
    if (skip(req)) {
      next();
      return;
    }

    const clientKey = getClientIdentifier(req);
    const now = Date.now();
    const localDecision = () => fallbackLimiter.allow(clientKey);

    try {
      const client = await connectRedis();
      if (!client) {
        const { allowed, retryAfterMs } = localDecision();
        if (!allowed) {
          sendRateLimitResponse(res, retryAfterMs);
          return;
        }
        next();
        return;
      }

      const bucket = Math.floor(now / windowMs);
      const redisKey = `${prefix}:${bucket}:${clientKey}`;
      const count = await client.incr(redisKey);
      if (count === 1) {
        await client.pExpire(redisKey, windowMs + 1000);
      }
      if (count > max) {
        const ttl = await client.pTTL(redisKey);
        sendRateLimitResponse(res, ttl > 0 ? ttl : windowMs);
        return;
      }

      next();
    } catch (err) {
      logger.warn("BFF redis rate limit check failed, falling back to local limiter", {
        message: err.message,
      });
      const { allowed, retryAfterMs } = localDecision();
      if (!allowed) {
        sendRateLimitResponse(res, retryAfterMs);
        return;
      }
      next();
    }
  };
}

module.exports = { createRedisRateLimiter };
