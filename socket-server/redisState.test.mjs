import assert from 'node:assert/strict';
import test from 'node:test';

const REDIS_ENV_KEYS = [
  'NODE_ENV',
  'ENV',
  'GO_API_URL',
  'ALLOWED_ORIGINS',
  'SOCKET_SERVER_API_SECRET',
  'SOCKET_REDIS_ENABLED',
  'REDIS_ENABLED',
  'SOCKET_REDIS_HOST',
  'REDIS_HOST',
  'SOCKET_REDIS_PORT',
  'REDIS_PORT',
  'SOCKET_REDIS_PASSWORD',
  'REDIS_PASSWORD',
  'SOCKET_REDIS_DB',
  'REDIS_DB',
];

async function importRedisStateForTest(envOverrides) {
  const previous = new Map(REDIS_ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of REDIS_ENV_KEYS) {
    delete process.env[key];
  }
  Object.assign(process.env, {
    NODE_ENV: 'test',
  }, envOverrides);

  try {
    return await import(`./redisState.js?test=${Date.now()}-${Math.random()}`);
  } finally {
    for (const key of REDIS_ENV_KEYS) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test('redisState only treats SOCKET_REDIS_PASSWORD as socket redis secret', async () => {
  const genericOnly = await importRedisStateForTest({
    REDIS_PASSWORD: 'shared-redis-secret',
    SOCKET_REDIS_HOST: '127.0.0.1',
  });
  const genericOnlySnapshot = genericOnly.getRedisHealthSnapshot();
  assert.equal(genericOnlySnapshot.passwordConfigured, false);

  const dedicatedSecret = await importRedisStateForTest({
    SOCKET_REDIS_PASSWORD: 'socket-only-secret',
    SOCKET_REDIS_HOST: '127.0.0.1',
  });
  const dedicatedSecretSnapshot = dedicatedSecret.getRedisHealthSnapshot();
  assert.equal(dedicatedSecretSnapshot.passwordConfigured, true);
});
