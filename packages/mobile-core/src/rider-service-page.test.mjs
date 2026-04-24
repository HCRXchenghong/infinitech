import test from "node:test";
import assert from "node:assert/strict";

import {
  createRiderServicePageLogic,
  extractRiderServiceOrderList,
  inferRiderServiceRoleByChatId,
} from "./rider-service-page.js";

function createPageInstance(page) {
  const instance = {
    ...page.data(),
    $nextTick(callback) {
      if (typeof callback === "function") {
        callback();
      }
    },
  };

  if (typeof page.onLoad === "function") {
    instance.onLoad = page.onLoad.bind(instance);
  }
  if (typeof page.onUnload === "function") {
    instance.onUnload = page.onUnload.bind(instance);
  }
  if (typeof page.onShow === "function") {
    instance.onShow = page.onShow.bind(instance);
  }

  for (const [name, handler] of Object.entries(page.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test("rider service helpers infer roles and extract enveloped order collections", () => {
  assert.equal(inferRiderServiceRoleByChatId("rider_123"), "user");
  assert.equal(inferRiderServiceRoleByChatId("rs_12"), "merchant");
  assert.equal(inferRiderServiceRoleByChatId("support"), "admin");
  assert.deepEqual(
    extractRiderServiceOrderList({ data: { orders: [{ id: "order-1" }] } }),
    [{ id: "order-1" }],
  );
});

test("rider service page loads recent orders and emits normalized order and image messages", async () => {
  const socketEmits = [];
  const savedMessages = [];
  const toasts = [];
  const loadingStates = [];

  const page = createRiderServicePageLogic({
    fetchHistory: async () => [],
    fetchRiderOrders: async () => [],
    markConversationRead: async () => {},
    request: async ({ data }) => {
      if (data?.status === "pending") {
        return {
          data: {
            orders: [
              { order_id: "order-1", total_price: "18.60", shop_name: "云药房" },
            ],
          },
        };
      }

      return {
        data: {
          orders: [
            {
              order_id: "order-2",
              total_price: "25.00",
              shop_name: "鲜食餐厅",
              rider_id: "rider-1",
            },
          ],
        },
      };
    },
    upsertConversation: async () => {},
    uploadImage: async () => ({
      asset_url: "https://cdn.example.com/chat-image.png",
      access_policy: "public",
    }),
    readRiderAuthIdentity: () => ({
      riderId: "rider-1",
      riderName: "骑手A",
      riderPhone: "13800000000",
      profile: { avatar: "https://cdn.example.com/avatar.png" },
    }),
    loadSupportRuntimeSettings: async () => ({ title: "平台客服" }),
    db: {
      async open() {},
      saveMessage(_chatId, payload) {
        savedMessages.push(payload);
      },
      async updateMessage() {},
    },
    messageManager: {
      setCurrentChatId() {},
    },
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
      showLoading(payload) {
        loadingStates.push(["show", payload.title]);
      },
      hideLoading() {
        loadingStates.push(["hide"]);
      },
      chooseImage(payload) {
        payload.success({ tempFilePaths: ["/tmp/chat-image.png"] });
      },
    },
    getAppFn() {
      return {
        $vm: {
          socket: {
            connected: true,
            emit(event, payload) {
              socketEmits.push({ event, payload });
            },
          },
        },
      };
    },
    setTimeoutFn() {
      return 0;
    },
  });

  const instance = createPageInstance(page);
  instance.riderId = "rider-1";
  instance.riderName = "骑手A";
  instance.avatarUrl = "https://cdn.example.com/avatar.png";
  instance.chatId = "rs_merchant_1";
  instance.chatRole = "merchant";
  instance.chatTitle = "商家会话";
  instance.targetId = "merchant-1";
  instance.dbReady = true;

  await instance.loadRecentOrders();
  assert.equal(instance.recentOrders.length, 2);
  assert.equal(instance.recentOrders[0].id, "order-1");
  assert.equal(instance.recentOrders[1].id, "order-2");

  instance.sendOrder(instance.recentOrders[0]);
  instance.chooseImage();
  await flushMicrotasks();

  assert.equal(socketEmits.length, 2);
  assert.equal(socketEmits[0].event, "send_message");
  assert.equal(socketEmits[0].payload.messageType, "order");
  assert.match(socketEmits[0].payload.content, /"id":"order-1"/);
  assert.equal(socketEmits[1].payload.messageType, "image");
  assert.equal(socketEmits[1].payload.content, "https://cdn.example.com/chat-image.png");
  assert.equal(instance.messages.length, 2);
  assert.equal(instance.messages[0].order.id, "order-1");
  assert.equal(instance.messages[1].content, "https://cdn.example.com/chat-image.png");
  assert.equal(savedMessages[1].content, "https://cdn.example.com/chat-image.png");
  assert.deepEqual(loadingStates, [
    ["show", "上传中..."],
    ["hide"],
  ]);
  assert.deepEqual(toasts, []);
});

test("rider service page switches chats and clears local records through the shared runtime", async () => {
  const socketEmits = [];
  const currentChatIds = [];
  const deletedChatIds = [];
  const navTitles = [];
  const toasts = [];

  const page = createRiderServicePageLogic({
    fetchHistory: async () => [
      {
        id: "history-1",
        senderId: "support",
        senderRole: "admin",
        messageType: "text",
        content: "您好",
      },
    ],
    markConversationRead: async () => {},
    upsertConversation: async () => {},
    readRiderAuthIdentity: () => ({ riderId: "rider-1" }),
    loadSupportRuntimeSettings: async () => ({ title: "平台客服" }),
    db: {
      async open() {},
      async updateMessage() {},
      async deleteMessagesByChatId(chatId) {
        deletedChatIds.push(chatId);
      },
    },
    messageManager: {
      setCurrentChatId(chatId) {
        currentChatIds.push(chatId);
      },
    },
    uniApp: {
      setNavigationBarTitle(payload) {
        navTitles.push(payload.title);
      },
      showToast(payload) {
        toasts.push(payload);
      },
      showModal(payload) {
        const result = payload.success({ confirm: true });
        if (result && typeof result.then === "function") {
          return result;
        }
        return undefined;
      },
    },
    getAppFn() {
      return {
        $vm: {
          socket: {
            connected: true,
            emit(event, payload) {
              socketEmits.push({ event, payload });
            },
          },
        },
      };
    },
  });

  const instance = createPageInstance(page);
  instance.riderId = "rider-1";
  instance.supportChatTitle = "平台客服";
  instance.dbReady = true;
  instance.messages = [{ id: "temp-1", isSelf: true, status: "sent" }];

  await instance.switchChat("support", {
    role: "admin",
  });

  assert.equal(instance.chatId, "support");
  assert.equal(instance.chatRole, "admin");
  assert.equal(instance.chatTitle, "平台客服");
  assert.equal(instance.messages.length, 1);
  assert.deepEqual(currentChatIds, ["support"]);
  assert.deepEqual(navTitles, ["平台客服"]);
  assert.equal(socketEmits[0].event, "join_chat");

  await instance.clearMessages();
  await flushMicrotasks();

  assert.deepEqual(deletedChatIds, ["support"]);
  assert.deepEqual(toasts, [{ title: "已清除本地记录", icon: "success" }]);
  assert.equal(instance.messages.length, 0);
});
