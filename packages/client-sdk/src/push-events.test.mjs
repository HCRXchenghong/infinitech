import test from "node:test";
import assert from "node:assert/strict";

import {
  createPushEventBridgeController,
  extractPushEventEnvelope,
  resetPushEventBridgeForTest,
  startPushEventBridge,
} from "./push-events.js";

test("extractPushEventEnvelope normalizes nested payloads and routes", () => {
  const envelope = extractPushEventEnvelope(JSON.stringify({
    messageId: "msg_1",
    payload: JSON.stringify({
      notification_id: "notice_1",
      route: "pages/message/detail?id=1",
      title: "系统通知",
      body: "您有一条新通知",
    }),
  }));

  assert.deepEqual(envelope, {
    rawMessage: {
      messageId: "msg_1",
      payload: JSON.stringify({
        notification_id: "notice_1",
        route: "pages/message/detail?id=1",
        title: "系统通知",
        body: "您有一条新通知",
      }),
    },
    payload: {
      notification_id: "notice_1",
      route: "pages/message/detail?id=1",
      title: "系统通知",
      body: "您有一条新通知",
    },
    messageId: "msg_1",
    notificationId: "notice_1",
    route: "/pages/message/detail?id=1",
    title: "系统通知",
    content: "您有一条新通知",
  });
});

test("push event bridge controller registers plus listeners only once", async () => {
  const addEventCalls = [];
  const listeners = {};
  const controller = createPushEventBridgeController({
    plusRuntime: {
      push: {
        addEventListener(event, callback) {
          addEventCalls.push(event);
          listeners[event] = callback;
        },
      },
    },
  });

  await controller.start();
  await controller.start();

  assert.equal(controller.isStarted(), true);
  assert.deepEqual(addEventCalls, ["receive", "click"]);
  assert.equal(typeof listeners.receive, "function");
  assert.equal(typeof listeners.click, "function");
});

test("startPushEventBridge acknowledges events and falls back to reLaunch navigation", async () => {
  resetPushEventBridgeForTest();

  const listeners = {};
  const ackCalls = [];
  const emitted = [];
  const navigations = [];
  const relaunches = [];

  await startPushEventBridge({
    uniApp: {
      $emit(event, payload) {
        emitted.push({ event, payload });
      },
      navigateTo({ url, fail }) {
        navigations.push(url);
        fail();
      },
      reLaunch({ url }) {
        relaunches.push(url);
      },
    },
    plusRuntime: {
      push: {
        addEventListener(event, callback) {
          listeners[event] = callback;
        },
      },
    },
    ackPushMessage(payload) {
      ackCalls.push(payload);
      return { ok: true };
    },
    resolveClickUrl(envelope) {
      return envelope.route;
    },
  });

  await listeners.receive({
    messageId: "msg_2",
    payload: {
      title: "收到新通知",
      route: "pages/notice/index",
    },
  });
  await listeners.click({
    messageId: "msg_3",
    payload: {
      title: "点击新通知",
      route: "pages/notice/detail?id=3",
    },
  });

  assert.equal(ackCalls[0].action, "received");
  assert.equal(ackCalls[0].messageId, "msg_2");
  assert.equal(ackCalls[1].action, "opened");
  assert.equal(ackCalls[1].messageId, "msg_3");
  assert.deepEqual(
    emitted.map((item) => item.event),
    ["push:received", "push:clicked"],
  );
  assert.deepEqual(navigations, ["/pages/notice/detail?id=3"]);
  assert.deepEqual(relaunches, ["/pages/notice/detail?id=3"]);
});
