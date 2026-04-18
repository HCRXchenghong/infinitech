import test from "node:test";
import assert from "node:assert/strict";

import { createCustomerServicePage } from "./customer-service-page.js";

function createPageInstance(page) {
  return {
    ...page.data(),
    ...page.methods,
    $nextTick(callback) {
      if (typeof callback === "function") {
        callback();
      }
    },
  };
}

test("customer service page loads recent orders and emits normalized order messages", async () => {
  const originalUni = globalThis.uni;
  const originalSetTimeout = globalThis.setTimeout;
  const storage = new Map();
  const socketEmits = [];

  globalThis.setTimeout = () => 0;
  globalThis.uni = {
    getStorageSync(key) {
      return storage.get(key);
    },
    setStorageSync(key, value) {
      storage.set(key, value);
    },
    removeStorageSync(key) {
      storage.delete(key);
    },
    showToast() {},
    navigateBack() {},
    previewImage() {},
  };

  try {
    const page = createCustomerServicePage({
      config: { SOCKET_URL: "https://socket.example.com" },
      createSocket: () => ({
        connect() {
          return {
            on() {},
            emit() {},
            disconnect() {},
          };
        },
      }),
      fetchHistory: async () => [],
      markConversationRead: async () => {},
      readAuthorizationHeader: () => ({ Authorization: "Bearer token" }),
      request: async () => [
        {
          order_id: "order-1",
          total_price: "18.60",
          shop_name: "云药房",
        },
      ],
      uploadCommonImage: async () => ({}),
      upsertConversation: async () => {},
      playMessageNotificationSound: () => {},
      getCachedSupportRuntimeSettings: () => ({ title: "在线客服" }),
      loadSupportRuntimeSettings: async () => ({ title: "在线客服" }),
      OrderDetailPopup: {},
    });

    const instance = createPageInstance(page);
    instance.userId = "user-2";
    instance.chatId = "user-2";
    instance.userName = "测试用户";
    instance.avatarUrl = "https://example.com/user.png";
    instance.isConnected = true;
    instance.socket = {
      emit(event, payload) {
        socketEmits.push({ event, payload });
      },
    };

    await instance.loadRecentOrders();
    assert.equal(instance.recentOrders.length, 1);
    assert.equal(instance.recentOrders[0].id, "order-1");
    assert.equal(instance.formatOrderAmount(instance.recentOrders[0]), "18.60");

    instance.sendOrder({
      order_id: "order-2",
      total_price: "25.00",
      shop_name: "鲜食餐厅",
    });

    assert.equal(socketEmits.length, 1);
    assert.equal(socketEmits[0].event, "send_message");
    assert.equal(socketEmits[0].payload.messageType, "order");
    assert.match(socketEmits[0].payload.content, /"id":"order-2"/);
    assert.equal(instance.messages.length, 1);
    assert.equal(instance.messages[0].order.id, "order-2");
    assert.equal(instance.showOrderPicker, false);
  } finally {
    globalThis.uni = originalUni;
    globalThis.setTimeout = originalSetTimeout;
  }
});
