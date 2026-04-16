import {
  buildConsumerProfileReviewQuery,
  buildConsumerProfileReviewShopPath,
  countConsumerProfileReviewsWithImages,
  countConsumerProfileReviewsWithReply,
  DEFAULT_CONSUMER_PROFILE_REVIEW_FILTER,
  extractConsumerProfileReviewPage,
  filterConsumerProfileReviews,
  formatConsumerProfileReviewDate,
  formatConsumerProfileReviewRating,
  normalizeConsumerProfileReviewErrorMessage,
  normalizeConsumerProfileReviewImages,
  renderConsumerProfileReviewStars,
  resolveConsumerProfileReviewUserIds,
} from "../../packages/mobile-core/src/profile-my-reviews.js";

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
          profile: uni.getStorageSync("userProfile") || {},
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
