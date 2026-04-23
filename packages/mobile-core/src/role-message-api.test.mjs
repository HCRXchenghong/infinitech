import test from "node:test";
import assert from "node:assert/strict";

import {
  createRoleMessageApi,
  createRoleSMSApi,
} from "./role-message-api.js";

test("role sms api binds request and normalizes sms envelopes", async () => {
  const calls = [];
  const smsApi = createRoleSMSApi({
    defaultScene: "rider_login",
    request(options) {
      calls.push(options);
      return Promise.resolve({
        code: 0,
        data: {
          debugCode: "123456",
        },
      });
    },
  });

  const requestResult = await smsApi.requestSMSCode("13812345678");
  const verifyResult = await smsApi.verifySMSCodeCheck("13812345678", "rider_login", "123456");

  assert.equal(requestResult.data.debugCode, "123456");
  assert.equal(verifyResult.data.debugCode, "123456");
  assert.deepEqual(calls, [
    {
      url: "/api/request-sms-code",
      method: "POST",
      data: {
        phone: "13812345678",
        scene: "rider_login",
      },
      auth: false,
    },
    {
      url: "/api/verify-sms-code-check",
      method: "POST",
      data: {
        phone: "13812345678",
        scene: "rider_login",
        code: "123456",
      },
      auth: false,
    },
  ]);
});

test("role message api binds conversation endpoints and extracts list envelopes", async () => {
  const calls = [];
  const messageApi = createRoleMessageApi({
    request(options) {
      calls.push(options);
      if (options.url === "/api/messages/conversations") {
        return Promise.resolve({ data: { records: [{ id: "chat-1" }] } });
      }
      if (options.url === "/api/messages/room%201") {
        return Promise.resolve({ data: { messages: [{ id: "msg-1" }] } });
      }
      if (options.url === "/api/messages/conversations/upsert") {
        return Promise.resolve({ data: { chatId: "chat-1" } });
      }
      return Promise.resolve({ ok: true });
    },
  });

  assert.deepEqual(await messageApi.fetchConversations(), [{ id: "chat-1" }]);
  assert.deepEqual(await messageApi.fetchHistory("room 1"), [{ id: "msg-1" }]);
  assert.deepEqual(await messageApi.upsertConversation({ chatId: "chat-1" }), {
    chatId: "chat-1",
  });
  assert.deepEqual(await messageApi.markConversationRead("room 1"), { ok: true });

  assert.deepEqual(calls, [
    {
      url: "/api/messages/conversations",
      method: "GET",
    },
    {
      url: "/api/messages/room%201",
      method: "GET",
    },
    {
      url: "/api/messages/conversations/upsert",
      method: "POST",
      data: { chatId: "chat-1" },
    },
    {
      url: "/api/messages/conversations/room%201/read",
      method: "POST",
      data: {},
    },
  ]);
});
