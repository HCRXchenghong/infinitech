export const SEARCH_HISTORY_KEY = "searchHistory";

export const DEFAULT_HOT_SEARCH_KEYWORDS = [
  "奶茶",
  "汉堡",
  "火锅",
  "咖啡",
  "烧烤",
  "水果",
  "便利店",
  "药店",
];

export function trimSearchValue(value) {
  return String(value || "").trim();
}

export function createDefaultHotSearchKeywords() {
  return [...DEFAULT_HOT_SEARCH_KEYWORDS];
}

export function normalizeSearchHistory(history, limit = 10) {
  if (!Array.isArray(history)) {
    return [];
  }

  const seen = new Set();
  return history
    .map((item) => trimSearchValue(item))
    .filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    })
    .slice(0, Math.max(1, Number(limit) || 10));
}

export function buildSearchHistory(keyword, history = [], limit = 10) {
  return normalizeSearchHistory(
    [trimSearchValue(keyword), ...normalizeSearchHistory(history, limit)],
    limit,
  );
}

export function normalizeSearchShopList(response) {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && Array.isArray(response.data)) {
    return response.data;
  }
  if (response && Array.isArray(response.shops)) {
    return response.shops;
  }
  return [];
}

export function normalizeSearchShopTags(shop) {
  if (Array.isArray(shop?.tags)) {
    return shop.tags.filter(Boolean).slice(0, 3);
  }
  if (typeof shop?.tags === "string" && shop.tags.trim()) {
    return shop.tags
      .split(/[、，,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
  }
  return [];
}

export function filterSearchShopsByKeyword(shops = [], keyword = "") {
  const needle = trimSearchValue(keyword).toLowerCase();
  if (!needle) {
    return [];
  }

  return (Array.isArray(shops) ? shops : []).filter((shop) => {
    const tags = normalizeSearchShopTags(shop).join(" ");
    const source = [
      shop?.name || "",
      shop?.category || "",
      shop?.description || "",
      tags,
    ]
      .join(" ")
      .toLowerCase();
    return source.includes(needle);
  });
}

export function getSearchShopInitial(name) {
  const text = trimSearchValue(name);
  if (!text) {
    return "店铺";
  }
  return text.slice(0, 2);
}

export function formatSearchShopRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating <= 0) {
    return "暂无评分";
  }
  return `评分 ${rating.toFixed(1)}`;
}

export function formatSearchShopSales(value) {
  const sales = Number(value);
  if (!Number.isFinite(sales) || sales < 0) {
    return "暂无销量";
  }
  return `月售 ${sales}`;
}

export function formatSearchShopDistance(value) {
  return trimSearchValue(value) || "距离未知";
}

export function createSearchPage(options = {}) {
  const { fetchShops = async () => [] } = options;

  return {
    data() {
      return {
        keyword: "",
        searchHistory: [],
        hotKeywords: createDefaultHotSearchKeywords(),
        searchResults: [],
        searching: false,
        allShops: [],
      };
    },
    onLoad() {
      this.searchHistory = normalizeSearchHistory(
        uni.getStorageSync(SEARCH_HISTORY_KEY),
      );
      this.loadShops();
    },
    methods: {
      async loadShops() {
        try {
          const response = await fetchShops();
          this.allShops = normalizeSearchShopList(response);
          if (trimSearchValue(this.keyword)) {
            this.doSearch();
          }
        } catch (error) {
          console.error("加载商家列表失败:", error);
          this.allShops = [];
        }
      },
      onInput(event) {
        this.keyword = event?.detail?.value || "";
        if (trimSearchValue(this.keyword)) {
          this.doSearch();
        } else {
          this.searchResults = [];
          this.searching = false;
        }
      },
      doSearch() {
        const keyword = trimSearchValue(this.keyword);
        if (!keyword) {
          this.searchResults = [];
          this.searching = false;
          return;
        }

        this.searching = true;
        this.searchResults = filterSearchShopsByKeyword(this.allShops, keyword);
        this.searching = false;
        this.persistHistory(keyword);
      },
      persistHistory(keyword) {
        if (!trimSearchValue(keyword)) {
          return;
        }
        const nextHistory = buildSearchHistory(keyword, this.searchHistory);
        this.searchHistory = nextHistory;
        uni.setStorageSync(SEARCH_HISTORY_KEY, nextHistory);
      },
      clearKeyword() {
        this.keyword = "";
        this.searchResults = [];
        this.searching = false;
      },
      cancel() {
        uni.navigateBack();
      },
      clearHistory() {
        this.searchHistory = [];
        uni.removeStorageSync(SEARCH_HISTORY_KEY);
      },
      searchByHistory(keyword) {
        this.keyword = trimSearchValue(keyword);
        this.doSearch();
      },
      goShopDetail(id) {
        if (!id) {
          uni.showToast({ title: "商家信息异常", icon: "none" });
          return;
        }
        uni.navigateTo({ url: `/pages/shop/detail/index?id=${id}` });
      },
      normalizeTags(shop) {
        return normalizeSearchShopTags(shop);
      },
      getShopInitial(name) {
        return getSearchShopInitial(name);
      },
      formatRating(value) {
        return formatSearchShopRating(value);
      },
      formatSales(value) {
        return formatSearchShopSales(value);
      },
      formatDistance(value) {
        return formatSearchShopDistance(value);
      },
    },
  };
}
