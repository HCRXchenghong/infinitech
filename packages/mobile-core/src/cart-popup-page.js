function resolveCartPopupUniApp(uniApp) {
  return uniApp || globalThis.uni || {};
}

function trimCartPopupText(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function readCartPopupStorage(uniApp, key, fallback = "") {
  if (typeof uniApp.getStorageSync !== "function") {
    return fallback;
  }
  const value = uniApp.getStorageSync(key);
  return value === undefined ? fallback : value;
}

function writeCartPopupStorage(uniApp, key, value) {
  if (typeof uniApp.setStorageSync === "function") {
    uniApp.setStorageSync(key, value);
  }
}

function emitCartPopupEvent(uniApp, name, payload) {
  if (typeof uniApp.$emit === "function") {
    uniApp.$emit(name, payload);
  }
}

function navigateCartPopupBack(uniApp) {
  if (typeof uniApp.navigateBack === "function") {
    uniApp.navigateBack();
  }
}

function redirectCartPopupTo(uniApp, url) {
  if (url && typeof uniApp.redirectTo === "function") {
    uniApp.redirectTo({ url });
  }
}

export function normalizeCartPopupCartMap(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...value };
  }
  const text = trimCartPopupText(value);
  if (!text) {
    return {};
  }
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function buildCartPopupItems(products = [], cart = {}) {
  const resolvedProducts = Array.isArray(products) ? products : [];
  const resolvedCart = normalizeCartPopupCartMap(cart);
  const items = [];

  Object.keys(resolvedCart).forEach((id) => {
    const product = resolvedProducts.find(
      (item) => String(item?.id) === String(id),
    );
    const count = Number(resolvedCart[id] || 0);
    if (product && count > 0) {
      items.push({
        ...product,
        count,
      });
    }
  });

  return items;
}

export function createCartPopupPage(options = {}) {
  const fetchMenuItems =
    typeof options.fetchMenuItems === "function"
      ? options.fetchMenuItems
      : async () => [];
  const runtimeUni = resolveCartPopupUniApp(options.uniApp);

  return {
    data() {
      return {
        shopId: "",
        cart: {},
        products: [],
        loading: false,
      };
    },
    computed: {
      cartItems() {
        return buildCartPopupItems(this.products, this.cart);
      },
    },
    onLoad(query = {}) {
      if (!this.ensureConsumerAuth()) {
        return;
      }
      this.shopId = trimCartPopupText(query.shopId);
      void this.loadProducts();
      this.loadCart();
    },
    onShow() {
      if (!this.ensureConsumerAuth()) {
        return;
      }
      this.loadCart();
    },
    methods: {
      ensureConsumerAuth() {
        if (readCartPopupStorage(runtimeUni, "authMode", "") === "user") {
          return true;
        }
        redirectCartPopupTo(runtimeUni, "/pages/auth/login/index");
        return false;
      },
      async loadProducts() {
        if (!this.shopId) {
          return;
        }
        this.loading = true;
        try {
          const data = await fetchMenuItems(this.shopId);
          this.products = Array.isArray(data) ? data : [];
        } catch (error) {
          console.error("加载商品列表失败:", error);
          this.products = [];
        } finally {
          this.loading = false;
        }
      },
      loadCart() {
        this.cart = normalizeCartPopupCartMap(
          readCartPopupStorage(runtimeUni, `cart_${this.shopId}`, "{}"),
        );
      },
      saveCart() {
        try {
          writeCartPopupStorage(
            runtimeUni,
            `cart_${this.shopId}`,
            JSON.stringify(this.cart),
          );
          emitCartPopupEvent(runtimeUni, "cartUpdated", { shopId: this.shopId });
        } catch (error) {
          console.error("保存购物车失败:", error);
        }
      },
      handlePlus(item = {}) {
        const itemId = trimCartPopupText(item.id);
        const current = Number(this.cart[itemId] || 0);
        this.cart = { ...this.cart, [itemId]: current + 1 };
        this.saveCart();
      },
      handleMinus(item = {}) {
        const itemId = trimCartPopupText(item.id);
        const current = Number(this.cart[itemId] || 0);
        if (current <= 1) {
          const copy = { ...this.cart };
          delete copy[itemId];
          this.cart = copy;
        } else {
          this.cart = { ...this.cart, [itemId]: current - 1 };
        }
        this.saveCart();
        if (this.cartItems.length === 0) {
          setTimeout(() => this.goBack(), 300);
        }
      },
      handleClear() {
        if (typeof runtimeUni.showModal !== "function") {
          this.cart = {};
          this.saveCart();
          setTimeout(() => this.goBack(), 300);
          return;
        }
        runtimeUni.showModal({
          title: "确认清空",
          content: "确定要清空购物车吗？",
          success: (res) => {
            if (res?.confirm) {
              this.cart = {};
              this.saveCart();
              setTimeout(() => this.goBack(), 300);
            }
          },
        });
      },
      goBack() {
        navigateCartPopupBack(runtimeUni);
      },
    },
  };
}
