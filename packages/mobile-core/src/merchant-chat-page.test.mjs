import test from "node:test";
import assert from "node:assert/strict";

import { createMerchantChatPage } from "./merchant-chat-page.js";

function createRef(value) {
  return { value };
}

function createComputed(getter) {
  return {
    get value() {
      return getter();
    },
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test("merchant chat page initializes shared support chat and sends text and image messages", async () => {
  const socketHandlers = {};
  const socketEmits = [];
  const toasts = [];
  const previewCalls = [];
  const loadingCalls = [];
  let loadHandler = null;

  const page = createMerchantChatPage({
    refImpl: createRef,
    computedImpl: createComputed,
    onLoadImpl(handler) {
      loadHandler = handler;
    },
    createSocket() {
      return {
        connect() {
          return {
            on(event, handler) {
              socketHandlers[event] = handler;
            },
            emit(event, payload) {
              socketEmits.push({ event, payload });
            },
            disconnect() {},
          };
        },
      };
    },
    config: {
      SOCKET_URL: "wss://socket.example.com",
    },
    resolveSocketTokenImpl: async () => "socket-token",
    fetchHistory: async () => [
      {
        senderId: "user-1",
        senderRole: "user",
        messageType: "text",
        content: "您好",
      },
    ],
    markConversationRead: async () => {},
    readAuthorizationHeader: () => ({ Authorization: "Bearer token" }),
    upsertConversation: async () => {},
    uploadImage: async () => ({
      asset_url: "https://cdn.example.com/merchant-chat-image.png",
      access_policy: "public",
    }),
    getCachedSupportRuntimeSettings: () => ({ title: "平台客服" }),
    loadSupportRuntimeSettings: async () => ({ title: "平台客服" }),
    readMerchantAuthIdentity: () => ({
      merchantPhone: "13900000000",
      merchantName: "商户A",
      profile: { avatar: "https://cdn.example.com/merchant-avatar.png" },
    }),
    getMerchantId: () => "merchant-1",
    getMerchantProfile: () => ({
      avatar: "https://cdn.example.com/merchant-avatar.png",
    }),
    playMerchantMessageNotificationSound() {},
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
      showLoading(payload) {
        loadingCalls.push(["show", payload.title]);
      },
      hideLoading() {
        loadingCalls.push(["hide"]);
      },
      chooseImage(payload) {
        payload.success({ tempFilePaths: ["/tmp/merchant-image.png"] });
      },
      previewImage(payload) {
        previewCalls.push(payload);
      },
      navigateBack() {},
    },
    setTimeoutFn() {
      return 0;
    },
  });

  loadHandler({ chatId: "support-chat", role: "admin" });
  await flushMicrotasks();
  await page.initSocket();
  socketHandlers.connect();

  assert.equal(page.chatTitle.value, "平台客服");
  assert.equal(page.messages.value.length, 1);
  assert.equal(page.messages.value[0].text, "您好");
  assert.equal(socketEmits[0].event, "join_chat");

  page.draft.value = "收到";
  page.sendText();
  page.chooseImage();
  await flushMicrotasks();
  page.previewImage("https://cdn.example.com/merchant-chat-image.png");

  assert.equal(socketEmits[1].event, "send_message");
  assert.equal(socketEmits[1].payload.messageType, "text");
  assert.equal(socketEmits[1].payload.content, "收到");
  assert.equal(socketEmits[2].payload.messageType, "image");
  assert.equal(
    socketEmits[2].payload.content,
    "https://cdn.example.com/merchant-chat-image.png",
  );
  assert.equal(page.messages.value.length, 3);
  assert.deepEqual(loadingCalls, [["show", "上传中..."], ["hide"]]);
  assert.deepEqual(previewCalls, [
    {
      urls: ["https://cdn.example.com/merchant-chat-image.png"],
      current: "https://cdn.example.com/merchant-chat-image.png",
    },
  ]);
  assert.deepEqual(toasts, []);
});

test("merchant chat page falls back cleanly when auth is missing and can clear local messages", async () => {
  const toasts = [];
  let loadHandler = null;

  const page = createMerchantChatPage({
    refImpl: createRef,
    computedImpl: createComputed,
    onLoadImpl(handler) {
      loadHandler = handler;
    },
    resolveSocketTokenImpl: async () => "unused",
    fetchHistory: async () => [],
    markConversationRead: async () => {},
    readAuthorizationHeader: () => ({}),
    upsertConversation: async () => {},
    uploadImage: async () => ({}),
    getCachedSupportRuntimeSettings: () => ({ title: "平台客服" }),
    loadSupportRuntimeSettings: async () => ({ title: "平台客服" }),
    readMerchantAuthIdentity: () => ({
      merchantPhone: "13900000000",
      merchantName: "商户A",
    }),
    getMerchantId: () => "",
    getMerchantProfile: () => ({}),
    playMerchantMessageNotificationSound() {},
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
      navigateBack() {},
    },
  });

  loadHandler({});
  await flushMicrotasks();
  await page.initSocket();

  assert.equal(page._merchantChatDebug.chatId.value, "merchant_13900000000");
  assert.equal(page._merchantChatDebug.chatRole.value, "admin");
  assert.equal(toasts[0]?.title, "请先登录后再连接聊天");
  assert.equal(toasts[0]?.icon, "none");

  page.messages.value = [
    {
      mid: "local_1",
      self: true,
      text: "hello",
      type: "text",
      timestamp: Date.now(),
      time: "12:00",
      status: "sent",
      officialIntervention: false,
      interventionLabel: "",
    },
  ];
  page.clearLocalMessages();

  assert.equal(page.messages.value.length, 0);
  assert.deepEqual(toasts.slice(1), [
    { title: "已清除当前设备记录", icon: "none" },
  ]);
});
