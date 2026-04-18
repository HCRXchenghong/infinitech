import { extractEnvelopeData } from "../../contracts/src/http.js";
import { createPhoneContactHelper } from "./phone-contact.js";

export function buildShopPhoneAuditPayload(shop = {}) {
  return {
    targetRole: "merchant",
    targetId: String(shop.id || ""),
    targetPhone: String(shop.phone || ""),
    entryPoint: "shop_detail",
    scene: "shop_contact",
    pagePath: "/pages/shop/detail/index",
    metadata: {
      shopId: String(shop.id || ""),
      shopName: String(shop.name || ""),
      bizType: String(shop.bizType || shop.biz_type || ""),
    },
  };
}

function normalizeShopArrayField(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }
  return [];
}

export function normalizeShopDetailPayload(source = {}) {
  const shop =
    source && typeof source === "object" && !Array.isArray(source)
      ? { ...source }
      : {};

  if (!shop.coverImage) {
    shop.coverImage = "/static/images/shop-default-cover.jpg";
  }
  if (!shop.backgroundImage) {
    shop.backgroundImage = shop.coverImage;
  }
  if (!shop.logo) {
    shop.logo = "/static/images/shop-default-logo.png";
  }
  if (shop.rating === null || shop.rating === undefined || shop.rating === "") {
    shop.rating = 0;
  }
  if (!shop.monthlySales) {
    shop.monthlySales = 0;
  }

  shop.discounts = normalizeShopArrayField(shop.discounts);
  shop.tags = normalizeShopArrayField(shop.tags);
  shop.merchantQualification =
    shop.merchantQualification ||
    shop.merchantQualificationImage ||
    shop.businessLicense ||
    shop.businessLicenseImage ||
    "";
  shop.foodBusinessLicense =
    shop.foodBusinessLicense ||
    shop.foodBusinessLicenseImage ||
    shop.foodLicense ||
    shop.foodLicenseImage ||
    "";

  return shop;
}

export function createShopDetailState() {
  return {
    shop: {},
    activeTab: "reviews",
    reviews: [],
    reviewTotal: 0,
    reviewGoodCount: 0,
    reviewBadCount: 0,
    reviewAvgRating: 0,
    reviewFilter: "all",
    isCollected: false,
    favoriteLoading: false,
    loading: true,
    activeCoupons: [],
  };
}

export const shopDetailComputed = {
  perCapita() {
    const value = Number(this.shop.perCapita);
    if (Number.isFinite(value) && value > 0) {
      return value.toFixed(0);
    }
    return "--";
  },
  reviewCount() {
    return this.reviewTotal;
  },
  goodReviewCount() {
    return this.reviewGoodCount;
  },
  badReviewCount() {
    return this.reviewBadCount;
  },
  displayRating() {
    return this.reviewAvgRating;
  },
  goodRateValue() {
    if (this.reviewTotal <= 0) {
      return 0;
    }
    return this.reviewGoodCount / this.reviewTotal;
  },
  badRateValue() {
    if (this.reviewTotal <= 0) {
      return 0;
    }
    return this.reviewBadCount / this.reviewTotal;
  },
  goodRateBarWidth() {
    const width = Math.max(0, Math.min(100, Math.round(this.goodRateValue * 100)));
    return `${width}%`;
  },
  badRateBarWidth() {
    const width = Math.max(0, Math.min(100, Math.round(this.badRateValue * 100)));
    return `${width}%`;
  },
  goodRateText() {
    return `${Math.round(this.goodRateValue * 100)}%`;
  },
  badRateText() {
    return `${Math.round(this.badRateValue * 100)}%`;
  },
  filteredReviews() {
    if (this.reviewFilter === "good") {
      return this.reviews.filter((item) => item.rating >= 4);
    }
    if (this.reviewFilter === "bad") {
      return this.reviews.filter((item) => item.rating < 3);
    }
    if (this.reviewFilter === "latest") {
      return [...this.reviews]
        .sort((left, right) => String(right.id || "").localeCompare(String(left.id || "")))
        .slice(0, 10);
    }
    return this.reviews;
  },
};

export function normalizeShopReviewImages(images) {
  if (Array.isArray(images)) {
    return images;
  }
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return images ? [images] : [];
    }
  }
  return [];
}

export function formatShopDetailRating(value) {
  return Number(value || 0).toFixed(1);
}

export function formatShopReviewTime(timeStr, now = new Date()) {
  if (!timeStr) {
    return "";
  }

  const date = new Date(timeStr);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return "今天";
  }
  if (days === 1) {
    return "昨天";
  }
  if (days < 7) {
    return `${days}天前`;
  }
  if (days < 30) {
    return `${Math.floor(days / 7)}周前`;
  }
  if (days < 365) {
    return `${Math.floor(days / 30)}个月前`;
  }
  return `${Math.floor(days / 365)}年前`;
}

export function getShopCouponAmount(coupon = {}) {
  const amount = Number(coupon.amount || 0);
  if (coupon.type === "fixed") {
    return `¥${amount.toFixed(0)}`;
  }
  return `${(100 - amount).toFixed(0)}折`;
}

export function getShopCouponDesc(coupon = {}) {
  const minAmount = Number(coupon.minAmount || 0);
  if (minAmount > 0) {
    return `满${minAmount}元`;
  }
  return "无门槛";
}

export function getShopDiscountAmount(discount = "") {
  const match = String(discount).match(/\d+/);
  return match ? match[0] : "";
}

export function getShopDiscountDesc(discount = "") {
  const text = String(discount);
  const match = text.match(/减(\d+)/);
  if (match) {
    return `减${match[1]}`;
  }
  return text.replace(/\d+/, "");
}

export function createShopDetailMethods({
  addUserFavorite,
  deleteUserFavorite,
  fetchUserFavoriteStatus,
  recordPhoneContactClick,
  request,
} = {}) {
  const phoneContactHelper = createPhoneContactHelper({ recordPhoneContactClick });

  return {
    getCurrentUserId() {
      const profile = uni.getStorageSync("userProfile") || {};
      const raw = profile.id || profile.userId;
      return String(raw || "").trim();
    },
    async loadFavoriteStatus(shopId) {
      const userId = this.getCurrentUserId();
      if (!userId || !shopId || typeof fetchUserFavoriteStatus !== "function") {
        this.isCollected = false;
        return;
      }

      try {
        const response = await fetchUserFavoriteStatus(userId, shopId);
        const payload = response && response.data ? response.data : response || {};
        this.isCollected = Boolean(
          payload.isFavorite || payload.isCollected || payload.isFavorited,
        );
      } catch (error) {
        console.error("加载收藏状态失败:", error);
        this.isCollected = false;
      }
    },
    async loadShopDetail(id) {
      if (typeof request !== "function") {
        return;
      }

      this.loading = true;
      try {
        const response = await request({
          url: `/api/shops/${id}`,
          method: "GET",
        });

        if (response && (response.id || response.data)) {
          this.shop = normalizeShopDetailPayload(response.data || response);
        } else {
          uni.showToast({ title: "商家不存在", icon: "none" });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        }
      } catch (error) {
        console.error("加载商家详情失败:", error);
        uni.showToast({ title: "加载失败，请重试", icon: "none" });
      } finally {
        this.loading = false;
      }
    },
    async loadReviews(id) {
      if (typeof request !== "function") {
        return;
      }

      try {
        const response = await request({
          url: `/api/shops/${id}/reviews`,
          method: "GET",
          data: {
            page: 1,
            pageSize: 20,
          },
        });

        const payload = response && response.data ? response.data : response || {};
        const list = Array.isArray(payload.list) ? payload.list : [];
        this.reviewTotal = Number(payload.total || list.length || 0);
        this.reviewGoodCount = Number(
          payload.goodCount ||
            list.filter((item) => Number(item.rating || 0) >= 4).length ||
            0,
        );
        this.reviewBadCount = Number(
          payload.badCount ||
            list.filter((item) => Number(item.rating || 0) < 3).length ||
            0,
        );
        const apiAvgRating = Number(payload.avgRating);
        const listAvgRating =
          list.length > 0
            ? list.reduce((sum, item) => sum + Number(item.rating || 0), 0) / list.length
            : 0;
        this.reviewAvgRating = Number(
          (Number.isFinite(apiAvgRating) ? apiAvgRating : listAvgRating).toFixed(2),
        );
        this.reviews = list.map((review) => ({
          id: review.id,
          avatar: review.userAvatar || "/static/images/default-avatar.png",
          username: review.userName || "匿名用户",
          time: formatShopReviewTime(review.created_at || review.createdAt),
          rating: Number(review.rating || 0),
          content: review.content || "",
          images: normalizeShopReviewImages(review.images),
          reply: review.reply || "",
        }));
      } catch (error) {
        console.error("加载评价失败:", error);
        this.reviewTotal = 0;
        this.reviewGoodCount = 0;
        this.reviewBadCount = 0;
        this.reviewAvgRating = 0;
        this.reviews = [];
      }
    },
    normalizeImages(images) {
      return normalizeShopReviewImages(images);
    },
    formatRating(value) {
      return formatShopDetailRating(value);
    },
    formatTime(timeStr) {
      return formatShopReviewTime(timeStr);
    },
    goBack() {
      uni.navigateBack();
    },
    goToMenu() {
      uni.navigateTo({
        url: `/pages/shop/menu/index?id=${this.shop.id}`,
      });
    },
    async loadActiveCoupons(shopId) {
      if (typeof request !== "function") {
        return;
      }

      try {
        const response = await request({
          url: `/api/shops/${shopId}/coupons/active`,
          method: "GET",
        });
        const payload = extractEnvelopeData(response);
        this.activeCoupons = Array.isArray(payload) ? payload : [];
      } catch (error) {
        console.error("加载优惠券失败:", error);
      }
    },
    async receiveCoupon(coupon) {
      if (typeof request !== "function") {
        return;
      }

      try {
        const profile = uni.getStorageSync("userProfile") || {};
        const userId = profile.phone || profile.id || profile.userId;
        if (!userId) {
          uni.showToast({ title: "请先登录", icon: "none" });
          return;
        }

        uni.showLoading({ title: "领取中..." });
        await request({
          url: `/api/coupons/${coupon.id}/receive`,
          method: "POST",
          data: { userId: String(userId) },
        });

        uni.hideLoading();
        uni.showToast({ title: "领取成功", icon: "success" });
      } catch (error) {
        uni.hideLoading();
        console.error("领取优惠券失败:", error);
        uni.showToast({
          title: error?.error || error?.data?.error || "领取失败",
          icon: "none",
        });
      }
    },
    getCouponAmount(coupon) {
      return getShopCouponAmount(coupon);
    },
    getCouponDesc(coupon) {
      return getShopCouponDesc(coupon);
    },
    getDiscountAmount(discount) {
      return getShopDiscountAmount(discount);
    },
    getDiscountDesc(discount) {
      return getShopDiscountDesc(discount);
    },
    callPhone() {
      if (!this.shop.phone) {
        return;
      }

      phoneContactHelper
        .makePhoneCall(buildShopPhoneAuditPayload(this.shop))
        .catch(() => {
          uni.showToast({ title: "无法拨打电话，请稍后重试", icon: "none" });
        });
    },
    previewLicense(type) {
      const imageUrl =
        type === "foodBusinessLicense"
          ? this.shop.foodBusinessLicense
          : this.shop.merchantQualification;
      if (!imageUrl) {
        uni.showToast({ title: "暂未上传证照", icon: "none" });
        return;
      }

      uni.previewImage({
        current: imageUrl,
        urls: [imageUrl],
      });
    },
    async toggleCollect() {
      if (this.favoriteLoading) {
        return;
      }

      const shopId = String(this.shop.id || "").trim();
      if (!shopId) {
        return;
      }

      const userId = this.getCurrentUserId();
      if (!userId) {
        uni.showToast({ title: "请先登录", icon: "none" });
        return;
      }

      if (
        typeof addUserFavorite !== "function" ||
        typeof deleteUserFavorite !== "function"
      ) {
        uni.showToast({ title: "操作失败", icon: "none" });
        return;
      }

      this.favoriteLoading = true;
      try {
        if (this.isCollected) {
          await deleteUserFavorite(userId, shopId);
          this.isCollected = false;
          uni.showToast({ title: "已取消收藏", icon: "none" });
        } else {
          await addUserFavorite(userId, shopId);
          this.isCollected = true;
          uni.showToast({ title: "已收藏", icon: "none" });
        }
      } catch (error) {
        console.error("收藏操作失败:", error);
        uni.showToast({ title: error?.error || "操作失败", icon: "none" });
      } finally {
        this.favoriteLoading = false;
      }
    },
  };
}

export function createShopDetailPageOptions(options = {}) {
  return {
    data() {
      return createShopDetailState();
    },
    computed: shopDetailComputed,
    onLoad(query) {
      const id = String((query && query.id) || "").trim();
      if (!id) {
        uni.showToast({ title: "店铺ID无效", icon: "none" });
        return;
      }

      this.loadShopDetail(id);
      this.loadReviews(id);
      this.loadActiveCoupons(id);
      this.loadFavoriteStatus(id);
    },
    methods: createShopDetailMethods(options),
  };
}
