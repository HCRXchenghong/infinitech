import test from "node:test";
import assert from "node:assert/strict";

import { createRTCCallPage } from "./rtc-call-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  for (const [name, getter] of Object.entries(component.computed || {})) {
    Object.defineProperty(instance, name, {
      get: () => getter.call(instance),
      enumerable: true,
      configurable: true,
    });
  }

  return instance;
}

test("rtc call page bootstraps outgoing calls and schedules timeout from runtime settings", async () => {
  const timers = [];
  const session = {
    join() {},
    accept() {},
    reject() {},
    cancel() {},
    end() {},
    disconnect() {},
    signal() {},
    timeout(payload) {
      session.timeoutPayload = payload;
    },
  };
  const component = createRTCCallPage({
    canUseRTCContact: () => true,
    canUseRTCMedia: () => false,
    getCachedRTCRuntimeSettings: () => ({ timeoutSeconds: 12, iceServers: [] }),
    loadRTCRuntimeSettings: async () => ({ enabled: true, timeoutSeconds: 12, iceServers: [] }),
    startRTCCall: async () => ({
      call: {
        call_id: "call_1",
        status: "ringing",
        callee_role: "merchant",
        callee_id: "merchant_8",
      },
      session,
    }),
    setTimeoutFn(callback, delay) {
      const timer = { callback, delay };
      timers.push(timer);
      return timer;
    },
    clearTimeoutFn() {},
  });
  const page = instantiatePage(component);

  await component.onLoad.call(page, {
    targetRole: "merchant",
    targetId: "merchant_8",
    targetName: encodeURIComponent("测试商家"),
  });

  assert.equal(page.callId, "call_1");
  assert.equal(page.status, "ringing");
  assert.equal(page.roleLabel, "联系商家");
  assert.equal(page.statusText, "等待接听");
  assert.equal(timers[0].delay, 12000);

  timers[0].callback();
  assert.equal(page.errorMessage, "对方未在有效时间内响应，本次呼叫已自动结束。");
  assert.deepEqual(session.timeoutPayload, {
    orderId: "",
    conversationId: "",
    entryPoint: "order_contact_modal",
    scene: "order_contact",
    failureReason: "no_answer_timeout",
  });
});

test("rtc call page routes to chat and closes through injected uni runtime", () => {
  const navigations = [];
  const backCalls = [];
  const component = createRTCCallPage({
    uniApp: {
      navigateTo(payload) {
        navigations.push(payload);
      },
      navigateBack(payload) {
        backCalls.push(payload);
      },
      showToast() {},
    },
  });
  const page = instantiatePage(component);
  page.orderId = "order_9";
  page.targetRole = "merchant";
  page.targetId = "merchant_3";
  page.targetName = "商家A";
  page.conversationId = "conv_9";

  page.goChat();
  page.handleClose();

  assert.equal(
    navigations[0].url,
    "/pages/message/chat/index?chatType=direct&roomId=conv_9&name=%E5%95%86%E5%AE%B6A&role=shop&avatar=%2Fstatic%2Fimages%2Fdefault-shop.svg&targetId=merchant_3&orderId=order_9",
  );
  assert.deepEqual(backCalls[0], { fail: backCalls[0].fail });
  assert.equal(typeof backCalls[0].fail, "function");
});
