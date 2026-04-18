import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMedicineItemCountLabel,
  buildMedicineOrderRequestConfig,
  buildMedicineTrackingCallPayload,
  calculateMedicineTotalFee,
  canEstimateMedicineOrder,
  canSubmitMedicineOrder,
  countMedicineTrackingItems,
  createMedicineOrderPage,
  createMedicineTrackingPage,
  createDefaultMedicineOrderForm,
  createDefaultMedicineTrackingOrder,
  decodeMedicineOrderPrefill,
  decodeMedicineTrackingOrderId,
  extractMedicinePrescriptionFileName,
  formatMedicinePriceText,
  MEDICINE_TRACKING_TEXTS,
  normalizeMedicineTrackingOrder,
  pickMedicineOrderErrorMessage,
  pickMedicineTrackingErrorMessage,
  resolveMedicineDeliveryAddress,
  resolveMedicineRiderDisplayName,
  resolveMedicineTrackingState,
  resolveMedicineUploadedUrl,
} from "./medicine-order.js";

function createPageInstance(page) {
  const instance = {
    ...page.data(),
    ...page.methods,
  };

  Object.entries(page.computed || {}).forEach(([key, getter]) => {
    Object.defineProperty(instance, key, {
      configurable: true,
      enumerable: true,
      get: getter.bind(instance),
    });
  });

  return instance;
}

async function flushPromises() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

test("medicine order helpers normalize form input and payload config", () => {
  assert.deepEqual(createDefaultMedicineOrderForm(), {
    medOrderDesc: "",
    medPrice: "",
    hasPrescription: false,
    prescriptionFileName: "",
    prescriptionFileUrl: "",
    deliveryAddress: "请选择送药地址",
    serviceFee: 18,
    uploadingPrescription: false,
    submitting: false,
  });
  assert.equal(
    decodeMedicineOrderPrefill({ prefill: encodeURIComponent("布洛芬 一盒") }),
    "布洛芬 一盒",
  );
  assert.equal(
    resolveMedicineDeliveryAddress("  星光城  "),
    "星光城",
  );
  assert.equal(resolveMedicineUploadedUrl({ url: " https://cdn/rx.png " }), "https://cdn/rx.png");
  assert.equal(
    extractMedicinePrescriptionFileName("/tmp/prescriptions/rx.png"),
    "rx.png",
  );
  assert.equal(calculateMedicineTotalFee(22, 18), 40);

  const config = buildMedicineOrderRequestConfig({
    medOrderDesc: " 布洛芬 一盒 ",
    medPrice: "22",
    hasPrescription: true,
    prescriptionFileName: "rx.png",
    prescriptionFileUrl: "https://cdn/rx.png",
    deliveryAddress: " 星光城 ",
    serviceFee: 18,
  });
  assert.deepEqual(config, {
    serviceType: "errand_buy",
    serviceName: "极速买药",
    shopName: "极速买药",
    pickup: "就近药房",
    dropoff: "星光城",
    itemDescription: "布洛芬 一盒",
    estimatedAmount: 22,
    deliveryFee: 18,
    totalPrice: 40,
    requestExtra: {
      category: "medicine",
      hasPrescription: true,
      prescriptionFileName: "rx.png",
      prescriptionFileUrl: "https://cdn/rx.png",
    },
    requirementsExtra: {
      deliveryAddress: "星光城",
    },
  });
});

test("medicine order helpers keep submit gating and error messages stable", () => {
  assert.equal(
    canEstimateMedicineOrder({ medOrderDesc: " 布洛芬 ", medPriceNumber: 12 }),
    true,
  );
  assert.equal(
    canSubmitMedicineOrder({
      canEstimate: true,
      deliveryAddress: "朝阳区",
      hasPrescription: false,
    }),
    true,
  );
  assert.equal(
    canSubmitMedicineOrder({
      canEstimate: true,
      deliveryAddress: "请选择送药地址",
      hasPrescription: false,
    }),
    false,
  );
  assert.equal(
    canSubmitMedicineOrder({
      canEstimate: true,
      deliveryAddress: "朝阳区",
      hasPrescription: true,
      prescriptionFileUrl: "",
    }),
    false,
  );
  assert.equal(
    pickMedicineOrderErrorMessage({ data: { error: "库存不足" } }),
    "库存不足",
  );
  assert.equal(
    pickMedicineOrderErrorMessage({}, "提交失败"),
    "提交失败",
  );
});

test("medicine tracking helpers normalize order state and outbound call payload", () => {
  assert.equal(
    decodeMedicineTrackingOrderId({ id: encodeURIComponent("order-1") }),
    "order-1",
  );
  assert.deepEqual(createDefaultMedicineTrackingOrder(), {
    id: "",
    item: "",
    dropoff: "",
    amount: 0,
    deliveryFee: 0,
    totalPrice: 0,
    status: "pending",
    statusText: MEDICINE_TRACKING_TEXTS.pendingStatus,
    riderName: "",
    riderPhone: "",
    serviceType: "",
  });

  const normalizedOrder = normalizeMedicineTrackingOrder({
    id: " order-9 ",
    item: "布洛芬，感冒灵",
    dropoff: " 科技园 ",
    amount: "38",
    deliveryFee: "6",
    totalPrice: "44",
    status: "DELIVERING",
    riderName: " 李师傅 ",
    riderPhone: " 13800138000 ",
    serviceType: " errand_buy ",
  });
  assert.deepEqual(normalizedOrder, {
    id: "order-9",
    item: "布洛芬，感冒灵",
    dropoff: "科技园",
    amount: 38,
    deliveryFee: 6,
    totalPrice: 44,
    status: "delivering",
    statusText: MEDICINE_TRACKING_TEXTS.pendingStatus,
    riderName: "李师傅",
    riderPhone: "13800138000",
    serviceType: "errand_buy",
  });
  assert.deepEqual(
    resolveMedicineTrackingState(normalizedOrder),
    MEDICINE_TRACKING_TEXTS.progressStates.delivering,
  );
  assert.deepEqual(
    resolveMedicineTrackingState({ status: "unknown", statusText: "药房配货中" }),
    {
      title: "药房配货中",
      subtitle: MEDICINE_TRACKING_TEXTS.progressStates.fallback.subtitle,
      progress: MEDICINE_TRACKING_TEXTS.progressStates.fallback.progress,
    },
  );
  assert.equal(countMedicineTrackingItems("布洛芬, 感冒灵\n维C"), 3);
  assert.equal(buildMedicineItemCountLabel(3), "共 3 件");
  assert.equal(resolveMedicineRiderDisplayName({}, MEDICINE_TRACKING_TEXTS), "待系统分配");
  assert.equal(formatMedicinePriceText("44.5"), "44.50");
  assert.deepEqual(buildMedicineTrackingCallPayload(normalizedOrder), {
    targetRole: "rider",
    targetPhone: "13800138000",
    entryPoint: "medicine_tracking",
    scene: "medicine_order_contact",
    orderId: "order-9",
    roomId: "rider_order-9",
    pagePath: "/pages/medicine/tracking",
    metadata: {
      status: "delivering",
      serviceType: "errand_buy",
      riderName: "李师傅",
    },
  });
  assert.equal(
    pickMedicineTrackingErrorMessage({ error: "订单加载失败" }),
    "订单加载失败",
  );
});

test("medicine order page uploads prescription and submits through shared order flow", async () => {
  const storage = {
    selectedAddress: "科技园 A 座",
  };
  const loadingStates = [];
  const createdOrders = [];
  const navigateToUrls = [];
  let chooseImagePromise = Promise.resolve();
  const originalUni = globalThis.uni;

  globalThis.uni = {
    getStorageSync(key) {
      return storage[key];
    },
    showLoading(payload) {
      loadingStates.push(`show:${payload.title}`);
    },
    hideLoading() {
      loadingStates.push("hide");
    },
    chooseImage({ success }) {
      chooseImagePromise = Promise.resolve(
        success?.({ tempFilePaths: ["/tmp/prescriptions/rx.png"] }),
      );
    },
    navigateTo({ url }) {
      navigateToUrls.push(url);
    },
    showToast() {},
    navigateBack() {},
  };

  try {
    const page = createMedicineOrderPage({
      createOrder: async (payload) => {
        createdOrders.push(payload);
        return { id: "order-9" };
      },
      uploadCommonImage: async (filePath, options) => {
        assert.equal(filePath, "/tmp/prescriptions/rx.png");
        assert.equal(options.uploadDomain, "medical_document");
        return { url: "https://cdn.example.com/rx.png" };
      },
      buildErrandOrderPayload: (payload, identity) => ({
        ...payload,
        userId: identity.userId,
      }),
      requireCurrentUserIdentity: () => ({ userId: "user-1" }),
    });
    const instance = createPageInstance(page);

    page.onLoad.call(instance, {
      prefill: encodeURIComponent("布洛芬 一盒"),
    });

    assert.equal(instance.medOrderDesc, "布洛芬 一盒");
    assert.equal(instance.deliveryAddress, "科技园 A 座");

    instance.onRxChange({ detail: { value: true } });
    instance.uploadPrescription();
    await chooseImagePromise;
    await flushPromises();

    assert.equal(instance.prescriptionFileName, "rx.png");
    assert.equal(instance.prescriptionFileUrl, "https://cdn.example.com/rx.png");

    instance.medPrice = "22";
    await instance.submit();

    assert.deepEqual(createdOrders, [
      {
        serviceType: "errand_buy",
        serviceName: "极速买药",
        shopName: "极速买药",
        pickup: "就近药房",
        dropoff: "科技园 A 座",
        itemDescription: "布洛芬 一盒",
        estimatedAmount: 22,
        deliveryFee: 18,
        totalPrice: 40,
        requestExtra: {
          category: "medicine",
          hasPrescription: true,
          prescriptionFileName: "rx.png",
          prescriptionFileUrl: "https://cdn.example.com/rx.png",
        },
        requirementsExtra: {
          deliveryAddress: "科技园 A 座",
        },
        userId: "user-1",
      },
    ]);
    assert.deepEqual(navigateToUrls, [
      "/pages/medicine/tracking?id=order-9",
    ]);
    assert.deepEqual(loadingStates, [
      "show:上传处方中...",
      "hide",
      "show:提交中...",
      "hide",
    ]);
  } finally {
    globalThis.uni = originalUni;
  }
});

test("medicine tracking page loads order and calls rider with shared contact helper", async () => {
  const loadingStates = [];
  const phoneCalls = [];
  const auditPayloads = [];
  const switchTabUrls = [];
  let navigateBackCount = 0;
  const originalUni = globalThis.uni;

  globalThis.uni = {
    showLoading(payload) {
      loadingStates.push(`show:${payload.title}`);
    },
    hideLoading() {
      loadingStates.push("hide");
    },
    showToast() {},
    navigateBack() {
      navigateBackCount += 1;
    },
    switchTab({ url }) {
      switchTabUrls.push(url);
    },
    makePhoneCall({ phoneNumber, success }) {
      phoneCalls.push(phoneNumber);
      success?.();
    },
    getSystemInfoSync() {
      return { uniPlatform: "app" };
    },
  };

  try {
    const page = createMedicineTrackingPage({
      fetchOrderDetail: async (id) => ({
        id,
        item: "布洛芬, 感冒灵",
        dropoff: "科技园 A 座",
        amount: 38,
        deliveryFee: 6,
        totalPrice: 44,
        status: "delivering",
        riderName: "李师傅",
        riderPhone: "13800138000",
        serviceType: "errand_buy",
      }),
      mapErrandOrderDetail: (payload) => payload,
      recordPhoneContactClick: async (payload) => {
        auditPayloads.push(payload);
      },
    });
    const instance = createPageInstance(page);

    page.onLoad.call(instance, { id: encodeURIComponent("order-9") });
    await flushPromises();

    assert.equal(instance.order.id, "order-9");
    assert.equal(instance.itemCountLabel, "共 2 件");
    assert.equal(instance.riderDisplayName, "李师傅");
    assert.equal(instance.trackingState.title, "骑手正在配送途中");

    instance.callRider();
    await flushPromises();
    instance.finish();
    instance.back();

    assert.deepEqual(loadingStates, ["show:加载中...", "hide"]);
    assert.deepEqual(phoneCalls, ["13800138000"]);
    assert.equal(auditPayloads[0]?.targetRole, "rider");
    assert.equal(auditPayloads[0]?.orderId, "order-9");
    assert.deepEqual(switchTabUrls, ["/pages/index/index"]);
    assert.equal(navigateBackCount, 1);
  } finally {
    globalThis.uni = originalUni;
  }
});
