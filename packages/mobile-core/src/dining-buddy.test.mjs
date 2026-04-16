import test from "node:test";
import assert from "node:assert/strict";

import {
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
