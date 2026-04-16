import {
  applyConsumerProfileAddressToForm,
  buildConsumerProfileAddressCachePayload,
  buildConsumerProfileAddressEditPath,
  buildConsumerProfileAddressFallbackLocationPatch,
  buildConsumerProfileAddressLocationPatch,
  buildConsumerProfileAddressSavePayload,
  buildConsumerProfileSelectedAddressStoragePayload,
  CONSUMER_PROFILE_ADDRESS_STORAGE_KEY,
  CONSUMER_PROFILE_SELECTED_ADDRESS_ID_STORAGE_KEY,
  CONSUMER_PROFILE_SELECTED_ADDRESS_PAYLOAD_STORAGE_KEY,
  CONSUMER_PROFILE_SELECTED_ADDRESS_TEXT_STORAGE_KEY,
  createDefaultConsumerProfileAddressForm,
  createDefaultConsumerProfileAddressTags,
  filterConsumerProfileAddresses,
  normalizeConsumerProfileAddressErrorMessage,
  normalizeConsumerProfileAddressList,
  normalizeConsumerProfileAddressToggleValue,
  resolveConsumerProfileAddressSavedId,
  resolveConsumerProfileAddressUserId,
  resolveConsumerProfileSelectedAddress,
  validateConsumerProfileAddressForm,
} from "../../packages/mobile-core/src/profile-address.js";

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
          uni.getStorageSync("userProfile") || {},
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
          uni.getStorageSync("userProfile") || {},
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
