import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSocketRuntimeConfig } from './runtimeConfig.js';

test('resolveSocketRuntimeConfig requires explicit go api url in production-like environments', () => {
  assert.throws(
    () => resolveSocketRuntimeConfig({
      NODE_ENV: 'production',
      SOCKET_SERVER_API_SECRET: 'socket-secret',
      ALLOWED_ORIGINS: 'https://admin.example.com',
    }),
    /GO_API_URL is required for socket-server in production-like environments/,
  );
});

test('resolveSocketRuntimeConfig requires dedicated socket redis host in production-like environments', () => {
  assert.throws(
    () => resolveSocketRuntimeConfig({
      NODE_ENV: 'production',
      SOCKET_SERVER_API_SECRET: 'socket-secret',
      ALLOWED_ORIGINS: 'https://admin.example.com',
      GO_API_URL: 'https://go.internal.example.com',
      REDIS_HOST: 'redis.shared.internal',
    }),
    /SOCKET_REDIS_HOST is required when socket-server redis is enabled in production-like environments/,
  );
});

test('resolveSocketRuntimeConfig accepts explicit production socket runtime config', () => {
  const config = resolveSocketRuntimeConfig({
    NODE_ENV: 'production',
    SOCKET_SERVER_API_SECRET: 'socket-secret',
    GO_API_URL: 'https://go.internal.example.com/',
    ALLOWED_ORIGINS: 'https://admin.example.com,https://ops.example.com',
    SOCKET_REDIS_ENABLED: 'true',
    SOCKET_REDIS_HOST: 'redis.socket.internal',
    SOCKET_REDIS_PORT: '6380',
    SOCKET_REDIS_PASSWORD: 'redis-secret',
    SOCKET_REDIS_DB: '2',
  });

  assert.equal(config.productionLike, true);
  assert.equal(config.goApiUrl, 'https://go.internal.example.com');
  assert.deepEqual(config.allowedOrigins, [
    'https://admin.example.com',
    'https://ops.example.com',
  ]);
  assert.deepEqual(config.redis, {
    enabled: true,
    host: 'redis.socket.internal',
    port: 6380,
    password: 'redis-secret',
    database: 2,
    connectTimeout: 1000,
  });
});
