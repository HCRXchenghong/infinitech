function cloneRiderDataStatsPresets() {
  return [
    {
      label: "今日",
      stats: {
        totalEarnings: "286.50",
        totalOrders: 18,
        avgPrice: "15.9",
        onlineHours: 9.5,
        hourlyEarnings: "30.2",
        onTimeRate: 98,
        goodRate: 100,
        avgDeliveryTime: 25,
        timeoutCount: 1,
      },
      chartData: [
        { label: "09", value: 18, percent: 24 },
        { label: "11", value: 32, percent: 43 },
        { label: "13", value: 48, percent: 64 },
        { label: "15", value: 56, percent: 75 },
        { label: "17", value: 68, percent: 91 },
        { label: "19", value: 75, percent: 100 },
        { label: "21", value: 52, percent: 69 },
      ],
    },
    {
      label: "本周",
      stats: {
        totalEarnings: "2856.50",
        totalOrders: 186,
        avgPrice: "15.4",
        onlineHours: 56.5,
        hourlyEarnings: "50.6",
        onTimeRate: 98,
        goodRate: 100,
        avgDeliveryTime: 25,
        timeoutCount: 3,
      },
      chartData: [
        { label: "周一", value: 286, percent: 55 },
        { label: "周二", value: 352, percent: 68 },
        { label: "周三", value: 428, percent: 82 },
        { label: "周四", value: 468, percent: 90 },
        { label: "周五", value: 392, percent: 75 },
        { label: "周六", value: 520, percent: 100 },
        { label: "周日", value: 410, percent: 79 },
      ],
    },
    {
      label: "本月",
      stats: {
        totalEarnings: "11580.00",
        totalOrders: 742,
        avgPrice: "15.6",
        onlineHours: 216.0,
        hourlyEarnings: "53.6",
        onTimeRate: 97,
        goodRate: 99,
        avgDeliveryTime: 24,
        timeoutCount: 11,
      },
      chartData: [
        { label: "第1周", value: 2580, percent: 72 },
        { label: "第2周", value: 2860, percent: 80 },
        { label: "第3周", value: 3220, percent: 90 },
        { label: "第4周", value: 3580, percent: 100 },
      ],
    },
  ];
}

function cloneRiderDataStatsCollection(list = []) {
  return (Array.isArray(list) ? list : []).map((item) => ({
    ...item,
  }));
}

function cloneRiderDataStatsPreset(preset) {
  const source = preset && typeof preset === "object" ? preset : {};
  return {
    label: String(source.label || ""),
    stats: {
      ...(source.stats && typeof source.stats === "object" ? source.stats : {}),
    },
    chartData: cloneRiderDataStatsCollection(source.chartData),
  };
}

export const DEFAULT_RIDER_DATA_STATS_TABS = Object.freeze(["今日", "本周", "本月"]);
export const DEFAULT_RIDER_DATA_STATS_PRESETS = Object.freeze(
  cloneRiderDataStatsPresets(),
);

export function resolveRiderDataStatsPreset(index) {
  const numericIndex = Number(index);
  const presets = cloneRiderDataStatsPresets();
  if (!Number.isInteger(numericIndex) || numericIndex < 0 || numericIndex >= presets.length) {
    return cloneRiderDataStatsPreset(presets[0]);
  }
  return cloneRiderDataStatsPreset(presets[numericIndex]);
}

export function createRiderDataStatsPageLogic() {
  const initialPreset = resolveRiderDataStatsPreset(0);

  return {
    data() {
      return {
        currentTab: 0,
        timeTabs: [...DEFAULT_RIDER_DATA_STATS_TABS],
        stats: {
          ...initialPreset.stats,
        },
        chartData: cloneRiderDataStatsCollection(initialPreset.chartData),
      };
    },
    methods: {
      selectTab(index) {
        const numericIndex = Number(index);
        if (!Number.isInteger(numericIndex) || numericIndex < 0 || numericIndex >= DEFAULT_RIDER_DATA_STATS_TABS.length) {
          return;
        }

        const preset = resolveRiderDataStatsPreset(numericIndex);
        this.currentTab = numericIndex;
        this.stats = {
          ...preset.stats,
        };
        this.chartData = cloneRiderDataStatsCollection(preset.chartData);
      },
    },
  };
}
