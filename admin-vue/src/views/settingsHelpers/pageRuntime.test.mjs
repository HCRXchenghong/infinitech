import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveSettledTaskGroupError,
  runSettledTaskGroup,
} from './pageRuntimeCore.js';

test('resolveSettledTaskGroupError returns partial failure copy by default', () => {
  assert.equal(
    resolveSettledTaskGroupError([
      { status: 'fulfilled', value: 'ok' },
      { status: 'rejected', reason: new Error('weather failed') },
    ]),
    '部分系统配置加载失败，请稍后重试',
  );
});

test('resolveSettledTaskGroupError returns first rejected message when requested', () => {
  assert.equal(
    resolveSettledTaskGroupError(
      [
        { status: 'fulfilled', value: 'ok' },
        { status: 'rejected', reason: new Error('天气配置加载失败') },
      ],
      {
        mode: 'first_rejected',
        fallbackMessages: ['加载短信配置失败，请稍后重试', '加载天气配置失败，请稍后重试'],
        formatErrorMessage: (reason, fallback) => reason?.message || fallback,
      },
    ),
    '天气配置加载失败',
  );
});

test('runSettledTaskGroup resolves tasks and reports first rejection with fallback', async () => {
  const outcome = await runSettledTaskGroup(
    [
      async () => 'sms',
      async () => {
        throw new Error('');
      },
    ],
    {
      mode: 'first_rejected',
      fallbackMessages: ['加载短信配置失败，请稍后重试', '加载天气配置失败，请稍后重试'],
    },
  );

  assert.equal(outcome.results.length, 2);
  assert.equal(outcome.results[0].status, 'fulfilled');
  assert.equal(outcome.results[1].status, 'rejected');
  assert.equal(outcome.errorMessage, '加载天气配置失败，请稍后重试');
});
