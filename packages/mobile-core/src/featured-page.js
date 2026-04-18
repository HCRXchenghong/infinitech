function trimFeaturedPageText(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function resolveFeaturedPageUniApp(uniApp) {
  return uniApp || globalThis.uni || {};
}

function showFeaturedPageToast(uniApp, title, icon = "none") {
  if (typeof uniApp.showToast === "function") {
    uniApp.showToast({ title, icon });
  }
}

function navigateFeaturedPageBack(uniApp) {
  if (typeof uniApp.navigateBack === "function") {
    uniApp.navigateBack();
  }
}

function navigateFeaturedPageTo(uniApp, url) {
  if (url && typeof uniApp.navigateTo === "function") {
    uniApp.navigateTo({ url });
  }
}

export function normalizeFeaturedPageFeed(
  payload = {},
  options = {},
) {
  const normalizeProduct =
    typeof options.normalizeFeaturedProductProjection === "function"
      ? options.normalizeFeaturedProductProjection
      : (item) => item;
  const normalizeShop =
    typeof options.normalizeShopProjection === "function"
      ? options.normalizeShopProjection
      : (item) => item;
  const products = Array.isArray(payload?.products)
    ? payload.products.map((item) => normalizeProduct(item))
    : [];
  const shops = Array.isArray(payload?.shops)
    ? payload.shops.map((item) => normalizeShop(item))
    : [];

  return {
    products,
    shops,
  };
}

export function createFeaturedPage(options = {}) {
  const fetchHomeFeed =
    typeof options.fetchHomeFeed === "function"
      ? options.fetchHomeFeed
      : async () => ({});
  const runtimeUni = resolveFeaturedPageUniApp(options.uniApp);
  const HomeShopCard = options.HomeShopCard;

  return {
    components: {
      HomeShopCard,
    },
    data() {
      return {
        products: [],
        shops: [],
        loading: false,
      };
    },
    onLoad() {
      void this.loadHomeFeed();
    },
    methods: {
      async loadHomeFeed() {
        this.loading = true;
        try {
          const data = await fetchHomeFeed();
          const normalized = normalizeFeaturedPageFeed(data, options);
          this.products = normalized.products;
          this.shops = normalized.shops;
        } catch (error) {
          console.error("加载首页推荐编排失败:", error);
          showFeaturedPageToast(runtimeUni, "加载失败");
          this.products = [];
          this.shops = [];
        } finally {
          this.loading = false;
        }
      },
      goBack() {
        navigateFeaturedPageBack(runtimeUni);
      },
      goProductDetail(item = {}) {
        const productId = trimFeaturedPageText(item.id);
        const shopId = trimFeaturedPageText(item.shopId);
        if (!productId) {
          return;
        }
        navigateFeaturedPageTo(
          runtimeUni,
          `/pages/product/detail/index?id=${productId}&shopId=${shopId}`,
        );
      },
      goShopDetail(id) {
        const shopId = trimFeaturedPageText(id);
        if (!shopId) {
          return;
        }
        navigateFeaturedPageTo(runtimeUni, `/pages/shop/detail/index?id=${shopId}`);
      },
    },
  };
}
