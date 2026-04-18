import test from "node:test";
import assert from "node:assert/strict";

import {
  createDiningBuddyPage,
  createDefaultDiningBuddyCategories,
  createDefaultDiningBuddyPartyForm,
  createDefaultDiningBuddyQuestions,
  DINING_BUDDY_QUIZ_STORAGE_KEY,
  filterDiningBuddyPartiesByCategory,
  getDiningBuddyCategoryColor,
  getDiningBuddyCategoryLabel,
  normalizeDiningBuddyMessageListResponse,
  normalizeDiningBuddyPartyListResponse,
  normalizeDiningBuddyRuntimeCategories,
  normalizeDiningBuddyRuntimePeopleConfig,
  normalizeDiningBuddyRuntimeQuestions,
  pickDiningBuddyErrorMessage,
} from "./dining-buddy.js";

function createPageInstance(page) {
  const instance = {
    ...page.data(),
    ...page.methods,
  };

  Object.entries(page.computed || {}).forEach(([key, getter]) => {
    Object.defineProperty(instance, key, {
      configurable: true,
      enumerable: true,
      get: getter.bind(instance),
    });
  });

  return instance;
}

async function flushPromises() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

test("dining buddy helpers expose stable defaults", () => {
  const categories = createDefaultDiningBuddyCategories();
  const questions = createDefaultDiningBuddyQuestions();

  assert.equal(DINING_BUDDY_QUIZ_STORAGE_KEY, "diningBuddyQuizCompleted");
  assert.equal(categories[0].id, "chat");
  assert.equal(questions.length, 3);
  assert.notEqual(categories, createDefaultDiningBuddyCategories());
  assert.notEqual(questions, createDefaultDiningBuddyQuestions());
  assert.deepEqual(
    createDefaultDiningBuddyPartyForm({ category: "study", maxPeople: "5" }),
    {
      category: "study",
      title: "",
      location: "",
      time: "",
      description: "",
      maxPeople: 5,
    },
  );
});

test("dining buddy helpers normalize runtime collections", () => {
  assert.deepEqual(
    normalizeDiningBuddyRuntimeCategories([
      {
        id: "food",
        label: " 美食 ",
        icon: "/food.svg",
        color: "#123456",
        sort_order: 2,
      },
      {
        id: "chat",
        label: " 聊天局 ",
        icon: "/chat.svg",
        color: "#654321",
        sort_order: 1,
      },
      {
        id: "study",
        enabled: false,
      },
    ]),
    [
      {
        id: "chat",
        label: "聊天局",
        iconSvg: "/chat.svg",
        color: "#654321",
      },
      {
        id: "food",
        label: "美食",
        iconSvg: "/food.svg",
        color: "#123456",
      },
    ],
  );

  assert.deepEqual(
    normalizeDiningBuddyRuntimeQuestions([
      {
        question: " 你想找什么局？ ",
        options: [
          { text: " 聊天 ", icon: "💬" },
          { text: " ", icon: "🍜" },
        ],
      },
    ]),
    [
      {
        question: "你想找什么局？",
        options: [{ text: "聊天", icon: "💬" }],
      },
    ],
  );

  assert.deepEqual(
    normalizeDiningBuddyRuntimePeopleConfig({
      default_max_people: "5",
      max_max_people: "4",
    }),
    {
      defaultMaxPeople: 4,
      maxPeopleLimit: 4,
    },
  );
});

test("dining buddy helpers normalize responses, filters and colors", () => {
  const categories = createDefaultDiningBuddyCategories();

  assert.deepEqual(
    normalizeDiningBuddyPartyListResponse({ data: { parties: [{ id: "party-1" }] } }),
    [{ id: "party-1" }],
  );
  assert.deepEqual(
    normalizeDiningBuddyMessageListResponse({ messages: [{ id: "msg-1" }] }),
    [{ id: "msg-1" }],
  );
  assert.deepEqual(
    filterDiningBuddyPartiesByCategory(
      [
        { id: "1", category: "chat" },
        { id: "2", category: "food" },
      ],
      "chat",
    ),
    [{ id: "1", category: "chat" }],
  );
  assert.equal(getDiningBuddyCategoryLabel(categories, "study"), "学习");
  assert.equal(
    getDiningBuddyCategoryColor("chat", categories, 0.1),
    "rgba(236, 72, 153, 0.1)",
  );
  assert.equal(
    pickDiningBuddyErrorMessage(
      { response: { data: { error: "加载失败" } } },
      "fallback",
    ),
    "加载失败",
  );
});

test("dining buddy page centralizes runtime, party flow and reporting logic", async () => {
  const storage = {};
  const toasts = [];
  const loadingStates = [];
  const switchTabUrls = [];
  const reportPayloads = [];
  const partyRows = [
    {
      id: "party-1",
      category: "food",
      current: 1,
      max: 4,
      title: "午餐搭子",
      location: "园区食堂",
      time: "周五 12:00",
      matchScore: 92,
      matchReason: "同园区用户",
      joined: false,
    },
  ];
  const partyMessages = {
    "party-2": [
      {
        id: "msg-1",
        sender: "other",
        text: "欢迎加入",
        senderName: "搭子A",
      },
    ],
  };
  const originalUni = globalThis.uni;
  const originalSetTimeout = globalThis.setTimeout;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;

  globalThis.setTimeout = (callback) => {
    callback();
    return 0;
  };
  globalThis.setInterval = () => 1;
  globalThis.clearInterval = () => {};
  globalThis.uni = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    showToast(payload) {
      toasts.push(payload);
    },
    showLoading(payload) {
      loadingStates.push(`show:${payload.title}`);
    },
    hideLoading() {
      loadingStates.push("hide");
    },
    showActionSheet({ itemList, success }) {
      assert.deepEqual(itemList, ["虚假组局", "骚扰引流", "不当内容"]);
      success?.({ tapIndex: 0 });
    },
    switchTab({ url }) {
      switchTabUrls.push(url);
    },
  };

  try {
    const page = createDiningBuddyPage({
      PageHeader: {},
      clientId: "app-mobile",
      listDiningBuddyParties: async () => partyRows.map((item) => ({ ...item })),
      createDiningBuddyParty: async (payload) => {
        const party = {
          id: "party-2",
          current: 1,
          max: payload.maxPeople,
          matchScore: 96,
          matchReason: "兴趣高度匹配",
          joined: false,
          ...payload,
        };
        partyRows.unshift(party);
        return { ...party };
      },
      joinDiningBuddyParty: async (partyId) => {
        const current = partyRows.find((item) => item.id === partyId);
        return { ...current, joined: true };
      },
      fetchDiningBuddyMessages: async (partyId) => partyMessages[partyId] || [],
      sendDiningBuddyMessage: async (partyId, payload) => {
        const message = {
          id: "msg-2",
          sender: "me",
          text: payload.content,
        };
        partyMessages[partyId] = [...(partyMessages[partyId] || []), message];
        return message;
      },
      createDiningBuddyReport: async (payload) => {
        reportPayloads.push(payload);
        return { success: true };
      },
      isRuntimeRouteEnabled: () => true,
      loadPlatformRuntimeSettings: async () => ({
        diningBuddySettings: {
          welcome_title: "饭友局",
          categories: [
            {
              id: "food",
              label: "美食局",
              icon: "/food.svg",
              color: "#123456",
              sort_order: 1,
            },
          ],
          questions: [
            {
              question: "你想吃什么？",
              options: [{ text: "火锅", icon: "🍲" }],
            },
          ],
          default_max_people: 4,
          max_max_people: 6,
        },
      }),
    });
    const instance = createPageInstance(page);
    instance.$nextTick = (callback) => callback();

    page.onLoad.call(instance);
    await flushPromises();

    assert.equal(instance.featureEnabled, true);
    assert.equal(instance.diningTitle, "饭友局");
    assert.equal(instance.view, "welcome");
    assert.equal(instance.parties.length, 1);
    assert.equal(instance.categories[0].label, "美食局");

    instance.startQuiz();
    instance.handleQuizAnswer();
    assert.equal(storage[DINING_BUDDY_QUIZ_STORAGE_KEY], true);
    assert.equal(instance.view, "home");

    instance.openCreateModal();
    instance.newParty.title = "火锅搭子";
    instance.newParty.location = "万象城";
    instance.newParty.time = "今晚 19:00";
    await instance.createParty();

    assert.equal(instance.parties[0].id, "party-2");
    assert.equal(instance.showCreateModal, false);
    assert.equal(toasts.at(-1)?.title, "发布成功");

    await instance.joinParty(instance.parties[0]);
    assert.equal(instance.view, "chat");
    assert.equal(instance.activeParty.id, "party-2");
    assert.equal(instance.messages.length, 1);
    assert.deepEqual(loadingStates, ["show:进入中...", "hide"]);

    instance.chatInput = "你好";
    await instance.sendMessage();
    assert.equal(instance.messages.length, 2);
    assert.equal(instance.chatInput, "");

    instance.reportParty(instance.activeParty);
    await flushPromises();
    assert.deepEqual(reportPayloads, [
      {
        target_type: "party",
        target_id: "party-2",
        reason: "虚假组局",
        description: "",
      },
    ]);

    instance.handleChatBack();
    assert.equal(instance.view, "home");
    assert.equal(instance.activeParty, null);
    instance.goBackHome();
    assert.deepEqual(switchTabUrls, ["/pages/index/index"]);
  } finally {
    globalThis.uni = originalUni;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});
