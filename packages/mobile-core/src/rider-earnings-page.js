function trimRiderEarningsText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeRiderEarningsNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function padRiderEarningsValue(value) {
  return String(value).padStart(2, "0");
}

function pickRiderEarningsValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    return value;
  }
  return "";
}

export function formatRiderEarningsCents(value) {
  return (normalizeRiderEarningsNumber(value, 0) / 100).toFixed(2);
}

export function parseRiderEarningsDate(value) {
  const text = trimRiderEarningsText(value);
  if (!text) {
    return null;
  }

  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const fallback = new Date(text.replace(/-/g, "/"));
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function formatRiderEarningsTime(value) {
  const date = parseRiderEarningsDate(value);
  if (!date) {
    return "--:--";
  }
  return `${padRiderEarningsValue(date.getHours())}:${padRiderEarningsValue(
    date.getMinutes(),
  )}`;
}

export function formatRiderEarningsDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getFullYear()}-${padRiderEarningsValue(
    date.getMonth() + 1,
  )}-${padRiderEarningsValue(date.getDate())}`;
}

export function formatRiderEarningsDateHeader(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  const weekMap = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${padRiderEarningsValue(date.getMonth() + 1)}月${padRiderEarningsValue(
    date.getDate(),
  )}日 ${weekMap[date.getDay()]}`;
}

export function createRiderEarningsMonthValue(now = new Date()) {
  const date = now instanceof Date && !Number.isNaN(now.getTime())
    ? now
    : new Date();
  return `${date.getFullYear()}-${padRiderEarningsValue(date.getMonth() + 1)}`;
}

export function formatRiderEarningsMonthLabel(value) {
  const match = trimRiderEarningsText(value).match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return trimRiderEarningsText(value);
  }
  return `${match[1]}年${match[2]}月`;
}

export function extractRiderEarningsSummary(payload = {}) {
  const source =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};
  const data =
    source.data && typeof source.data === "object" && !Array.isArray(source.data)
      ? source.data
      : {};
  const summary =
    source.summary && typeof source.summary === "object" && !Array.isArray(source.summary)
      ? source.summary
      : data.summary && typeof data.summary === "object" && !Array.isArray(data.summary)
        ? data.summary
        : {};

  return {
    totalIncome: normalizeRiderEarningsNumber(
      summary.totalIncome ?? summary.total_income,
      0,
    ),
    orderCount: normalizeRiderEarningsNumber(
      summary.orderCount ?? summary.order_count,
      0,
    ),
  };
}

export function extractRiderEarningsItems(payload = {}) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const source =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};
  const data =
    source.data && typeof source.data === "object" && !Array.isArray(source.data)
      ? source.data
      : {};

  if (Array.isArray(source.items)) {
    return source.items;
  }
  if (Array.isArray(data.items)) {
    return data.items;
  }
  if (Array.isArray(data.data?.items)) {
    return data.data.items;
  }
  return [];
}

export function buildRiderEarningsList(items = []) {
  const grouped = {};

  (Array.isArray(items) ? items : []).forEach((row) => {
    const source = row && typeof row === "object" ? row : {};
    const createdAtRaw = pickRiderEarningsValue(
      source.createdAt,
      source.created_at,
      source.created,
    );
    const createdAt = parseRiderEarningsDate(createdAtRaw);
    if (!createdAt) {
      return;
    }

    const dateKey = formatRiderEarningsDateKey(createdAt);
    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: formatRiderEarningsDateHeader(createdAt),
        totalCents: 0,
        logs: [],
        sortAt: createdAt.getTime(),
      };
    }

    const amountCents = normalizeRiderEarningsNumber(source.amount, 0);
    const status = trimRiderEarningsText(source.status).toLowerCase();
    const availableAt = pickRiderEarningsValue(
      source.availableAt,
      source.available_at,
    );
    const subtitle =
      status === "pending"
        ? availableAt
          ? `冻结中，预计 ${formatRiderEarningsTime(availableAt)} 入账`
          : "冻结中，24小时后自动入账"
        : "已入账";
    const shopName = trimRiderEarningsText(source.shopName || source.shop_name);

    grouped[dateKey].totalCents += amountCents;
    grouped[dateKey].sortAt = Math.max(grouped[dateKey].sortAt, createdAt.getTime());
    grouped[dateKey].logs.push({
      type: status === "pending" ? "pending" : "delivery",
      title: source.title || (shopName ? `配送费 - ${shopName}` : "订单收入"),
      time: formatRiderEarningsTime(createdAtRaw),
      subtitle,
      amount: formatRiderEarningsCents(amountCents),
      sortAt: createdAt.getTime(),
    });
  });

  return Object.values(grouped)
    .map((item) => ({
      date: item.date,
      total: formatRiderEarningsCents(item.totalCents),
      logs: item.logs.sort((a, b) => b.sortAt - a.sortAt),
      sortAt: item.sortAt,
    }))
    .sort((a, b) => b.sortAt - a.sortAt);
}

export function normalizeRiderEarningsPagePayload(payload = {}) {
  const summary = extractRiderEarningsSummary(payload);
  const items = extractRiderEarningsItems(payload);
  return {
    monthlyTotal: formatRiderEarningsCents(summary.totalIncome),
    monthlyOrders: summary.orderCount || items.length,
    earningsList: buildRiderEarningsList(items),
  };
}

export function createRiderEarningsPageLogic(options = {}) {
  const {
    fetchEarnings,
    nowFn,
  } = options;

  return {
    data() {
      const now = typeof nowFn === "function" ? nowFn() : new Date();
      return {
        monthValue: createRiderEarningsMonthValue(now),
        monthlyTotal: "0.00",
        monthlyOrders: 0,
        earningsList: [],
        loading: false,
        errorText: "",
      };
    },
    computed: {
      monthLabel() {
        return formatRiderEarningsMonthLabel(this.monthValue);
      },
    },
    onShow() {
      void this.loadEarnings();
    },
    methods: {
      onMonthChange(event) {
        const value = trimRiderEarningsText(event?.detail?.value);
        if (!value) {
          return;
        }
        this.monthValue = value;
        void this.loadEarnings();
      },
      applyEarningsPayload(payload) {
        const next = normalizeRiderEarningsPagePayload(payload);
        this.monthlyTotal = next.monthlyTotal;
        this.monthlyOrders = next.monthlyOrders;
        this.earningsList = next.earningsList;
      },
      async loadEarnings() {
        this.loading = true;
        this.errorText = "";
        try {
          if (typeof fetchEarnings !== "function") {
            this.applyEarningsPayload({});
            return;
          }

          const response = await fetchEarnings({
            month: this.monthValue,
            page: 1,
            limit: 300,
          });
          this.applyEarningsPayload(response);
        } catch (error) {
          this.monthlyTotal = "0.00";
          this.monthlyOrders = 0;
          this.earningsList = [];
          this.errorText = (error && error.error) || "收入明细加载失败";
        } finally {
          this.loading = false;
        }
      },
    },
  };
}
