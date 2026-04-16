import { extractErrorMessage } from "../../contracts/src/http.js";

function trimDiningBuddyText(value) {
  return String(value || "").trim();
}

function normalizeDiningBuddyNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function cloneDiningBuddyQuestionOption(option = {}) {
  return {
    text: trimDiningBuddyText(option.text),
    icon: trimDiningBuddyText(option.icon),
  };
}

function cloneDiningBuddyQuestion(question = {}) {
  return {
    question: trimDiningBuddyText(question.question),
    options: Array.isArray(question.options)
      ? question.options.map((item) => cloneDiningBuddyQuestionOption(item))
      : [],
  };
}

export const DINING_BUDDY_QUIZ_STORAGE_KEY = "diningBuddyQuizCompleted";

export const DEFAULT_DINING_BUDDY_CATEGORIES = [
  {
    id: "chat",
    label: "聊天",
    iconSvg: "/static/icons/chat-bubble.svg",
    color: "#ec4899",
  },
  {
    id: "food",
    label: "约饭",
    iconSvg: "/static/icons/food-bowl.svg",
    color: "#f97316",
  },
  {
    id: "study",
    label: "学习",
    iconSvg: "/static/icons/study-book.svg",
    color: "#6366f1",
  },
];

export const DEFAULT_DINING_BUDDY_QUESTIONS = [
  {
    question: "你更想先从哪种搭子开始？",
    options: [
      { text: "先找个能聊天的人", icon: "💬" },
      { text: "先约一顿饭最直接", icon: "🍜" },
      { text: "先找学习监督搭子", icon: "📚" },
    ],
  },
  {
    question: "你希望这场局有多少人？",
    options: [
      { text: "2 人就够，直接高效", icon: "🫶" },
      { text: "3-4 人，刚好不冷场", icon: "✨" },
      { text: "5-6 人，更热闹一点", icon: "🎉" },
    ],
  },
  {
    question: "如果现场节奏不一致，你更偏向？",
    options: [
      { text: "先听听大家意见", icon: "🤝" },
      { text: "商量一个折中方案", icon: "🗣️" },
      { text: "我会先把偏好说清楚", icon: "✅" },
    ],
  },
];

export function createDefaultDiningBuddyCategories() {
  return DEFAULT_DINING_BUDDY_CATEGORIES.map((item) => ({ ...item }));
}

export function createDefaultDiningBuddyQuestions() {
  return DEFAULT_DINING_BUDDY_QUESTIONS.map((item) =>
    cloneDiningBuddyQuestion(item),
  );
}

export function createDefaultDiningBuddyPartyForm({
  category = "food",
  maxPeople = 4,
} = {}) {
  return {
    category: trimDiningBuddyText(category) || "food",
    title: "",
    location: "",
    time: "",
    description: "",
    maxPeople: Math.max(2, normalizeDiningBuddyNumber(maxPeople, 4)),
  };
}

export function normalizeDiningBuddyPartyListResponse(response) {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && Array.isArray(response.parties)) {
    return response.parties;
  }
  if (response?.data && Array.isArray(response.data.parties)) {
    return response.data.parties;
  }
  return [];
}

export function normalizeDiningBuddyMessageListResponse(response) {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && Array.isArray(response.messages)) {
    return response.messages;
  }
  if (response?.data && Array.isArray(response.data.messages)) {
    return response.data.messages;
  }
  return [];
}

export function pickDiningBuddyErrorMessage(
  error,
  fallback = "操作失败，请稍后再试",
) {
  return extractErrorMessage(error, fallback);
}

export function normalizeDiningBuddyRuntimeCategories(
  categories,
  fallback = createDefaultDiningBuddyCategories(),
) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return fallback.map((item) => ({ ...item }));
  }

  const fallbackMap = new Map(
    fallback.map((item) => [trimDiningBuddyText(item.id), { ...item }]),
  );

  const normalized = categories
    .filter((item) => item && item.enabled !== false)
    .map((item) => {
      const id = trimDiningBuddyText(item.id);
      const fallbackItem = fallbackMap.get(id) || {};
      return {
        id: id || trimDiningBuddyText(fallbackItem.id),
        label:
          trimDiningBuddyText(item.label) || trimDiningBuddyText(fallbackItem.label),
        iconSvg:
          trimDiningBuddyText(item.icon) ||
          trimDiningBuddyText(item.iconSvg) ||
          trimDiningBuddyText(fallbackItem.iconSvg),
        color:
          trimDiningBuddyText(item.color) || trimDiningBuddyText(fallbackItem.color),
        sortOrder: normalizeDiningBuddyNumber(item.sort_order, 0),
      };
    })
    .filter((item) => item.id && item.label && item.iconSvg && item.color)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(({ sortOrder, ...item }) => item);

  return normalized.length > 0
    ? normalized
    : fallback.map((item) => ({ ...item }));
}

export function normalizeDiningBuddyRuntimeQuestions(
  questions,
  fallback = createDefaultDiningBuddyQuestions(),
) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return fallback.map((item) => cloneDiningBuddyQuestion(item));
  }

  const normalized = questions
    .map((question) => ({
      question: trimDiningBuddyText(question?.question),
      options: Array.isArray(question?.options)
        ? question.options
            .map((option) => cloneDiningBuddyQuestionOption(option))
            .filter((option) => option.text)
        : [],
    }))
    .filter((question) => question.question && question.options.length > 0);

  return normalized.length > 0
    ? normalized
    : fallback.map((item) => cloneDiningBuddyQuestion(item));
}

export function normalizeDiningBuddyRuntimePeopleConfig(settings = {}) {
  const requestedDefaultMaxPeople = Math.max(
    2,
    normalizeDiningBuddyNumber(settings.default_max_people, 4),
  );
  const maxPeopleLimit = Math.max(
    2,
    normalizeDiningBuddyNumber(settings.max_max_people, 6),
  );

  return {
    defaultMaxPeople: Math.min(requestedDefaultMaxPeople, maxPeopleLimit),
    maxPeopleLimit,
  };
}

export function filterDiningBuddyPartiesByCategory(
  parties = [],
  category = "food",
) {
  return (Array.isArray(parties) ? parties : []).filter(
    (party) => trimDiningBuddyText(party?.category) === trimDiningBuddyText(category),
  );
}

export function getDiningBuddyCategoryLabel(
  categories = [],
  category = "",
  fallback = "约饭",
) {
  const current = (Array.isArray(categories) ? categories : []).find(
    (item) => trimDiningBuddyText(item?.id) === trimDiningBuddyText(category),
  );
  return trimDiningBuddyText(current?.label) || fallback;
}

export function getDiningBuddyCategoryColor(
  category = "",
  categories = [],
  opacity = 1,
) {
  const current = (Array.isArray(categories) ? categories : []).find(
    (item) => trimDiningBuddyText(item?.id) === trimDiningBuddyText(category),
  );
  const fallbackColor = "#f97316";
  const color = trimDiningBuddyText(current?.color) || fallbackColor;

  if (opacity >= 1) {
    return color;
  }

  const normalizedHex = color.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalizedHex)) {
    return fallbackColor;
  }

  const r = parseInt(normalizedHex.substring(0, 2), 16);
  const g = parseInt(normalizedHex.substring(2, 4), 16);
  const b = parseInt(normalizedHex.substring(4, 6), 16);
  const safeOpacity = Math.max(0, Math.min(1, Number(opacity) || 0));
  return `rgba(${r}, ${g}, ${b}, ${safeOpacity})`;
}
