import { readConsumerStoredProfile } from "./consumer-profile-storage.js";

function trimProfileAddressText(value) {
  return String(value || "").trim();
}

function normalizeProfileAddressNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}

export const CONSUMER_PROFILE_ADDRESS_STORAGE_KEY = "addresses";
export const CONSUMER_PROFILE_SELECTED_ADDRESS_ID_STORAGE_KEY =
  "selectedAddressId";
export const CONSUMER_PROFILE_SELECTED_ADDRESS_TEXT_STORAGE_KEY =
  "selectedAddress";
export const CONSUMER_PROFILE_SELECTED_ADDRESS_PAYLOAD_STORAGE_KEY =
  "selectedAddressPayload";
export const DEFAULT_CONSUMER_PROFILE_ADDRESS_TAG = "家";
export const DEFAULT_CONSUMER_PROFILE_ADDRESS_TAGS = [
  "家",
  "公司",
  "学校",
];

export function createDefaultConsumerProfileAddressTags() {
  return DEFAULT_CONSUMER_PROFILE_ADDRESS_TAGS.slice();
}

export function createDefaultConsumerProfileAddressForm() {
  return {
    id: "",
    name: "",
    phone: "",
    address: "",
    detail: "",
    tag: DEFAULT_CONSUMER_PROFILE_ADDRESS_TAG,
    latitude: 0,
    longitude: 0,
    isDefault: false,
  };
}

export function resolveConsumerProfileAddressUserId(profile = {}) {
  return trimProfileAddressText(profile.id || profile.userId || profile.phone);
}

export function normalizeConsumerProfileAddressRecord(address) {
  if (!address || typeof address !== "object" || Array.isArray(address)) {
    return null;
  }

  const id = trimProfileAddressText(address.id);
  const line1 = trimProfileAddressText(address.address);
  const roomDetail = trimProfileAddressText(
    address.roomDetail || address.detail,
  );
  const fullAddress = trimProfileAddressText(
    address.fullAddress || [line1, roomDetail].filter(Boolean).join(" "),
  );
  const name = trimProfileAddressText(address.name);
  if (!id || !name || !fullAddress) {
    return null;
  }

  return {
    id,
    name,
    phone: trimProfileAddressText(address.phone),
    tag:
      trimProfileAddressText(address.tag) || DEFAULT_CONSUMER_PROFILE_ADDRESS_TAG,
    address: line1,
    roomDetail,
    detail: fullAddress,
    fullAddress,
    latitude: normalizeProfileAddressNumber(address.latitude),
    longitude: normalizeProfileAddressNumber(address.longitude),
    isDefault: Boolean(address.isDefault),
  };
}

export function normalizeConsumerProfileAddressList(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map(normalizeConsumerProfileAddressRecord).filter(Boolean);
}

export function buildConsumerProfileAddressCachePayload(address) {
  const normalized = normalizeConsumerProfileAddressRecord(address);
  if (!normalized) {
    return null;
  }
  return {
    id: normalized.id,
    name: normalized.name,
    phone: normalized.phone,
    tag: normalized.tag,
    address: normalized.address,
    roomDetail: normalized.roomDetail,
    detail: normalized.fullAddress,
    fullAddress: normalized.fullAddress,
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    isDefault: normalized.isDefault,
  };
}

export function filterConsumerProfileAddresses(addresses, keyword = "") {
  const normalizedList = normalizeConsumerProfileAddressList(addresses);
  const query = trimProfileAddressText(keyword).toLowerCase();
  if (!query) {
    return normalizedList;
  }
  return normalizedList.filter((address) =>
    [address.name, address.phone, address.fullAddress, address.tag].some(
      (field) => trimProfileAddressText(field).toLowerCase().includes(query),
    ),
  );
}

export function resolveConsumerProfileSelectedAddress(
  addresses,
  selectedAddressId = "",
) {
  const normalizedList = normalizeConsumerProfileAddressList(addresses);
  const selectedId = trimProfileAddressText(selectedAddressId);

  if (selectedId) {
    const matched = normalizedList.find((item) => item.id === selectedId);
    if (matched) {
      return matched;
    }
  }

  const defaultAddress = normalizedList.find((item) => item.isDefault);
  if (defaultAddress) {
    return defaultAddress;
  }
  if (normalizedList.length === 1) {
    return normalizedList[0];
  }
  return null;
}

export function buildConsumerProfileSelectedAddressStoragePayload(address) {
  const cached = buildConsumerProfileAddressCachePayload(address);
  if (!cached) {
    return null;
  }
  return {
    selectedAddressId: cached.id,
    selectedAddress: cached.fullAddress,
    selectedAddressPayload: cached,
  };
}

export function buildConsumerProfileAddressEditPath(addressId = "") {
  const id = trimProfileAddressText(addressId);
  if (!id) {
    return "/pages/profile/address-edit/index";
  }
  return `/pages/profile/address-edit/index?id=${encodeURIComponent(id)}`;
}

export function buildConsumerProfileAddressSavePayload(form = {}) {
  return {
    name: trimProfileAddressText(form.name),
    phone: trimProfileAddressText(form.phone),
    tag:
      trimProfileAddressText(form.tag) || DEFAULT_CONSUMER_PROFILE_ADDRESS_TAG,
    address: trimProfileAddressText(form.address),
    detail: trimProfileAddressText(form.detail),
    latitude: normalizeProfileAddressNumber(form.latitude),
    longitude: normalizeProfileAddressNumber(form.longitude),
    isDefault: Boolean(form.isDefault),
  };
}

export function validateConsumerProfileAddressForm(form = {}) {
  const payload = buildConsumerProfileAddressSavePayload(form);
  if (!payload.name || !payload.phone || !payload.address) {
    return { valid: false, message: "请填写完整信息" };
  }
  if (!/^1\d{10}$/.test(payload.phone)) {
    return { valid: false, message: "手机号格式不正确" };
  }
  return { valid: true, message: "" };
}

export function buildConsumerProfileAddressLocationPatch(location = {}) {
  return {
    address: trimProfileAddressText(location.address || location.name),
    latitude: normalizeProfileAddressNumber(location.latitude),
    longitude: normalizeProfileAddressNumber(location.longitude),
  };
}

export function buildConsumerProfileAddressFallbackLocationPatch(location = {}) {
  const latitude = normalizeProfileAddressNumber(location.latitude);
  const longitude = normalizeProfileAddressNumber(location.longitude);
  const fallbackAddress = trimProfileAddressText(location.address);
  return {
    address:
      fallbackAddress ||
      (latitude || longitude
        ? `${latitude.toFixed(6)},${longitude.toFixed(6)}`
        : ""),
    latitude,
    longitude,
  };
}

export function applyConsumerProfileAddressToForm(form = {}, address) {
  const current =
    form && typeof form === "object" && !Array.isArray(form)
      ? { ...form }
      : createDefaultConsumerProfileAddressForm();
  const normalized = normalizeConsumerProfileAddressRecord(address);
  if (!normalized) {
    return current;
  }
  return {
    ...current,
    id: normalized.id,
    name: normalized.name,
    phone: normalized.phone,
    address: normalized.address,
    detail: normalized.roomDetail,
    tag: normalized.tag,
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    isDefault: normalized.isDefault,
  };
}

export function normalizeConsumerProfileAddressToggleValue(event) {
  return Boolean(event?.detail?.value ?? event);
}

export function resolveConsumerProfileAddressSavedId(response, fallbackId = "") {
  const source =
    response && typeof response === "object" && !Array.isArray(response)
      ? response
      : {};
  const address =
    source.address && typeof source.address === "object" ? source.address : {};
  return trimProfileAddressText(address.id || source.id || fallbackId);
}

export function normalizeConsumerProfileAddressErrorMessage(
  error,
  fallback = "操作失败",
) {
  const source =
    error && typeof error === "object" && !Array.isArray(error) ? error : {};
  const data =
    source.data && typeof source.data === "object" && !Array.isArray(source.data)
      ? source.data
      : {};
  return (
    trimProfileAddressText(data.error) ||
    trimProfileAddressText(data.message) ||
    trimProfileAddressText(source.error) ||
    trimProfileAddressText(source.message) ||
    trimProfileAddressText(source.errMsg) ||
    fallback
  );
}

function clearSelectedConsumerProfileAddressStorage() {
  uni.removeStorageSync(CONSUMER_PROFILE_SELECTED_ADDRESS_ID_STORAGE_KEY);
  uni.removeStorageSync(CONSUMER_PROFILE_SELECTED_ADDRESS_TEXT_STORAGE_KEY);
  uni.removeStorageSync(CONSUMER_PROFILE_SELECTED_ADDRESS_PAYLOAD_STORAGE_KEY);
}

function syncSelectedConsumerProfileAddressStorage(address) {
  const payload = buildConsumerProfileSelectedAddressStoragePayload(address);
  if (!payload) {
    clearSelectedConsumerProfileAddressStorage();
    return null;
  }
  uni.setStorageSync(
    CONSUMER_PROFILE_SELECTED_ADDRESS_ID_STORAGE_KEY,
    payload.selectedAddressId,
  );
  uni.setStorageSync(
    CONSUMER_PROFILE_SELECTED_ADDRESS_TEXT_STORAGE_KEY,
    payload.selectedAddress,
  );
  uni.setStorageSync(
    CONSUMER_PROFILE_SELECTED_ADDRESS_PAYLOAD_STORAGE_KEY,
    payload.selectedAddressPayload,
  );
  return payload;
}

export function createProfileAddressListPage({
  deleteUserAddress = async () => ({}),
  fetchUserAddresses = async () => [],
  setDefaultUserAddress = async () => ({}),
} = {}) {
  return {
    data() {
      return {
        isSelectMode: false,
        manageMode: false,
        keyword: "",
        loading: false,
        addresses: [],
        selectedAddressId: "",
      };
    },
    computed: {
      filteredAddresses() {
        return filterConsumerProfileAddresses(this.addresses, this.keyword);
      },
    },
    onLoad(options) {
      this.isSelectMode = Boolean(options && options.select === "1");
    },
    onShow() {
      void this.loadAddresses();
    },
    methods: {
      currentUserId() {
        return resolveConsumerProfileAddressUserId(
          readConsumerStoredProfile({ uniApp: uni }),
        );
      },
      syncSelectedAddress(addresses = this.addresses) {
        const normalized = normalizeConsumerProfileAddressList(addresses);
        const selected = resolveConsumerProfileSelectedAddress(
          normalized,
          uni.getStorageSync(CONSUMER_PROFILE_SELECTED_ADDRESS_ID_STORAGE_KEY),
        );

        if (!selected) {
          this.selectedAddressId = "";
          clearSelectedConsumerProfileAddressStorage();
          return null;
        }

        this.selectedAddressId = selected.id;
        return syncSelectedConsumerProfileAddressStorage(selected);
      },
      cacheAddresses(addresses) {
        const cached = normalizeConsumerProfileAddressList(addresses)
          .map(buildConsumerProfileAddressCachePayload)
          .filter(Boolean);
        uni.setStorageSync(CONSUMER_PROFILE_ADDRESS_STORAGE_KEY, cached);
        this.syncSelectedAddress(cached);
      },
      async loadAddresses() {
        const userId = this.currentUserId();
        if (!userId) {
          this.addresses = normalizeConsumerProfileAddressList(
            uni.getStorageSync(CONSUMER_PROFILE_ADDRESS_STORAGE_KEY),
          );
          this.syncSelectedAddress(this.addresses);
          return;
        }

        this.loading = true;
        try {
          const list = await fetchUserAddresses(userId);
          this.addresses = normalizeConsumerProfileAddressList(list);
          this.cacheAddresses(this.addresses);
        } catch (error) {
          this.addresses = normalizeConsumerProfileAddressList(
            uni.getStorageSync(CONSUMER_PROFILE_ADDRESS_STORAGE_KEY),
          );
          this.syncSelectedAddress(this.addresses);
          uni.showToast({
            title: normalizeConsumerProfileAddressErrorMessage(
              error,
              "加载地址失败",
            ),
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      },
      toggleManage() {
        this.manageMode = !this.manageMode;
      },
      onCardTap(address) {
        if (this.manageMode && !this.isSelectMode) return;
        this.selectAddress(address);
      },
      add() {
        uni.navigateTo({ url: buildConsumerProfileAddressEditPath() });
      },
      edit(id) {
        uni.navigateTo({ url: buildConsumerProfileAddressEditPath(id) });
      },
      selectAddress(address) {
        const payload = syncSelectedConsumerProfileAddressStorage(address);
        if (!payload) return;
        this.selectedAddressId = payload.selectedAddressId;
        uni.$emit("addressSelected", payload.selectedAddressPayload);

        if (!this.isSelectMode) {
          this.edit(payload.selectedAddressId);
          return;
        }

        uni.showToast({ title: "地址已切换", icon: "success" });
        setTimeout(() => {
          uni.navigateBack();
        }, 300);
      },
      async setDefault(address) {
        if (address.isDefault) return;
        const userId = this.currentUserId();
        if (!userId) return;

        try {
          await setDefaultUserAddress(userId, address.id);
          await this.loadAddresses();
          uni.showToast({ title: "已设为默认地址", icon: "success" });
        } catch (error) {
          uni.showToast({
            title: normalizeConsumerProfileAddressErrorMessage(
              error,
              "设置默认失败",
            ),
            icon: "none",
          });
        }
      },
      async deleteAddress(id) {
        const userId = this.currentUserId();
        if (!userId) return;

        uni.showModal({
          title: "确认删除",
          content: "确定删除这个收货地址吗？",
          success: async (response) => {
            if (!response.confirm) return;
            try {
              await deleteUserAddress(userId, id);
              await this.loadAddresses();
              uni.showToast({ title: "删除成功", icon: "success" });
            } catch (error) {
              uni.showToast({
                title: normalizeConsumerProfileAddressErrorMessage(
                  error,
                  "删除失败",
                ),
                icon: "none",
              });
            }
          },
        });
      },
    },
  };
}

export function createProfileAddressEditPage({
  chooseLocation = async () => ({}),
  createUserAddress = async () => ({}),
  fetchUserAddresses = async () => [],
  getCurrentLocation = async () => ({}),
  setDefaultUserAddress = async () => ({}),
  updateUserAddress = async () => ({}),
} = {}) {
  return {
    data() {
      return {
        submitting: false,
        loading: false,
        form: createDefaultConsumerProfileAddressForm(),
        tags: createDefaultConsumerProfileAddressTags(),
      };
    },
    onLoad(query) {
      const addressId = String(query?.id || "").trim();
      if (addressId) {
        this.form.id = addressId;
        void this.loadAddressDetail();
      }
    },
    methods: {
      currentUserId() {
        return resolveConsumerProfileAddressUserId(
          readConsumerStoredProfile({ uniApp: uni }),
        );
      },
      async loadAddressDetail() {
        const userId = this.currentUserId();
        if (!userId || !this.form.id) return;

        this.loading = true;
        try {
          const list = normalizeConsumerProfileAddressList(
            await fetchUserAddresses(userId),
          );
          const current = list.find((item) => item.id === this.form.id);
          if (!current) return;
          this.form = applyConsumerProfileAddressToForm(this.form, current);
        } catch (error) {
          uni.showToast({
            title: normalizeConsumerProfileAddressErrorMessage(
              error,
              "加载地址失败",
            ),
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      },
      onDefaultChange(event) {
        this.form.isDefault = normalizeConsumerProfileAddressToggleValue(event);
      },
      chooseDeliveryLocation() {
        uni.showLoading({ title: "定位中..." });
        Promise.resolve()
          .then(() => chooseLocation())
          .then((location) => {
            Object.assign(
              this.form,
              buildConsumerProfileAddressLocationPatch(location),
            );
          })
          .catch(() =>
            getCurrentLocation().then((location) => {
              Object.assign(
                this.form,
                buildConsumerProfileAddressFallbackLocationPatch(location),
              );
            }),
          )
          .catch(() => {
            uni.showToast({ title: "定位失败", icon: "none" });
          })
          .finally(() => {
            uni.hideLoading();
          });
      },
      validate() {
        const validation = validateConsumerProfileAddressForm(this.form);
        if (!validation.valid) {
          uni.showToast({ title: validation.message, icon: "none" });
          return false;
        }
        return true;
      },
      async refreshLocalCache(userId, preferredAddressId = "") {
        const cached = normalizeConsumerProfileAddressList(
          await fetchUserAddresses(userId),
        )
          .map(buildConsumerProfileAddressCachePayload)
          .filter(Boolean);
        uni.setStorageSync(CONSUMER_PROFILE_ADDRESS_STORAGE_KEY, cached);

        const selected = resolveConsumerProfileSelectedAddress(
          cached,
          preferredAddressId,
        );
        if (!selected) {
          clearSelectedConsumerProfileAddressStorage();
          return;
        }
        syncSelectedConsumerProfileAddressStorage(selected);
      },
      async save() {
        if (this.submitting || !this.validate()) return;

        const userId = this.currentUserId();
        if (!userId) {
          uni.showToast({ title: "登录状态失效", icon: "none" });
          return;
        }

        this.submitting = true;
        try {
          const payload = buildConsumerProfileAddressSavePayload(this.form);
          const response = this.form.id
            ? await updateUserAddress(userId, this.form.id, payload)
            : await createUserAddress(userId, payload);
          const savedAddressId = resolveConsumerProfileAddressSavedId(
            response,
            this.form.id,
          );

          if (savedAddressId && this.form.isDefault) {
            await setDefaultUserAddress(userId, savedAddressId);
          }

          await this.refreshLocalCache(userId, savedAddressId);
          uni.showToast({ title: "保存成功", icon: "success" });
          setTimeout(() => {
            uni.navigateBack();
          }, 300);
        } catch (error) {
          uni.showToast({
            title: normalizeConsumerProfileAddressErrorMessage(
              error,
              "保存失败",
            ),
            icon: "none",
          });
        } finally {
          this.submitting = false;
        }
      },
    },
  };
}
