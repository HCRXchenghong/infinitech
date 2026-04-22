import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { validateTrustedSocketApiConfig } from './trustedApi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DEV_GO_API_URL = 'http://127.0.0.1:1029';
const DEFAULT_DEV_ALLOWED_ORIGINS = [
  'http://127.0.0.1:8888',
  'http://localhost:8888',
  'http://127.0.0.1:1788',
  'http://localhost:1788',
  'http://127.0.0.1:1798',
  'http://localhost:1798'
];

function loadLocalEnvFile() {
  const envPath = join(__dirname, '.env');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const idx = line.indexOf('=');
    if (idx <= 0) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function normalizeOrigin(raw) {
  const value = String(raw || '').trim();
  if (!value) {
    return '';
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch (_error) {
    return '';
  }
}

function normalizeBaseUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) {
    return '';
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }

    const pathname = parsed.pathname === '/'
      ? ''
      : parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.host}${pathname}`;
  } catch (_error) {
    return '';
  }
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function resolveAllowedOrigins(env, productionLike) {
  const configuredOrigins = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);

  const allowedOrigins = uniqueValues([
    ...configuredOrigins,
    ...(productionLike ? [] : DEFAULT_DEV_ALLOWED_ORIGINS),
  ]);

  if (productionLike && allowedOrigins.length === 0) {
    throw new Error('ALLOWED_ORIGINS is required for socket-server in production-like environments');
  }

  return allowedOrigins;
}

function resolveGoApiUrl(env, productionLike) {
  const explicitUrl = normalizeBaseUrl(env.GO_API_URL || '');
  if (explicitUrl) {
    return explicitUrl;
  }

  if (productionLike) {
    throw new Error('GO_API_URL is required for socket-server in production-like environments');
  }

  return DEFAULT_DEV_GO_API_URL;
}

function resolveRedisConfig(env, productionLike) {
  const enabled = toBoolean(
    env.SOCKET_REDIS_ENABLED ?? (productionLike ? undefined : env.REDIS_ENABLED),
    true,
  );
  const host = String(
    env.SOCKET_REDIS_HOST || (productionLike ? '' : (env.REDIS_HOST || '127.0.0.1')),
  ).trim();

  if (productionLike && enabled && !host) {
    throw new Error(
      'SOCKET_REDIS_HOST is required when socket-server redis is enabled in production-like environments',
    );
  }

  return {
    enabled,
    host,
    port: toPositiveInt(
      env.SOCKET_REDIS_PORT || (productionLike ? undefined : env.REDIS_PORT),
      2550,
    ),
    password: String(env.SOCKET_REDIS_PASSWORD || '').trim(),
    database: toPositiveInt(
      env.SOCKET_REDIS_DB || (productionLike ? undefined : env.REDIS_DB),
      0,
    ),
    connectTimeout: toPositiveInt(env.SOCKET_REDIS_CONNECT_TIMEOUT_MS, 1000),
  };
}

export function resolveSocketRuntimeConfig(env = process.env) {
  if (env === process.env) {
    loadLocalEnvFile();
  }

  const trustedConfig = validateTrustedSocketApiConfig(env);

  return {
    ...trustedConfig,
    port: String(env.SOCKET_PORT || 9898).trim() || '9898',
    goApiUrl: resolveGoApiUrl(env, trustedConfig.productionLike),
    allowedOrigins: resolveAllowedOrigins(env, trustedConfig.productionLike),
    authTimeoutMs: toPositiveInt(env.SOCKET_AUTH_TIMEOUT_MS, 8000),
    http: {
      requestTimeoutMs: toPositiveInt(env.SOCKET_HTTP_REQUEST_TIMEOUT_MS, 30_000),
      headersTimeoutMs: toPositiveInt(env.SOCKET_HTTP_HEADERS_TIMEOUT_MS, 35_000),
      keepAliveTimeoutMs: toPositiveInt(env.SOCKET_HTTP_KEEP_ALIVE_TIMEOUT_MS, 5_000),
      jsonBodyLimitBytes: toPositiveInt(env.SOCKET_JSON_BODY_LIMIT_BYTES, 1024 * 1024),
      rateLimitWindowMs: toPositiveInt(env.SOCKET_HTTP_RATE_LIMIT_WINDOW_MS, 60_000),
      rateLimitMax: toPositiveInt(env.SOCKET_HTTP_RATE_LIMIT_MAX, 300),
      maxHttpBufferBytes: toPositiveInt(env.SOCKET_MAX_HTTP_BUFFER_BYTES, 4 * 1024 * 1024),
      slowRequestWarnMs: toPositiveInt(env.SOCKET_HTTP_SLOW_REQUEST_WARN_MS, 1_500),
    },
    socketIo: {
      pingTimeoutMs: toPositiveInt(env.SOCKET_PING_TIMEOUT_MS, 20_000),
      pingIntervalMs: toPositiveInt(env.SOCKET_PING_INTERVAL_MS, 25_000),
    },
    rtc: {
      ringTimeoutSeconds: toPositiveInt(env.SOCKET_RTC_RING_TIMEOUT_SECONDS, 35),
    },
    redis: resolveRedisConfig(env, trustedConfig.productionLike),
  };
}

export {
  DEFAULT_DEV_ALLOWED_ORIGINS,
  DEFAULT_DEV_GO_API_URL,
};
