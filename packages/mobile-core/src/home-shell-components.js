import { getCurrentLocation as resolveCurrentLocation } from "./location.js";

function resolveUniApp(uniApp) {
  return uniApp || globalThis.uni;
}

function resolveDelay(delay) {
  const value = Number(delay);
  return Number.isFinite(value) && value >= 0 ? value : 80;
}

function toFixedLocation(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(6) : "";
}

export function formatFeaturedSectionPrice(value) {
  const num = Number(value || 0);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

export function formatHomeShopCardPrice(value) {
  return formatFeaturedSectionPrice(value);
}

export function formatHomeShopCardRating(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) {
    return "暂无评分";
  }
  return `★ ${num.toFixed(1)}`;
}

export function createHomeHeaderComponent(options = {}) {
  return {
    name: String(options.name || "ConsumerHomeHeader"),
    props: {
      address: String,
      weather: String,
      placeholder: String,
    },
    methods: {
      handleLocation() {
        this.$emit("location");
      },
      handleWeather() {
        this.$emit("weather");
      },
      handleSearch() {
        this.$emit("search");
      },
    },
  };
}

export function createCategoryGridComponent(options = {}) {
  return {
    name: String(options.name || "ConsumerCategoryGrid"),
    props: {
      categories: {
        type: Array,
        required: true,
      },
    },
    methods: {
      handleTap(category) {
        this.$emit("category-tap", category);
      },
    },
  };
}

export function createFeaturedSectionComponent(options = {}) {
  return {
    name: String(options.name || "ConsumerFeaturedSection"),
    props: {
      products: {
        type: Array,
        required: true,
      },
    },
    methods: {
      formatPrice(value) {
        return formatFeaturedSectionPrice(value);
      },
      handleTap(item) {
        this.$emit("product-tap", item);
      },
      handleMore() {
        this.$emit("more");
      },
    },
  };
}

export function createHomeShopCardComponent(options = {}) {
  return {
    name: String(options.name || "ConsumerHomeShopCard"),
    props: {
      shop: {
        type: Object,
        required: true,
      },
    },
    methods: {
      formatPrice(value) {
        return formatHomeShopCardPrice(value);
      },
      formatRating(value) {
        return formatHomeShopCardRating(value);
      },
      handleTap() {
        this.$emit("shop-tap", this.shop.id);
      },
    },
  };
}

export async function relocateHomeLocation(options = {}) {
  const getCurrentLocation =
    options.getCurrentLocation || resolveCurrentLocation;
  const uniApp = resolveUniApp(options.uniApp);
  const location = await getCurrentLocation();
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  const address = String(location?.address || "").trim();
  const displayAddress =
    address || `${toFixedLocation(latitude)},${toFixedLocation(longitude)}`;

  uniApp.setStorageSync("selectedAddress", displayAddress);
  uniApp.setStorageSync("currentLocation", {
    lat: latitude,
    lng: longitude,
  });
  uniApp.showToast({ title: "定位成功", icon: "success" });

  return {
    latitude,
    longitude,
    address,
    displayAddress,
  };
}

export function createHomeLocationModalComponent(options = {}) {
  const getCurrentLocation =
    options.getCurrentLocation || resolveCurrentLocation;
  const uniApp = resolveUniApp(options.uniApp);
  const setTimeoutImpl = options.setTimeoutImpl || globalThis.setTimeout;
  const selectAddressDelay = resolveDelay(options.selectAddressDelay);

  return {
    name: String(options.name || "ConsumerHomeLocationModal"),
    props: {
      show: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        loading: false,
      };
    },
    methods: {
      handleClose() {
        this.$emit("close");
      },
      async handleRelocate() {
        if (this.loading) {
          return;
        }

        this.loading = true;
        try {
          const result = await relocateHomeLocation({
            getCurrentLocation,
            uniApp,
          });
          this.loading = false;
          this.$emit("relocated", result.displayAddress);
          this.handleClose();
        } catch (_error) {
          uniApp.showToast({ title: "定位失败", icon: "none" });
          this.loading = false;
        }
      },
      handleSelectAddress() {
        if (this.loading) {
          return;
        }

        this.handleClose();
        setTimeoutImpl(() => {
          uniApp.navigateTo({
            url: "/pages/profile/address-list/index?select=1",
          });
        }, selectAddressDelay);
      },
    },
  };
}
