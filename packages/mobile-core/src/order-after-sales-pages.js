import {
  AFTER_SALES_REFUND_TYPES,
  buildAfterSalesSelectedProducts,
  buildOrderReviewChatUrl,
  buildRiderReviewPayload,
  buildShopReviewPayload,
  createDefaultAfterSalesOrder,
  createDefaultOrderReviewDraft,
  createDefaultOrderReviewOrder,
  formatAfterSalesPrice,
  hasOrderReviewRider,
  isAfterSalesPhoneValid,
  normalizeAfterSalesMoneyInput,
  normalizeAfterSalesOrder,
  normalizeOrderReviewOrder,
  pickAfterSalesErrorMessage,
  pickOrderReviewErrorMessage,
  yuanToFen,
} from "./order-after-sales.js";

export function createOrderRefundPage(options = {}) {
  const {
    fetchOrderDetail = async () => ({}),
    createAfterSales = async () => ({}),
    uploadAfterSalesEvidence = async () => ({}),
    SuccessModal,
  } = options;

  return {
    components: {
      SuccessModal,
    },
    data() {
      return {
        order: createDefaultAfterSalesOrder(),
        refundTypes: AFTER_SALES_REFUND_TYPES.map((item) => ({ ...item })),
        selectedType: "refund",
        selectedProducts: [],
        problemDesc: "",
        requestedRefundAmountYuan: "",
        uploadedImages: [],
        contactPhone: "",
        showSuccessModal: false,
        submitting: false,
      };
    },
    onLoad(query = {}) {
      const profile = uni.getStorageSync("userProfile") || {};
      if (profile.phone) {
        this.contactPhone = String(profile.phone);
      }

      const id = query.id;
      if (!id) {
        uni.showToast({ title: "订单ID不存在", icon: "none" });
        return;
      }

      fetchOrderDetail(id)
        .then((data) => {
          if (data && data.id) {
            this.order = normalizeAfterSalesOrder(data);
            if (
              this.order.bizType === "groupbuy" &&
              this.order.status === "redeemed"
            ) {
              uni.showToast({
                title: "该团购券已核销，仅商户可发起退款",
                icon: "none",
              });
              setTimeout(() => this.back(), 1200);
              return;
            }
            if (
              !this.requestedRefundAmountYuan &&
              Number(this.order.totalPrice || 0) > 0
            ) {
              this.requestedRefundAmountYuan = this.order.totalPrice.toFixed(2);
            }
            if (Array.isArray(this.order.productList)) {
              this.selectedProducts = this.order.productList.map(
                (_item, idx) => idx,
              );
            }
            return;
          }
          uni.showToast({ title: "订单不存在", icon: "none" });
        })
        .catch((error) => {
          console.error("加载订单详情失败:", error);
          uni.showToast({ title: "加载失败", icon: "none" });
        });
    },
    methods: {
      selectType(type) {
        this.selectedType = type;
        if (type === "exchange") {
          this.requestedRefundAmountYuan = "";
        } else if (
          !this.requestedRefundAmountYuan &&
          Number(this.order.totalPrice || 0) > 0
        ) {
          this.requestedRefundAmountYuan = this.order.totalPrice.toFixed(2);
        }
      },
      toggleProduct(idx) {
        const index = this.selectedProducts.indexOf(idx);
        if (index > -1) {
          this.selectedProducts.splice(index, 1);
        } else {
          this.selectedProducts.push(idx);
        }
      },
      chooseImage() {
        uni.chooseImage({
          count: 3 - this.uploadedImages.length,
          sizeType: ["compressed"],
          sourceType: ["album", "camera"],
          success: (res) => {
            this.uploadedImages = this.uploadedImages.concat(
              res.tempFilePaths || [],
            );
          },
        });
      },
      deleteImage(idx) {
        this.uploadedImages.splice(idx, 1);
      },
      formatPrice(price) {
        return formatAfterSalesPrice(price);
      },
      onRefundAmountInput(event) {
        const value = event?.detail?.value || this.requestedRefundAmountYuan;
        const normalized = normalizeAfterSalesMoneyInput(value);
        if (normalized !== this.requestedRefundAmountYuan) {
          this.requestedRefundAmountYuan = normalized;
        }
      },
      buildSelectedProducts() {
        return buildAfterSalesSelectedProducts(
          this.order.productList,
          this.selectedProducts,
        );
      },
      async uploadEvidenceImages() {
        if (
          !Array.isArray(this.uploadedImages) ||
          this.uploadedImages.length === 0
        ) {
          return [];
        }
        const urls = [];
        for (const filePath of this.uploadedImages) {
          if (!filePath) {
            continue;
          }
          if (/^https?:\/\//i.test(filePath)) {
            urls.push(filePath);
            continue;
          }
          const uploadResult = await uploadAfterSalesEvidence(filePath);
          if (uploadResult && uploadResult.url) {
            urls.push(uploadResult.url);
          }
        }
        return urls;
      },
      async handleSubmit() {
        if (this.submitting) {
          return;
        }
        if (
          this.order.bizType === "groupbuy" &&
          this.order.status === "redeemed"
        ) {
          uni.showToast({
            title: "该团购券已核销，仅商户可发起退款",
            icon: "none",
          });
          return;
        }
        if (this.selectedProducts.length === 0) {
          uni.showToast({ title: "请选择要申请售后的商品", icon: "none" });
          return;
        }
        if (!String(this.problemDesc || "").trim()) {
          uni.showToast({ title: "请描述遇到的问题", icon: "none" });
          return;
        }
        if (!isAfterSalesPhoneValid(this.contactPhone)) {
          uni.showToast({ title: "请输入正确的手机号", icon: "none" });
          return;
        }
        const requestedRefundAmount =
          this.selectedType === "exchange"
            ? 0
            : yuanToFen(this.requestedRefundAmountYuan);
        if (this.selectedType !== "exchange" && requestedRefundAmount <= 0) {
          uni.showToast({ title: "请填写有效的退款金额", icon: "none" });
          return;
        }

        const profile = uni.getStorageSync("userProfile") || {};
        const userId = String(
          profile.phone || profile.id || profile.userId || "",
        ).trim();
        if (!userId) {
          uni.showToast({ title: "用户信息异常，请重新登录", icon: "none" });
          return;
        }
        if (!this.order.id) {
          uni.showToast({ title: "订单信息异常", icon: "none" });
          return;
        }

        this.submitting = true;
        uni.showLoading({ title: "提交中..." });
        try {
          const evidenceImages = await this.uploadEvidenceImages();
          await createAfterSales({
            orderId: String(this.order.id),
            userId,
            type: this.selectedType,
            selectedProducts: this.buildSelectedProducts(),
            problemDesc: String(this.problemDesc || "").trim(),
            contactPhone: this.contactPhone,
            requestedRefundAmount,
            evidenceImages,
          });
          this.showSuccessModal = true;
        } catch (error) {
          console.error("提交售后申请失败:", error);
          uni.showToast({
            title: pickAfterSalesErrorMessage(error),
            icon: "none",
          });
        } finally {
          uni.hideLoading();
          this.submitting = false;
        }
      },
      handleSuccessConfirm() {
        uni.switchTab({
          url: "/pages/order/list/index",
          success: () => {
            setTimeout(() => {
              uni.$emit("switchToRefundTab");
            }, 300);
          },
        });
      },
      back() {
        uni.navigateBack();
      },
    },
  };
}

export function createOrderReviewPage(options = {}) {
  const {
    fetchOrderDetail = async () => ({}),
    request = async () => ({}),
  } = options;

  return {
    data() {
      return {
        order: createDefaultOrderReviewOrder(),
        shopRating: 5,
        riderRating: 5,
        shopReview: createDefaultOrderReviewDraft(),
        riderReview: createDefaultOrderReviewDraft(),
      };
    },
    computed: {
      hasRider() {
        return hasOrderReviewRider(this.order);
      },
    },
    onLoad(query = {}) {
      const id = query.id;
      if (!id) {
        uni.showToast({ title: "订单ID不存在", icon: "none" });
        return;
      }
      fetchOrderDetail(id)
        .then((data) => {
          if (data && data.id) {
            const formatted = normalizeOrderReviewOrder(data);
            if (formatted.isReviewed) {
              uni.showToast({ title: "该订单已评价", icon: "none" });
              setTimeout(() => {
                uni.navigateBack();
              }, 1200);
              return;
            }
            this.order = formatted;
          } else {
            uni.showToast({ title: "订单不存在", icon: "none" });
          }
        })
        .catch((error) => {
          console.error("加载订单详情失败:", error);
          uni.showToast({ title: "加载失败", icon: "none" });
        });
    },
    methods: {
      selectShopImage() {
        const currentImages = this.shopReview.images;
        uni.chooseImage({
          count: 3 - currentImages.length,
          sizeType: ["compressed"],
          sourceType: ["album", "camera"],
          success: (res) => {
            this.shopReview.images = currentImages.concat(
              res.tempFilePaths || [],
            );
          },
        });
      },
      removeShopImage(idx) {
        this.shopReview.images.splice(idx, 1);
      },
      selectRiderImage() {
        const currentImages = this.riderReview.images;
        uni.chooseImage({
          count: 3 - currentImages.length,
          sizeType: ["compressed"],
          sourceType: ["album", "camera"],
          success: (res) => {
            this.riderReview.images = currentImages.concat(
              res.tempFilePaths || [],
            );
          },
        });
      },
      removeRiderImage(idx) {
        this.riderReview.images.splice(idx, 1);
      },
      async handleSubmit() {
        if (this.shopRating === 0) {
          uni.showToast({ title: "请完成商家评价", icon: "none" });
          return;
        }
        if (this.hasRider && this.riderRating === 0) {
          uni.showToast({ title: "请完成骑手评价", icon: "none" });
          return;
        }

        const shopId = String(this.order.shopId || "").trim();
        if (!shopId) {
          uni.showToast({ title: "店铺信息缺失，无法提交", icon: "none" });
          return;
        }

        const orderId = String(this.order.id || "").trim();
        const profile = uni.getStorageSync("userProfile") || {};
        const shopPayload = buildShopReviewPayload({
          order: this.order,
          shopRating: this.shopRating,
          shopReview: this.shopReview,
          profile,
        });

        try {
          uni.showLoading({ title: "提交中..." });
          await request({
            url: "/api/reviews",
            method: "POST",
            data: shopPayload,
          });

          const riderPayload = buildRiderReviewPayload({
            order: this.order,
            riderRating: this.riderRating,
            riderReview: this.riderReview,
            profile,
          });
          if (this.hasRider) {
            await request({
              url: "/api/rider-reviews/submit",
              method: "POST",
              data: riderPayload,
            });
          }

          if (orderId) {
            await request({
              url: `/api/orders/${orderId}/reviewed`,
              method: "POST",
            });
          }

          uni.hideLoading();
          uni.showToast({ title: "评价提交成功", icon: "success" });
          setTimeout(() => {
            uni.navigateBack();
          }, 1200);
        } catch (error) {
          uni.hideLoading();
          console.error("提交评价失败:", error);
          uni.showToast({
            title: pickOrderReviewErrorMessage(error),
            icon: "none",
          });
        }
      },
      handleContactShop() {
        const url = buildOrderReviewChatUrl(this.order);
        if (!url) {
          uni.showToast({ title: "商家信息不存在", icon: "none" });
          return;
        }
        uni.navigateTo({ url });
      },
      back() {
        uni.navigateBack();
      },
    },
  };
}
