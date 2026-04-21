import {
  extractErrorMessage,
  extractPaginatedItems,
} from "../../contracts/src/http.js";
import { readConsumerStoredProfile } from "./consumer-profile-storage.js";

function trimProfileFavoritesText(value) {
  return String(value || "").trim();
}

function normalizeProfileFavoritesNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

export function resolveConsumerProfileFavoritesUserId(profile = {}) {
  return trimProfileFavoritesText(profile.id || profile.userId || profile.phone);
}

export function buildConsumerProfileFavoritesQuery(page = 1, pageSize = 20) {
  return {
    page: Math.max(1, normalizeProfileFavoritesNumber(page, 1)),
    pageSize: Math.max(1, normalizeProfileFavoritesNumber(pageSize, 20)),
  };
}

export function normalizeConsumerProfileFavoriteItem(item = {}, index = 0, page = 1) {
  const source =
    item && typeof item === "object" && !Array.isArray(item) ? item : {};
  const fallbackId = `${page}_${index}`;
  return {
    ...source,
    favoriteId:
      trimProfileFavoritesText(source.favoriteId) ||
      trimProfileFavoritesText(source.id) ||
      fallbackId,
    id: trimProfileFavoritesText(source.id),
    name: trimProfileFavoritesText(source.name) || "未知商家",
    logo: trimProfileFavoritesText(source.logo),
    coverImage: trimProfileFavoritesText(source.coverImage),
    rating: normalizeProfileFavoritesNumber(source.rating),
    monthlySales: normalizeProfileFavoritesNumber(source.monthlySales),
    minPrice: normalizeProfileFavoritesNumber(source.minPrice),
    deliveryPrice: normalizeProfileFavoritesNumber(source.deliveryPrice),
  };
}

export function extractConsumerProfileFavoritesPage(payload, page = 1) {
  const pageData = extractPaginatedItems(payload, {
    listKeys: ["list", "items", "records", "favorites"],
  });
  return {
    list: pageData.items.map((item, index) =>
      normalizeConsumerProfileFavoriteItem(item, index, page),
    ),
    total: Math.max(0, normalizeProfileFavoritesNumber(pageData.total)),
  };
}

export function formatConsumerProfileFavoriteRating(value) {
  return normalizeProfileFavoritesNumber(value).toFixed(1);
}

export function formatConsumerProfileFavoriteMoney(value) {
  return normalizeProfileFavoritesNumber(value).toFixed(1);
}

export function buildConsumerProfileFavoriteShopPath(shopId = "") {
  const id = trimProfileFavoritesText(shopId);
  if (!id) return "";
  return `/pages/shop/detail/index?id=${encodeURIComponent(id)}`;
}

export function normalizeConsumerProfileFavoritesErrorMessage(
  error,
  fallback = "加载失败",
) {
  return extractErrorMessage(error, fallback);
}

export function createProfileFavoritesPage({
  deleteUserFavorite = async () => ({}),
  fetchUserFavorites = async () => ({}),
} = {}) {
  return {
    data() {
      return {
        userId: "",
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        loading: false,
        loadingMore: false,
        finished: false,
      };
    },
    onShow() {
      this.initData();
    },
    methods: {
      resolveUserId() {
        return resolveConsumerProfileFavoritesUserId(
          readConsumerStoredProfile({ uniApp: uni }),
        );
      },
      initData() {
        const userId = this.resolveUserId();
        if (!userId) {
          this.userId = "";
          this.items = [];
          this.total = 0;
          uni.showToast({ title: "请先登录", icon: "none" });
          return;
        }
        this.userId = userId;
        void this.loadFavorites(true);
      },
      async loadFavorites(reset = false) {
        if (!this.userId) return;
        if (this.loading || this.loadingMore) return;
        if (!reset && this.finished) return;

        if (reset) {
          this.loading = true;
          this.page = 1;
          this.finished = false;
        } else {
          this.loadingMore = true;
        }

        try {
          const response = await fetchUserFavorites(
            this.userId,
            buildConsumerProfileFavoritesQuery(this.page, this.pageSize),
          );
          const normalized = extractConsumerProfileFavoritesPage(
            response,
            this.page,
          );
          this.total = normalized.total;

          if (reset) {
            this.items = normalized.list;
          } else {
            this.items = this.items.concat(normalized.list);
          }

          const loadedCount = this.items.length;
          this.finished =
            normalized.list.length < this.pageSize ||
            (this.total > 0 && loadedCount >= this.total);
          if (!this.finished) {
            this.page += 1;
          }
        } catch (error) {
          console.error("加载收藏失败:", error);
          if (reset) {
            this.items = [];
            this.total = 0;
          }
          uni.showToast({
            title: normalizeConsumerProfileFavoritesErrorMessage(
              error,
              "加载失败",
            ),
            icon: "none",
          });
        } finally {
          this.loading = false;
          this.loadingMore = false;
        }
      },
      loadMore() {
        void this.loadFavorites(false);
      },
      async removeFavorite(item) {
        const shopId = String(item?.id || "").trim();
        if (!this.userId || !shopId) return;

        try {
          await deleteUserFavorite(this.userId, shopId);
          this.items = this.items.filter((value) => String(value.id || "") !== shopId);
          this.total = Math.max(0, this.total - 1);
          uni.showToast({ title: "已取消收藏", icon: "none" });
        } catch (error) {
          console.error("取消收藏失败:", error);
          uni.showToast({
            title: normalizeConsumerProfileFavoritesErrorMessage(
              error,
              "操作失败",
            ),
            icon: "none",
          });
        }
      },
      goShop(shopId) {
        const url = buildConsumerProfileFavoriteShopPath(shopId);
        if (!url) return;
        uni.navigateTo({ url });
      },
      formatRating(value) {
        return formatConsumerProfileFavoriteRating(value);
      },
      formatMoney(value) {
        return formatConsumerProfileFavoriteMoney(value);
      },
    },
  };
}
