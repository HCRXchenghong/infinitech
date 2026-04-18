function trimProductPageText(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function toProductPageNumber(value, fallback = 0) {
  const text = trimProductPageText(value);
  if (!text && text !== "0") {
    return fallback;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseProductPageJSON(value) {
  const text = trimProductPageText(value);
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function resolveProductPageUniApp(uniApp) {
  return uniApp || globalThis.uni || {};
}

function showProductPageToast(uniApp, title, icon = "none") {
  if (typeof uniApp.showToast === "function") {
    uniApp.showToast({ title, icon });
  }
}

function showProductPageLoading(uniApp, title = "加载中...") {
  if (typeof uniApp.showLoading === "function") {
    uniApp.showLoading({ title });
  }
}

function hideProductPageLoading(uniApp) {
  if (typeof uniApp.hideLoading === "function") {
    uniApp.hideLoading();
  }
}

function navigateProductPageBack(uniApp) {
  if (typeof uniApp.navigateBack === "function") {
    uniApp.navigateBack();
  }
}

function navigateProductPageTo(uniApp, url) {
  if (url && typeof uniApp.navigateTo === "function") {
    uniApp.navigateTo({ url });
  }
}

function redirectProductPageTo(uniApp, url) {
  if (url && typeof uniApp.redirectTo === "function") {
    uniApp.redirectTo({ url });
  }
}

function emitProductPageEvent(uniApp, name, payload) {
  if (name && typeof uniApp.$emit === "function") {
    uniApp.$emit(name, payload);
  }
}

function readProductPageStorage(uniApp, key, fallback = "") {
  if (typeof uniApp.getStorageSync !== "function") {
    return fallback;
  }
  const value = uniApp.getStorageSync(key);
  return value === undefined ? fallback : value;
}

function writeProductPageStorage(uniApp, key, value) {
  if (typeof uniApp.setStorageSync === "function") {
    uniApp.setStorageSync(key, value);
  }
}

function normalizeProductPageNutrition(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...value };
  }
  const parsed = parseProductPageJSON(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed
    : null;
}

function normalizeProductPageImages(value) {
  if (Array.isArray(value)) {
    return value.map((item) => trimProductPageText(item)).filter(Boolean);
  }
  const parsed = parseProductPageJSON(value);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => trimProductPageText(item)).filter(Boolean);
  }
  const text = trimProductPageText(value);
  return text ? [text] : [];
}

function extractProductPageShopItems(response) {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  if (Array.isArray(response?.items)) {
    return response.items;
  }
  if (Array.isArray(response?.list)) {
    return response.list;
  }
  return [];
}

function resolveProductPageFallbackProductId(product = {}) {
  return trimProductPageText(product?.productId || product?.id);
}

function buildProductPageCartStorageKey(shopId) {
  return `cart_${trimProductPageText(shopId)}`;
}

export function createDefaultConsumerProductDetail() {
  return {
    id: "",
    price: 0,
    originalPrice: 0,
    name: "",
    image: "",
    shopId: "",
    shopName: "",
    sales: 0,
    likeRate: 95,
    nutrition: null,
    detail: "",
    tag: "",
  };
}

export function normalizeConsumerProductDetailPayload(payload = {}, options = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const normalized = {
    ...createDefaultConsumerProductDetail(),
    ...source,
  };
  const resolvedShopId =
    trimProductPageText(options.shopId) ||
    trimProductPageText(source.shopId) ||
    trimProductPageText(source.storeId);
  const resolvedShopName =
    trimProductPageText(source.shopName) || trimProductPageText(source.storeName);
  const resolvedImages = normalizeProductPageImages(source.images);
  const resolvedNutrition = normalizeProductPageNutrition(source.nutrition);
  const resolvedDescription =
    trimProductPageText(source.detail) || trimProductPageText(source.description);
  const ratingValue = toProductPageNumber(source.rating, Number.NaN);
  const likeRate =
    Number.isFinite(ratingValue) && ratingValue > 0
      ? Math.round(ratingValue * 20)
      : toProductPageNumber(source.likeRate, 95) || 95;

  normalized.id = resolveProductPageFallbackProductId(source);
  normalized.price = toProductPageNumber(source.price, 0);
  normalized.originalPrice = trimProductPageText(source.originalPrice)
    ? toProductPageNumber(source.originalPrice, 0)
    : 0;
  normalized.name = trimProductPageText(source.name);
  normalized.image =
    trimProductPageText(source.image) || trimProductPageText(resolvedImages[0]);
  normalized.shopId = resolvedShopId;
  normalized.shopName = resolvedShopName;
  normalized.sales =
    source.monthlySales !== undefined && source.monthlySales !== null
      ? toProductPageNumber(source.monthlySales, 0)
      : toProductPageNumber(source.sales, 0);
  normalized.likeRate = likeRate;
  normalized.nutrition = resolvedNutrition;
  normalized.detail = resolvedDescription;
  normalized.tag = trimProductPageText(source.tag);

  return normalized;
}

export function normalizeConsumerShopList(response) {
  return extractProductPageShopItems(response).map((shop) => ({
    ...(shop && typeof shop === "object" ? shop : {}),
    id: trimProductPageText(shop?.id),
    name: trimProductPageText(shop?.name),
    rating: toProductPageNumber(shop?.rating, 0),
    monthlySales: toProductPageNumber(shop?.monthlySales, 0),
    minPrice: toProductPageNumber(shop?.minPrice, 0),
    deliveryPrice: toProductPageNumber(shop?.deliveryPrice, 0),
  }));
}

export function readConsumerProductCartCount(uniApp, shopId, productId) {
  const resolvedShopId = trimProductPageText(shopId);
  const resolvedProductId = trimProductPageText(productId);
  if (!resolvedShopId || !resolvedProductId) {
    return 0;
  }

  const cartRaw = readProductPageStorage(
    uniApp,
    buildProductPageCartStorageKey(resolvedShopId),
    "{}",
  );
  let cart = {};

  try {
    cart = JSON.parse(cartRaw || "{}");
  } catch {
    cart = {};
  }

  return toProductPageNumber(cart?.[resolvedProductId], 0);
}

export function writeConsumerProductCartCount(
  uniApp,
  shopId,
  productId,
  count,
) {
  const resolvedShopId = trimProductPageText(shopId);
  const resolvedProductId = trimProductPageText(productId);
  if (!resolvedShopId || !resolvedProductId) {
    return {};
  }

  const storageKey = buildProductPageCartStorageKey(resolvedShopId);
  const cartRaw = readProductPageStorage(uniApp, storageKey, "{}");
  let cart = {};

  try {
    cart = JSON.parse(cartRaw || "{}");
  } catch {
    cart = {};
  }

  const resolvedCount = Math.max(0, Math.trunc(toProductPageNumber(count, 0)));
  if (resolvedCount > 0) {
    cart[resolvedProductId] = resolvedCount;
  } else {
    delete cart[resolvedProductId];
  }

  writeProductPageStorage(uniApp, storageKey, JSON.stringify(cart));
  emitProductPageEvent(uniApp, "cartUpdated", { shopId: resolvedShopId });
  return cart;
}

export function createProductDetailPage(options = {}) {
  const fetchProductDetail =
    typeof options.fetchProductDetail === "function"
      ? options.fetchProductDetail
      : async () => null;
  const runtimeUni = resolveProductPageUniApp(options.uniApp);

  return {
    data() {
      return {
        product: createDefaultConsumerProductDetail(),
        loading: true,
        productId: "",
        shopId: "",
      };
    },
    async onLoad(query = {}) {
      this.productId = trimProductPageText(query?.id);
      this.shopId = trimProductPageText(query?.shopId);

      if (!this.productId) {
        showProductPageToast(runtimeUni, "参数错误");
        setTimeout(() => this.goBack(), 1500);
        return;
      }

      await this.loadProduct();
    },
    methods: {
      async loadProduct() {
        try {
          showProductPageLoading(runtimeUni);
          const data = await fetchProductDetail(this.productId);

          if (!data) {
            showProductPageToast(runtimeUni, "商品不存在");
            setTimeout(() => this.goBack(), 1500);
            return;
          }

          const normalized = normalizeConsumerProductDetailPayload(data, {
            shopId: this.shopId,
          });
          this.product = normalized;
          this.shopId = trimProductPageText(normalized.shopId) || this.shopId;
        } catch (error) {
          console.error("加载商品详情失败:", error);
          showProductPageToast(runtimeUni, "加载失败");
        } finally {
          hideProductPageLoading(runtimeUni);
          this.loading = false;
        }
      },
      goBack() {
        navigateProductPageBack(runtimeUni);
      },
      goShopDetail() {
        const targetShopId =
          trimProductPageText(this.product?.shopId) || trimProductPageText(this.shopId);
        if (!targetShopId) {
          return;
        }
        navigateProductPageTo(
          runtimeUni,
          `/pages/shop/detail/index?id=${targetShopId}`,
        );
      },
      addToCart() {
        const targetShopId =
          trimProductPageText(this.product?.shopId) || trimProductPageText(this.shopId);
        const productId = resolveProductPageFallbackProductId(this.product);

        if (targetShopId && productId) {
          const currentCount = readConsumerProductCartCount(
            runtimeUni,
            targetShopId,
            productId,
          );
          writeConsumerProductCartCount(
            runtimeUni,
            targetShopId,
            productId,
            currentCount + 1,
          );
        }

        if (targetShopId) {
          redirectProductPageTo(
            runtimeUni,
            `/pages/shop/menu/index?id=${targetShopId}`,
          );
        }
      },
    },
  };
}

export function createProductPopupDetailPage(options = {}) {
  const fetchProductDetail =
    typeof options.fetchProductDetail === "function"
      ? options.fetchProductDetail
      : async () => null;
  const runtimeUni = resolveProductPageUniApp(options.uniApp);

  return {
    data() {
      return {
        product: createDefaultConsumerProductDetail(),
        productId: "",
        shopId: "",
        count: 0,
        loading: true,
      };
    },
    async onLoad(query = {}) {
      this.productId = trimProductPageText(query?.id);
      this.shopId = trimProductPageText(query?.shopId);

      if (!this.productId) {
        showProductPageToast(runtimeUni, "参数错误");
        setTimeout(() => this.goBack(), 1500);
        return;
      }

      await this.loadProduct();
      this.loadCartCount();
    },
    onShow() {
      this.loadCartCount();
    },
    methods: {
      async loadProduct() {
        try {
          showProductPageLoading(runtimeUni);
          const data = await fetchProductDetail(this.productId);

          if (!data) {
            showProductPageToast(runtimeUni, "商品不存在");
            setTimeout(() => this.goBack(), 1500);
            return;
          }

          const normalized = normalizeConsumerProductDetailPayload(data, {
            shopId: this.shopId,
          });
          this.product = normalized;
          this.shopId = trimProductPageText(normalized.shopId) || this.shopId;
        } catch (error) {
          console.error("加载商品失败:", error);
          showProductPageToast(runtimeUni, "加载失败");
        } finally {
          hideProductPageLoading(runtimeUni);
          this.loading = false;
        }
      },
      loadCartCount() {
        this.count = readConsumerProductCartCount(
          runtimeUni,
          this.shopId,
          this.productId,
        );
      },
      saveCart() {
        writeConsumerProductCartCount(
          runtimeUni,
          this.shopId,
          this.productId,
          this.count,
        );
      },
      ensureAuthenticatedUser() {
        if (readProductPageStorage(runtimeUni, "authMode", "") === "user") {
          return true;
        }
        showProductPageToast(runtimeUni, "请先登录后下单");
        navigateProductPageTo(runtimeUni, "/pages/auth/login/index");
        return false;
      },
      handlePlus() {
        if (!this.ensureAuthenticatedUser()) {
          return;
        }
        this.count += 1;
        this.saveCart();
      },
      handleMinus() {
        if (!this.ensureAuthenticatedUser()) {
          return;
        }
        if (this.count > 0) {
          this.count -= 1;
          this.saveCart();
        }
      },
      handleAddCart() {
        if (!this.ensureAuthenticatedUser()) {
          return;
        }
        if (this.count === 0) {
          this.count = 1;
          this.saveCart();
        }
        showProductPageToast(runtimeUni, "已加入购物车", "success");
      },
      goBack() {
        navigateProductPageBack(runtimeUni);
      },
    },
  };
}

export function createShopListPage(options = {}) {
  const fetchShops =
    typeof options.fetchShops === "function" ? options.fetchShops : async () => [];
  const runtimeUni = resolveProductPageUniApp(options.uniApp);

  return {
    data() {
      return {
        shops: [],
        loading: false,
      };
    },
    onLoad() {
      void this.loadShops();
    },
    methods: {
      async loadShops() {
        this.loading = true;
        try {
          const data = await fetchShops();
          this.shops = normalizeConsumerShopList(data);
        } catch (error) {
          console.error("加载商家列表失败:", error);
          showProductPageToast(runtimeUni, "加载失败");
          this.shops = [];
        } finally {
          this.loading = false;
        }
      },
      goDetail(id) {
        const resolvedShopId = trimProductPageText(id);
        if (!resolvedShopId) {
          return;
        }
        navigateProductPageTo(
          runtimeUni,
          `/pages/shop/detail/index?id=${resolvedShopId}`,
        );
      },
    },
  };
}
