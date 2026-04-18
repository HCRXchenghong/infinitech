function resolveUniApp(uniApp) {
  return uniApp || globalThis.uni || {};
}

export function getConsumerCategoryCount(cartItems = [], categoryId) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return 0;
  }

  return cartItems
    .filter((item) => item?.categoryId === categoryId)
    .reduce((sum, item) => sum + Number(item?.count || 0), 0);
}

export function createCartBarComponent(options = {}) {
  return {
    name: String(options.name || "ConsumerCartBar"),
    props: {
      totalCount: Number,
      totalPrice: Number,
      minPrice: Number,
      deliveryFee: Number,
    },
    methods: {
      handleToggle() {
        this.$emit("toggle");
      },
      handleCheckout() {
        this.$emit("checkout");
      },
    },
  };
}

export function createCategorySidebarComponent(options = {}) {
  return {
    name: String(options.name || "ConsumerCategorySidebar"),
    props: {
      categories: Array,
      activeIndex: Number,
      cartItems: Array,
    },
    methods: {
      handleSwitch(index) {
        this.$emit("switch", index);
      },
      getCategoryCount(categoryId) {
        return getConsumerCategoryCount(this.cartItems, categoryId);
      },
    },
  };
}

export function createEmptyStateComponent(options = {}) {
  return {
    name: String(options.name || "ConsumerEmptyState"),
    props: {
      icon: {
        type: String,
        default: "📭",
      },
      text: {
        type: String,
        default: "暂无内容",
      },
      desc: {
        type: String,
        default: "",
      },
    },
  };
}

export function createFilterBarComponent(options = {}) {
  return {
    name: String(options.name || "ConsumerFilterBar"),
    props: {
      filters: {
        type: Array,
        required: true,
      },
      activeFilter: {
        type: String,
        default: "default",
      },
    },
    methods: {
      handleFilter(key) {
        this.$emit("change", key);
      },
    },
  };
}

export function createMenuItemComponent(options = {}) {
  return {
    name: String(options.name || "ConsumerMenuItem"),
    props: {
      item: Object,
      count: {
        type: Number,
        default: 0,
      },
    },
    methods: {
      handleTap() {
        this.$emit("tap", this.item);
      },
      handlePlus() {
        this.$emit("plus", this.item);
      },
      handleMinus() {
        this.$emit("minus", this.item);
      },
    },
  };
}

export function createMenuNavComponent(options = {}) {
  return {
    name: String(options.name || "ConsumerMenuNav"),
    props: {
      shopName: String,
    },
    methods: {
      handleBack() {
        this.$emit("back");
      },
    },
  };
}

export function createPageHeaderComponent(options = {}) {
  const uniApp = resolveUniApp(options.uniApp);

  return {
    name: String(options.name || "ConsumerPageHeader"),
    props: {
      title: {
        type: String,
        default: "",
      },
      showSearch: {
        type: Boolean,
        default: false,
      },
    },
    methods: {
      handleBack() {
        this.$emit("back");
        if (typeof uniApp.navigateBack === "function") {
          uniApp.navigateBack();
        }
      },
      handleSearch() {
        this.$emit("search");
      },
    },
  };
}

export function createShopCardComponent(options = {}) {
  return {
    name: String(options.name || "ConsumerShopCard"),
    props: {
      shop: {
        type: Object,
        required: true,
      },
      logoColor: {
        type: String,
        default: "linear-gradient(135deg, #f97316, #ea580c)",
      },
    },
    methods: {
      handleTap() {
        this.$emit("shop-tap", this.shop.id);
      },
    },
  };
}

export function createSuccessModalComponent(options = {}) {
  return {
    name: String(options.name || "ConsumerSuccessModal"),
    props: {
      show: {
        type: Boolean,
        default: false,
      },
      title: {
        type: String,
        default: "提交成功",
      },
      message: {
        type: String,
        default: "",
      },
    },
    methods: {
      handleClose() {
        this.$emit("close");
      },
      handleConfirm() {
        this.$emit("confirm");
        this.handleClose();
      },
    },
  };
}
