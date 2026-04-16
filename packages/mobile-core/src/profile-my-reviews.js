import {
  extractEnvelopeData,
  extractErrorMessage,
  extractPaginatedItems,
} from "../../contracts/src/http.js";

function trimProfileReviewText(value) {
  return String(value || "").trim();
}

function normalizeProfileReviewNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function dedupeProfileReviewValues(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => trimProfileReviewText(value))
        .filter((value) => value),
    ),
  );
}

export const DEFAULT_CONSUMER_PROFILE_REVIEW_FILTER = "all";

export function resolveConsumerProfileReviewUserIds({
  profile = {},
  storageUserId = "",
} = {}) {
  return dedupeProfileReviewValues([
    profile?.id,
    profile?.userId,
    profile?.phone,
    storageUserId,
  ]);
}

export function buildConsumerProfileReviewQuery(page = 1, pageSize = 20) {
  return {
    page: Math.max(1, normalizeProfileReviewNumber(page, 1)),
    pageSize: Math.max(1, normalizeProfileReviewNumber(pageSize, 20)),
  };
}

export function normalizeConsumerProfileReviewImages(images) {
  if (Array.isArray(images)) {
    return images
      .map((item) => trimProfileReviewText(item))
      .filter((item) => item);
  }

  if (typeof images === "string") {
    const raw = images.trim();
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed
            .map((item) => trimProfileReviewText(item))
            .filter((item) => item)
        : [raw];
    } catch (error) {
      return [raw];
    }
  }

  return [];
}

export function hasConsumerProfileReviewImages(item = {}) {
  return normalizeConsumerProfileReviewImages(item.images).length > 0;
}

export function hasConsumerProfileReviewReply(item = {}) {
  return Boolean(trimProfileReviewText(item.reply));
}

export function normalizeConsumerProfileReviewItem(item = {}, index = 0) {
  const source =
    item && typeof item === "object" && !Array.isArray(item) ? item : {};
  const normalizedImages = normalizeConsumerProfileReviewImages(source.images);
  const createdAt =
    trimProfileReviewText(source.createdAt) ||
    trimProfileReviewText(source.created_at);

  return {
    id:
      trimProfileReviewText(source.id) ||
      trimProfileReviewText(source.reviewId) ||
      trimProfileReviewText(source.orderId) ||
      `review_${index}`,
    shopId:
      trimProfileReviewText(source.shopId) ||
      trimProfileReviewText(source.shop_id),
    shopName: trimProfileReviewText(source.shopName || source.shop_name) || "商家",
    shopLogo: trimProfileReviewText(source.shopLogo || source.shop_logo),
    shopCoverImage: trimProfileReviewText(
      source.shopCoverImage || source.shop_cover_image,
    ),
    content: trimProfileReviewText(source.content) || "未填写文字评价",
    reply: trimProfileReviewText(source.reply),
    rating: Math.max(0, normalizeProfileReviewNumber(source.rating)),
    images: normalizedImages,
    createdAt,
    created_at: createdAt,
  };
}

export function extractConsumerProfileReviewPage(payload) {
  const pageData = extractPaginatedItems(payload, {
    listKeys: ["list", "items", "records", "reviews"],
  });
  const data = extractEnvelopeData(payload);

  return {
    list: pageData.items.map((item, index) =>
      normalizeConsumerProfileReviewItem(item, index),
    ),
    total: Math.max(0, normalizeProfileReviewNumber(pageData.total)),
    avgRating: Math.max(
      0,
      normalizeProfileReviewNumber(
        data?.avgRating ?? data?.averageRating ?? payload?.avgRating,
      ),
    ),
  };
}

export function filterConsumerProfileReviews(
  reviews = [],
  filter = DEFAULT_CONSUMER_PROFILE_REVIEW_FILTER,
) {
  if (filter === "with_images") {
    return reviews.filter((item) => hasConsumerProfileReviewImages(item));
  }
  if (filter === "with_reply") {
    return reviews.filter((item) => hasConsumerProfileReviewReply(item));
  }
  return reviews;
}

export function countConsumerProfileReviewsWithImages(reviews = []) {
  return filterConsumerProfileReviews(reviews, "with_images").length;
}

export function countConsumerProfileReviewsWithReply(reviews = []) {
  return filterConsumerProfileReviews(reviews, "with_reply").length;
}

export function formatConsumerProfileReviewRating(value) {
  return normalizeProfileReviewNumber(value).toFixed(1);
}

export function renderConsumerProfileReviewStars(rating) {
  const score = Math.max(0, Math.min(5, Math.round(Number(rating || 0))));
  return `${"★".repeat(score)}${"☆".repeat(5 - score)}`;
}

export function formatConsumerProfileReviewDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return trimProfileReviewText(value);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildConsumerProfileReviewShopPath(shopId = "") {
  const normalized = trimProfileReviewText(shopId);
  if (!normalized) {
    return "";
  }
  return `/pages/shop/detail/index?id=${encodeURIComponent(normalized)}`;
}

export function normalizeConsumerProfileReviewErrorMessage(
  error,
  fallback = "加载失败",
) {
  return extractErrorMessage(error, fallback);
}
