import { extractErrorMessage } from "../../contracts/src/http.js";
import { getMobileClientId } from "./mobile-client-context.js";

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

export function createDiningBuddyPage({
  PageHeader,
  clientId = getMobileClientId(),
  listDiningBuddyParties = async () => [],
  createDiningBuddyParty = async () => ({}),
  joinDiningBuddyParty = async () => ({}),
  fetchDiningBuddyMessages = async () => [],
  sendDiningBuddyMessage = async () => ({}),
  createDiningBuddyReport = async () => ({}),
  isRuntimeRouteEnabled = () => true,
  loadPlatformRuntimeSettings = async () => ({}),
} = {}) {
  return {
    components: { PageHeader },

    data() {
      return {
        featureEnabled: true,
        diningTitle: "同频饭友",
        diningSubtitle: "约饭、聊天、学习，快速找到同频搭子。",
        defaultMaxPeople: 4,
        maxPeopleLimit: 6,
        view: "welcome",
        activeCategory: "food",
        showCreateModal: false,
        quizStep: 0,
        parties: [],
        activeParty: null,
        messages: [],
        chatInput: "",
        chatScrollTo: "",
        loadingParties: false,
        creatingParty: false,
        openingPartyId: "",
        sendingMessage: false,
        pollTimer: null,
        categories: createDefaultDiningBuddyCategories(),
        questions: createDefaultDiningBuddyQuestions(),
        newParty: createDefaultDiningBuddyPartyForm(),
      };
    },

    computed: {
      currentQuestion() {
        return this.questions[this.quizStep] || this.questions[0];
      },
      quizProgress() {
        return this.questions.length
          ? ((this.quizStep + 1) / this.questions.length) * 100
          : 100;
      },
      filteredParties() {
        return filterDiningBuddyPartiesByCategory(
          this.parties,
          this.activeCategory,
        );
      },
      currentCategoryLabel() {
        return getDiningBuddyCategoryLabel(this.categories, this.activeCategory);
      },
    },

    onLoad() {
      this.loadRuntime();
      const quizCompleted = Boolean(
        uni.getStorageSync(DINING_BUDDY_QUIZ_STORAGE_KEY),
      );
      this.view = quizCompleted ? "home" : "welcome";
      this.loadParties();
    },

    onUnload() {
      this.stopMessagePolling();
    },

    methods: {
      async loadRuntime() {
        try {
          const runtime = await loadPlatformRuntimeSettings();
          this.featureEnabled = isRuntimeRouteEnabled(
            runtime,
            "feature",
            "dining_buddy",
            clientId,
          );
          const settings = runtime.diningBuddySettings || {};
          this.diningTitle = settings.welcome_title || "同频饭友";
          this.diningSubtitle =
            settings.welcome_subtitle ||
            "约饭、聊天、学习，快速找到同频搭子。";
          this.categories = normalizeDiningBuddyRuntimeCategories(
            settings.categories,
            this.categories,
          );
          this.questions = normalizeDiningBuddyRuntimeQuestions(
            settings.questions,
            this.questions,
          );
          const peopleConfig = normalizeDiningBuddyRuntimePeopleConfig(settings);
          this.defaultMaxPeople = peopleConfig.defaultMaxPeople;
          this.maxPeopleLimit = peopleConfig.maxPeopleLimit;
          if (!this.categories.find((item) => item.id === this.activeCategory)) {
            this.activeCategory = this.categories[0]?.id || "food";
          }
          this.newParty = createDefaultDiningBuddyPartyForm({
            category: this.activeCategory,
            maxPeople: this.defaultMaxPeople,
          });
        } catch (error) {
          console.error("加载饭友 runtime 失败:", error);
        }
      },
      startQuiz() {
        if (!this.featureEnabled) {
          uni.showToast({ title: "当前服务暂未开放", icon: "none" });
          return;
        }
        this.view = "quiz";
        this.quizStep = 0;
      },
      handleQuizAnswer() {
        if (this.quizStep < this.questions.length - 1) {
          this.quizStep += 1;
          return;
        }
        this.completeQuiz();
      },
      completeQuiz() {
        this.view = "matching";
        uni.setStorageSync(DINING_BUDDY_QUIZ_STORAGE_KEY, true);
        setTimeout(() => {
          this.view = "home";
          this.loadParties();
        }, 1200);
      },
      switchCategory(categoryId) {
        this.activeCategory = categoryId;
        this.newParty.category = categoryId;
      },
      getCategoryColor(category, opacity = 1) {
        return getDiningBuddyCategoryColor(category, this.categories, opacity);
      },
      isPartyFull(party) {
        return Number(party?.current || 0) >= Number(party?.max || 0);
      },
      async loadParties() {
        if (!this.featureEnabled) {
          this.parties = [];
          return;
        }
        this.loadingParties = true;
        try {
          const response = await listDiningBuddyParties();
          this.parties = normalizeDiningBuddyPartyListResponse(response);
        } catch (error) {
          uni.showToast({
            title: pickDiningBuddyErrorMessage(error, "加载组局失败"),
            icon: "none",
          });
        } finally {
          this.loadingParties = false;
        }
      },
      async joinParty(party) {
        if (!this.featureEnabled) {
          uni.showToast({ title: "当前服务暂未开放", icon: "none" });
          return;
        }
        if (!party?.id) {
          return;
        }
        if (this.isPartyFull(party) && !party.joined) {
          uni.showToast({ title: "该组局已满员", icon: "none" });
          return;
        }
        if (this.openingPartyId === party.id) {
          return;
        }

        this.openingPartyId = party.id;
        uni.showLoading({ title: "进入中..." });
        try {
          const activeParty = party.joined
            ? party
            : await joinDiningBuddyParty(party.id);
          this.activeParty = activeParty;
          this.view = "chat";
          await this.loadMessages(activeParty.id);
          await this.loadParties();
          this.startMessagePolling();
        } catch (error) {
          uni.showToast({
            title: pickDiningBuddyErrorMessage(error, "进入组局失败"),
            icon: "none",
          });
        } finally {
          this.openingPartyId = "";
          uni.hideLoading();
        }
      },
      async loadMessages(partyId) {
        const response = await fetchDiningBuddyMessages(partyId);
        this.messages = normalizeDiningBuddyMessageListResponse(response);
        this.scrollToLatestMessage();
      },
      async sendMessage() {
        if (!this.featureEnabled) {
          uni.showToast({ title: "当前服务暂未开放", icon: "none" });
          return;
        }
        const content = this.chatInput.trim();
        if (!content || !this.activeParty?.id || this.sendingMessage) {
          return;
        }

        this.sendingMessage = true;
        try {
          const message = await sendDiningBuddyMessage(this.activeParty.id, {
            content,
          });
          this.messages.push(message);
          this.chatInput = "";
          this.scrollToLatestMessage();
        } catch (error) {
          uni.showToast({
            title: pickDiningBuddyErrorMessage(error, "发送失败"),
            icon: "none",
          });
        } finally {
          this.sendingMessage = false;
        }
      },
      startMessagePolling() {
        this.stopMessagePolling();
        this.pollTimer = setInterval(() => {
          if (this.view === "chat" && this.activeParty?.id) {
            this.loadMessages(this.activeParty.id).catch(() => {});
          }
        }, 5000);
      },
      stopMessagePolling() {
        if (this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
      },
      handleChatBack() {
        this.stopMessagePolling();
        this.view = "home";
        this.chatInput = "";
        this.chatScrollTo = "";
        this.messages = [];
        this.activeParty = null;
      },
      scrollToLatestMessage() {
        this.$nextTick(() => {
          const latest = this.messages[this.messages.length - 1];
          this.chatScrollTo = latest ? `msg-${latest.id}` : "";
        });
      },
      getPlaceholder(field) {
        if (field === "title") {
          if (this.newParty.category === "study") return "例如：考研晚自习";
          if (this.newParty.category === "chat") return "例如：下班吐槽局";
          return "例如：火锅搭子局";
        }
        if (field === "location") {
          if (this.newParty.category === "chat") return "线上语音 / 咖啡店 / 公园";
          return "例如：万象城海底捞";
        }
        return "";
      },
      adjustPeople(delta) {
        const nextValue = Number(this.newParty.maxPeople || 4) + delta;
        if (nextValue >= 2 && nextValue <= this.maxPeopleLimit) {
          this.newParty.maxPeople = nextValue;
        }
      },
      openCreateModal() {
        if (!this.featureEnabled) {
          uni.showToast({ title: "当前服务暂未开放", icon: "none" });
          return;
        }
        this.newParty = createDefaultDiningBuddyPartyForm({
          category: this.activeCategory,
          maxPeople: this.defaultMaxPeople,
        });
        this.showCreateModal = true;
      },
      async createParty() {
        if (!this.featureEnabled) {
          uni.showToast({ title: "当前服务暂未开放", icon: "none" });
          return;
        }
        if (this.creatingParty) {
          return;
        }
        if (!this.newParty.title.trim() || !this.newParty.location.trim()) {
          uni.showToast({ title: "请填写完整信息", icon: "none" });
          return;
        }

        this.creatingParty = true;
        try {
          const party = await createDiningBuddyParty({
            category: this.newParty.category,
            title: this.newParty.title.trim(),
            location: this.newParty.location.trim(),
            time: this.newParty.time.trim(),
            description: this.newParty.description.trim(),
            maxPeople: this.newParty.maxPeople,
          });

          this.parties.unshift(party);
          this.activeCategory = party.category || this.newParty.category;
          this.showCreateModal = false;
          this.newParty = createDefaultDiningBuddyPartyForm({
            category: this.activeCategory,
            maxPeople: this.defaultMaxPeople,
          });
          uni.showToast({ title: "发布成功", icon: "success" });
        } catch (error) {
          uni.showToast({
            title: pickDiningBuddyErrorMessage(error, "发布失败"),
            icon: "none",
          });
        } finally {
          this.creatingParty = false;
        }
      },
      async submitReport(targetType, targetId, reason, description = "") {
        try {
          await createDiningBuddyReport({
            target_type: targetType,
            target_id: String(targetId || "").trim(),
            reason,
            description,
          });
          uni.showToast({ title: "举报已提交", icon: "success" });
        } catch (error) {
          uni.showToast({
            title: pickDiningBuddyErrorMessage(error, "举报失败"),
            icon: "none",
          });
        }
      },
      chooseReportReason(targetType, callback) {
        const itemMap = {
          party: ["虚假组局", "骚扰引流", "不当内容"],
          message: ["辱骂骚扰", "广告引流", "不当内容"],
          user: ["骚扰他人", "欺诈风险", "违规引流"],
        };
        const options = itemMap[targetType] || ["内容违规"];
        uni.showActionSheet({
          itemList: options,
          success: (result) => {
            const reason = options[result.tapIndex];
            if (reason && typeof callback === "function") {
              callback(reason);
            }
          },
        });
      },
      reportParty(party) {
        if (!party?.id) return;
        this.chooseReportReason("party", (reason) => {
          this.submitReport("party", party.id, reason);
        });
      },
      reportMessage(message) {
        if (!message?.id) return;
        this.chooseReportReason("message", (reason) => {
          this.submitReport("message", message.id, reason);
        });
      },
      reportUser(userId) {
        if (!userId) return;
        this.chooseReportReason("user", (reason) => {
          this.submitReport("user", userId, reason);
        });
      },
      goBackHome() {
        uni.switchTab({ url: "/pages/index/index" });
      },
    },
  };
}
