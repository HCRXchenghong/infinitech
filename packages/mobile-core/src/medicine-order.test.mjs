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
