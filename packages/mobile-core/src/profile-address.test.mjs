import test from "node:test";
import assert from "node:assert/strict";

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
  createProfileAddressEditPage,
  createProfileAddressListPage,
  createDefaultConsumerProfileAddressForm,
  createDefaultConsumerProfileAddressTags,
  DEFAULT_CONSUMER_PROFILE_ADDRESS_TAG,
  filterConsumerProfileAddresses,
  normalizeConsumerProfileAddressErrorMessage,
  normalizeConsumerProfileAddressList,
  normalizeConsumerProfileAddressRecord,
  normalizeConsumerProfileAddressToggleValue,
  resolveConsumerProfileAddressSavedId,
  resolveConsumerProfileAddressUserId,
  resolveConsumerProfileSelectedAddress,
  validateConsumerProfileAddressForm,
} from "./profile-address.js";

test("profile address helpers expose stable defaults and normalization", () => {
  assert.equal(CONSUMER_PROFILE_ADDRESS_STORAGE_KEY, "addresses");
  assert.equal(
    CONSUMER_PROFILE_SELECTED_ADDRESS_ID_STORAGE_KEY,
    "selectedAddressId",
  );
  assert.equal(
    CONSUMER_PROFILE_SELECTED_ADDRESS_TEXT_STORAGE_KEY,
    "selectedAddress",
  );
  assert.equal(
    CONSUMER_PROFILE_SELECTED_ADDRESS_PAYLOAD_STORAGE_KEY,
    "selectedAddressPayload",
  );
  assert.equal(DEFAULT_CONSUMER_PROFILE_ADDRESS_TAG, "家");
  assert.deepEqual(createDefaultConsumerProfileAddressTags(), ["家", "公司", "学校"]);
  assert.deepEqual(createDefaultConsumerProfileAddressForm(), {
    id: "",
    name: "",
    phone: "",
    address: "",
    detail: "",
    tag: "家",
    latitude: 0,
    longitude: 0,
    isDefault: false,
  });
  assert.equal(
    resolveConsumerProfileAddressUserId({ id: "u-1", userId: "u-2" }),
    "u-1",
  );
  assert.deepEqual(
    normalizeConsumerProfileAddressRecord({
      id: "addr-1",
      name: "小陈",
      phone: "13812345678",
      address: "软件园路 88 号",
      detail: "3 号楼 1201",
      tag: "",
      latitude: "30.1",
      longitude: "120.2",
      isDefault: 1,
    }),
    {
      id: "addr-1",
      name: "小陈",
      phone: "13812345678",
      tag: "家",
      address: "软件园路 88 号",
      roomDetail: "3 号楼 1201",
      detail: "软件园路 88 号 3 号楼 1201",
      fullAddress: "软件园路 88 号 3 号楼 1201",
      latitude: 30.1,
      longitude: 120.2,
      isDefault: true,
    },
  );
});

test("profile address helpers filter selection and storage payloads", () => {
  const addresses = normalizeConsumerProfileAddressList([
    {
      id: "addr-1",
      name: "小陈",
      phone: "13812345678",
      address: "科技园",
      detail: "A 座",
      isDefault: true,
    },
    {
      id: "addr-2",
      name: "小林",
      phone: "13912345678",
      address: "大学城",
      detail: "B 座",
      tag: "学校",
    },
  ]);
  assert.equal(filterConsumerProfileAddresses(addresses, "大学").length, 1);
  assert.equal(resolveConsumerProfileSelectedAddress(addresses, "addr-2")?.id, "addr-2");
  assert.equal(resolveConsumerProfileSelectedAddress(addresses, "")?.id, "addr-1");
  assert.deepEqual(
    buildConsumerProfileAddressCachePayload(addresses[0]),
    {
      id: "addr-1",
      name: "小陈",
      phone: "13812345678",
      tag: "家",
      address: "科技园",
      roomDetail: "A 座",
      detail: "科技园 A 座",
      fullAddress: "科技园 A 座",
      latitude: 0,
      longitude: 0,
      isDefault: true,
    },
  );
  assert.deepEqual(
    buildConsumerProfileSelectedAddressStoragePayload(addresses[0]),
    {
      selectedAddressId: "addr-1",
      selectedAddress: "科技园 A 座",
      selectedAddressPayload: {
        id: "addr-1",
        name: "小陈",
        phone: "13812345678",
        tag: "家",
        address: "科技园",
        roomDetail: "A 座",
        detail: "科技园 A 座",
        fullAddress: "科技园 A 座",
        latitude: 0,
        longitude: 0,
        isDefault: true,
      },
    },
  );
  assert.equal(
    buildConsumerProfileAddressEditPath("addr 1"),
    "/pages/profile/address-edit/index?id=addr%201",
  );
});

test("profile address helpers validate forms and save semantics", () => {
  assert.deepEqual(validateConsumerProfileAddressForm({}), {
    valid: false,
    message: "请填写完整信息",
  });
  assert.deepEqual(validateConsumerProfileAddressForm({
    name: "小陈",
    phone: "123",
    address: "科技园",
  }), {
    valid: false,
    message: "手机号格式不正确",
  });
  assert.deepEqual(validateConsumerProfileAddressForm({
    name: "小陈",
    phone: "13812345678",
    address: "科技园",
  }), { valid: true, message: "" });
  assert.deepEqual(
    buildConsumerProfileAddressSavePayload({
      name: " 小陈 ",
      phone: " 13812345678 ",
      address: " 科技园 ",
      detail: " 1 栋 1201 ",
      tag: "",
      latitude: "30.11",
      longitude: "120.22",
      isDefault: 1,
    }),
    {
      name: "小陈",
      phone: "13812345678",
      tag: "家",
      address: "科技园",
      detail: "1 栋 1201",
      latitude: 30.11,
      longitude: 120.22,
      isDefault: true,
    },
  );
  assert.deepEqual(
    applyConsumerProfileAddressToForm(createDefaultConsumerProfileAddressForm(), {
      id: "addr-1",
      name: "小陈",
      phone: "13812345678",
      address: "科技园",
      detail: "1 栋 1201",
      tag: "公司",
      latitude: 30,
      longitude: 120,
      isDefault: true,
    }),
    {
      id: "addr-1",
      name: "小陈",
      phone: "13812345678",
      address: "科技园",
      detail: "1 栋 1201",
      tag: "公司",
      latitude: 30,
      longitude: 120,
      isDefault: true,
    },
  );
  assert.equal(
    resolveConsumerProfileAddressSavedId({ address: { id: "addr-9" } }, "old"),
    "addr-9",
  );
  assert.equal(
    normalizeConsumerProfileAddressToggleValue({ detail: { value: 0 } }),
    false,
  );
});

test("profile address helpers normalize locations and error messages", () => {
  assert.deepEqual(
    buildConsumerProfileAddressLocationPatch({
      address: "科技园 88 号",
      latitude: "30.1",
      longitude: "120.2",
    }),
    {
      address: "科技园 88 号",
      latitude: 30.1,
      longitude: 120.2,
    },
  );
  assert.deepEqual(
    buildConsumerProfileAddressFallbackLocationPatch({
      latitude: 30.123456,
      longitude: 120.654321,
    }),
    {
      address: "30.123456,120.654321",
      latitude: 30.123456,
      longitude: 120.654321,
    },
  );
  assert.equal(
    normalizeConsumerProfileAddressErrorMessage(
      { data: { message: "加载地址失败" } },
      "fallback",
    ),
    "加载地址失败",
  );
});

test("profile address list page syncs selection into shared storage", async () => {
  const storage = {
    userProfile: { id: "user-1" },
  };
  const events = [];
  let navigatedBack = 0;
  const originalUni = globalThis.uni;
  const originalSetTimeout = globalThis.setTimeout;

  globalThis.setTimeout = (callback) => {
    callback();
    return 0;
  };
  globalThis.uni = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    removeStorageSync(key) {
      delete storage[key];
    },
    showToast() {},
    navigateBack() {
      navigatedBack += 1;
    },
    navigateTo() {},
    $emit(eventName, payload) {
      events.push({ eventName, payload });
    },
  };

  try {
    const page = createProfileAddressListPage({
      fetchUserAddresses: async () => [
        {
          id: "addr-1",
          name: "小陈",
          phone: "13812345678",
          address: "科技园",
          detail: "A 座",
          isDefault: true,
        },
      ],
    });
    const instance = {
      ...page.data(),
      ...page.methods,
      isSelectMode: true,
    };

    await instance.loadAddresses();
    instance.selectAddress(instance.addresses[0]);

    assert.equal(instance.selectedAddressId, "addr-1");
    assert.equal(storage.selectedAddressId, "addr-1");
    assert.equal(storage.selectedAddress, "科技园 A 座");
    assert.equal(events[0]?.eventName, "addressSelected");
    assert.equal(navigatedBack, 1);
  } finally {
    globalThis.uni = originalUni;
    globalThis.setTimeout = originalSetTimeout;
  }
});

test("profile address edit page saves address and refreshes local cache", async () => {
  const storage = {
    userProfile: { id: "user-1" },
  };
  let navigatedBack = 0;
  const defaultCalls = [];
  const originalUni = globalThis.uni;
  const originalSetTimeout = globalThis.setTimeout;

  globalThis.setTimeout = (callback) => {
    callback();
    return 0;
  };
  globalThis.uni = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    removeStorageSync(key) {
      delete storage[key];
    },
    showToast() {},
    showLoading() {},
    hideLoading() {},
    navigateBack() {
      navigatedBack += 1;
    },
  };

  try {
    const savedAddresses = [
      {
        id: "addr-2",
        name: "小陈",
        phone: "13812345678",
        address: "软件园",
        detail: "2 栋 1001",
        isDefault: true,
      },
    ];
    const page = createProfileAddressEditPage({
      createUserAddress: async () => ({
        address: { id: "addr-2" },
      }),
      fetchUserAddresses: async () => savedAddresses,
      setDefaultUserAddress: async (_userId, addressId) => {
        defaultCalls.push(addressId);
      },
    });
    const instance = {
      ...page.data(),
      ...page.methods,
      form: {
        id: "",
        name: "小陈",
        phone: "13812345678",
        address: "软件园",
        detail: "2 栋 1001",
        tag: "家",
        latitude: 0,
        longitude: 0,
        isDefault: true,
      },
    };

    await instance.save();

    assert.deepEqual(defaultCalls, ["addr-2"]);
    assert.equal(storage.addresses[0].id, "addr-2");
    assert.equal(storage.selectedAddressId, "addr-2");
    assert.equal(navigatedBack, 1);
  } finally {
    globalThis.uni = originalUni;
    globalThis.setTimeout = originalSetTimeout;
  }
});
