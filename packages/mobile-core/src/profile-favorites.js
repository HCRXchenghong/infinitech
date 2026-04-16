import {
  extractErrorMessage,
  extractPaginatedItems,
} from "../../contracts/src/http.js";

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
