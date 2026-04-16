import {
  buildHomeCategoryNavigation,
  buildHomeFeedCollections,
  buildHomeLocationDisplay,
  buildHomeLocationErrorCopy,
  normalizeHomeSelectedAddress,
  normalizeHomeWeatherRefreshMinutes,
  shouldRefreshHomeWeather,
} from "../../packages/mobile-core/src/home-index.js";

export function createHomeIndexPage({
  clientId,
  HomeHeader,
  CategoryGrid,
  FeaturedSection,
  HomeShopCard,
  LocationModal,
  WeatherModal,
  fetchWeather,
  fetchHomeFeed,
  getCurrentLocation,
  normalizeFeaturedProductProjection,
  normalizeShopProjection,
  buildHomeCategories,
  buildHomeCategoriesForClient,
  loadPlatformRuntimeSettings,
} = {}) {
  return {
    components: {
      HomeHeader,
      CategoryGrid,
      FeaturedSection,
      HomeShopCard,
      LocationModal,
      WeatherModal,
    },
    data() {
      return {
        shops: [],
        categories: buildHomeCategories(),
        featuredProducts: [],
        currentAddress: "定位中...",
        weather: { temp: 26, condition: "多云" },
        searchPlaceholder: "一点点奶茶",
        weatherTimer: null,
        weatherRefreshMinutes: 10,
        weatherRequesting: false,
        lastWeatherRefreshAt: 0,
        showLocationModalFlag: false,
        showWeatherModalFlag: false,
      };
    },
    computed: {
      weatherText() {
        return `${this.weather.temp}° ${this.weather.condition}`;
      },
    },
    onLoad() {
      this.getLocation();
      this.loadCategories();
      this.loadHomeFeed();
      this.refreshWeather();
      this.ensureWeatherTimer();
    },
    onShow() {
      const selectedAddress = normalizeHomeSelectedAddress(
        uni.getStorageSync("selectedAddress"),
      );
      if (selectedAddress) {
        this.currentAddress = selectedAddress;
      }
      this.ensureWeatherTimer();
      if (this.shouldRefreshWeatherNow()) {
        this.refreshWeather();
      }
      uni.$off("locationUpdated", this.onLocationUpdated);
      uni.$on("locationUpdated", this.onLocationUpdated);
      uni.$off("addressSelected", this.onAddressSelected);
      uni.$on("addressSelected", this.onAddressSelected);
    },
    onHide() {
      this.clearWeatherTimer();
    },
    onUnload() {
      uni.$off("locationUpdated", this.onLocationUpdated);
      uni.$off("addressSelected", this.onAddressSelected);
      this.clearWeatherTimer();
    },
    methods: {
      normalizeWeatherRefreshMinutes(raw) {
        return normalizeHomeWeatherRefreshMinutes(raw);
      },
      ensureWeatherTimer() {
        if (this.weatherTimer) return;
        this.resetWeatherTimer();
      },
      clearWeatherTimer() {
        if (this.weatherTimer) {
          clearInterval(this.weatherTimer);
          this.weatherTimer = null;
        }
      },
      resetWeatherTimer() {
        this.clearWeatherTimer();
        const intervalMs =
          this.normalizeWeatherRefreshMinutes(this.weatherRefreshMinutes) * 60 * 1000;
        this.weatherTimer = setInterval(() => {
          this.refreshWeather();
        }, intervalMs);
      },
      shouldRefreshWeatherNow() {
        return shouldRefreshHomeWeather(
          this.lastWeatherRefreshAt,
          this.weatherRefreshMinutes,
        );
      },
      async refreshWeather() {
        if (this.weatherRequesting) return;
        this.weatherRequesting = true;
        try {
          const weather = await fetchWeather();
          if (weather) {
            this.weather = weather;
            this.lastWeatherRefreshAt = Date.now();
            const rawRefreshMinutes = Number(weather.refreshIntervalMinutes);
            if (Number.isFinite(rawRefreshMinutes)) {
              const nextRefreshMinutes =
                this.normalizeWeatherRefreshMinutes(rawRefreshMinutes);
              if (nextRefreshMinutes !== this.weatherRefreshMinutes) {
                this.weatherRefreshMinutes = nextRefreshMinutes;
                this.resetWeatherTimer();
              }
            }
          }
        } catch (_error) {
          // Keep last good weather snapshot.
        } finally {
          this.weatherRequesting = false;
        }
      },
      syncSelectedAddress() {
        const selectedAddress = normalizeHomeSelectedAddress(
          uni.getStorageSync("selectedAddress"),
        );
        if (selectedAddress) {
          this.currentAddress = selectedAddress;
        }
      },
      onLocationUpdated() {
        this.syncSelectedAddress();
      },
      onAddressSelected() {
        this.syncSelectedAddress();
      },
      showLocationModal() {
        this.showLocationModalFlag = true;
      },
      closeLocationModal() {
        this.showLocationModalFlag = false;
      },
      showWeatherModal() {
        this.showWeatherModalFlag = true;
      },
      closeWeatherModal() {
        this.showWeatherModalFlag = false;
      },
      onLocationRelocated(address) {
        this.currentAddress = address;
        this.closeLocationModal();
      },
      goCategory(cat) {
        const action = buildHomeCategoryNavigation(cat);
        if (action.type === "error") {
          uni.showToast({ title: action.message, icon: "none" });
          return;
        }

        if (action.type === "navigate") {
          uni.navigateTo({ url: action.url });
          return;
        }

        if (action.type === "external") {
          if (typeof window !== "undefined" && typeof window.open === "function") {
            window.open(action.url, "_blank");
            return;
          }
          if (typeof plus !== "undefined" && plus?.runtime?.openURL) {
            plus.runtime.openURL(action.url);
            return;
          }
          uni.setClipboardData({
            data: action.url,
            success: () => uni.showToast({ title: "链接已复制", icon: "success" }),
          });
        }
      },
      goProductDetail(item) {
        if (!item || !item.id) {
          uni.showToast({ title: "商品信息错误", icon: "none" });
          return;
        }
        uni.navigateTo({
          url: `/pages/product/detail/index?id=${item.id}&shopId=${item.shopId || ""}`,
        });
      },
      goFeatured() {
        uni.navigateTo({ url: "/pages/product/featured/index" });
      },
      goSearch() {
        uni.navigateTo({ url: "/pages/search/index/index" });
      },
      getLocation() {
        this.currentAddress = "定位中...";
        getCurrentLocation()
          .then((data) => {
            const displayAddress = buildHomeLocationDisplay(data);
            this.currentAddress = displayAddress || "请手动选择地址";
            uni.setStorageSync("currentLocation", {
              lat: data.latitude,
              lng: data.longitude,
            });
          })
          .catch((error) => {
            console.error("定位失败:", error);
            const selectedAddress = normalizeHomeSelectedAddress(
              uni.getStorageSync("selectedAddress"),
            );
            this.currentAddress = selectedAddress || "请手动选择地址";
            uni.showToast({
              title: buildHomeLocationErrorCopy(error),
              icon: "none",
            });
          });
      },
      async loadCategories() {
        try {
          const runtime = await loadPlatformRuntimeSettings();
          const categories = buildHomeCategoriesForClient(runtime, clientId);
          if (Array.isArray(categories) && categories.length > 0) {
            this.categories = buildHomeCategories(categories);
            return;
          }
        } catch (error) {
          console.error("加载首页入口失败:", error);
        }

        this.categories = buildHomeCategories();
      },
      async loadHomeFeed() {
        try {
          const data = await fetchHomeFeed();
          const next = buildHomeFeedCollections(data, {
            normalizeFeaturedProductProjection,
            normalizeShopProjection,
          });
          this.shops = next.shops;
          this.featuredProducts = next.featuredProducts;
        } catch (error) {
          console.error("加载首页编排失败:", error);
        }
      },
      goShopDetail(id) {
        uni.navigateTo({ url: `/pages/shop/detail/index?id=${id}` });
      },
    },
  };
}
