import {
  extractEnvelopeData,
  extractErrorMessage,
  extractPaginatedItems,
} from "../../contracts/src/http.js";
import { readConsumerStoredProfile } from "./consumer-profile-storage.js";

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

export function createProfileMyReviewsPage({
  fetchUserReviews = async () => ({}),
} = {}) {
  return {
    data() {
      return {
        userId: "",
        userIdCandidates: [],
        reviews: [],
        activeFilter: DEFAULT_CONSUMER_PROFILE_REVIEW_FILTER,
        total: 0,
        avgRating: 0,
        page: 1,
        pageSize: 20,
        loading: false,
        loadingMore: false,
        finished: false,
      };
    },
    computed: {
      avgRatingDisplay() {
        return formatConsumerProfileReviewRating(this.avgRating);
      },
      withImagesCount() {
        return countConsumerProfileReviewsWithImages(this.reviews);
      },
      withReplyCount() {
        return countConsumerProfileReviewsWithReply(this.reviews);
      },
      filteredReviews() {
        return filterConsumerProfileReviews(this.reviews, this.activeFilter);
      },
    },
    onShow() {
      this.initData();
    },
    methods: {
      resolveUserIds() {
        return resolveConsumerProfileReviewUserIds({
          profile: readConsumerStoredProfile({ uniApp: uni }),
          storageUserId: uni.getStorageSync("userId"),
        });
      },
      initData() {
        const userIds = this.resolveUserIds();
        if (!userIds.length) {
          this.userId = "";
          this.userIdCandidates = [];
          this.reviews = [];
          this.total = 0;
          this.avgRating = 0;
          uni.showToast({ title: "请先登录", icon: "none" });
          return;
        }

        this.userIdCandidates = userIds;
        this.userId = userIds[0];
        void this.loadReviews(true);
      },
      async requestReviewPage(userId, page, pageSize) {
        return fetchUserReviews(
          userId,
          buildConsumerProfileReviewQuery(page, pageSize),
        );
      },
      applyReviewPayload(payload, reset) {
        const normalized = extractConsumerProfileReviewPage(payload);

        this.total = normalized.total;
        this.avgRating = normalized.avgRating;

        if (reset) {
          this.reviews = normalized.list;
        } else {
          this.reviews = this.reviews.concat(normalized.list);
        }

        const loadedCount = this.reviews.length;
        this.finished =
          normalized.list.length < this.pageSize ||
          (this.total > 0 && loadedCount >= this.total);

        if (!this.finished) {
          this.page += 1;
        }
      },
      async loadReviews(reset = false) {
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
          if (reset) {
            const candidates = this.userIdCandidates.length
              ? this.userIdCandidates
              : [this.userId];
            let selected = candidates[0];
            let selectedPayload = null;
            let firstError = null;

            for (let index = 0; index < candidates.length; index += 1) {
              const candidateId = candidates[index];

              try {
                const payload = await this.requestReviewPage(
                  candidateId,
                  this.page,
                  this.pageSize,
                );
                const normalized = extractConsumerProfileReviewPage(payload);

                selected = candidateId;
                selectedPayload = payload;

                if (
                  normalized.list.length > 0 ||
                  normalized.total > 0 ||
                  index === candidates.length - 1
                ) {
                  break;
                }
              } catch (error) {
                if (Number(error?.statusCode) === 401) {
                  throw error;
                }
                if (!firstError) {
                  firstError = error;
                }
                if (index === candidates.length - 1) {
                  throw firstError || error;
                }
              }
            }

            this.userId = selected;
            this.applyReviewPayload(selectedPayload || {}, true);
          } else {
            const payload = await this.requestReviewPage(
              this.userId,
              this.page,
              this.pageSize,
            );
            this.applyReviewPayload(payload, false);
          }
        } catch (error) {
          console.error("加载评价失败:", error);
          if (reset) {
            this.reviews = [];
            this.total = 0;
            this.avgRating = 0;
          }
          if (Number(error?.statusCode) === 401) {
            uni.showToast({ title: "登录已过期，请重新登录", icon: "none" });
            return;
          }
          uni.showToast({
            title: normalizeConsumerProfileReviewErrorMessage(error, "加载失败"),
            icon: "none",
          });
        } finally {
          this.loading = false;
          this.loadingMore = false;
        }
      },
      loadMore() {
        void this.loadReviews(false);
      },
      normalizeImages(images) {
        return normalizeConsumerProfileReviewImages(images);
      },
      hasImages(item) {
        return normalizeConsumerProfileReviewImages(item?.images).length > 0;
      },
      hasReply(item) {
        return Boolean(String(item?.reply || "").trim());
      },
      previewImage(images, index) {
        const list = normalizeConsumerProfileReviewImages(images);
        if (!list.length) return;
        uni.previewImage({ urls: list, current: list[index] || list[0] });
      },
      renderStars(rating) {
        return renderConsumerProfileReviewStars(rating);
      },
      formatRating(value) {
        return formatConsumerProfileReviewRating(value);
      },
      formatDate(value) {
        return formatConsumerProfileReviewDate(value);
      },
      goShop(shopId) {
        const url = buildConsumerProfileReviewShopPath(shopId);
        if (!url) return;
        uni.navigateTo({ url });
      },
    },
  };
}
