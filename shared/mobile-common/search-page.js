import {
  buildSearchHistory,
  createDefaultHotSearchKeywords,
  filterSearchShopsByKeyword,
  formatSearchShopDistance,
  formatSearchShopRating,
  formatSearchShopSales,
  getSearchShopInitial,
  normalizeSearchHistory,
  normalizeSearchShopList,
  normalizeSearchShopTags,
  SEARCH_HISTORY_KEY,
  trimSearchValue,
} from "../../packages/mobile-core/src/search-page.js";

export function createSearchPage({
  fetchShops = async () => [],
} = {}) {
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
