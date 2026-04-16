export const DEFAULT_MEDICINE_DELIVERY_ADDRESS = "请选择送药地址";
export const DEFAULT_MEDICINE_SERVICE_FEE = 18;

export const MEDICINE_TRACKING_TEXTS = {
  riderLabel: "配送骑手",
  deliveringBadge: "配送中",
  itemListTitle: "药品清单",
  emptyItem: "未获取到订单内容",
  addressTitle: "送药地址",
  emptyAddress: "未填写地址",
  amountLabel: "药品预计",
  deliveryFeeLabel: "跑腿费",
  totalLabel: "订单合计",
  backHome: "返回首页",
  trackingHint:
    "真实订单轨迹已接入后端，状态会随骑手履约实时更新。",
  pendingStatus: "待接单",
  missingOrderId: "缺少订单ID",
  loading: "加载中...",
  loadFailed: "订单加载失败",
  riderUnavailable: "骑手暂未接单",
  callFailed: "无法拨打电话，请检查权限",
  riderUnassigned: "待系统分配",
  progressStates: {
    pending: {
      title: "正在指派最近骑手",
      subtitle: "系统正在为您匹配附近药房与骑手",
      progress: 20,
    },
    accepted: {
      title: "骑手已接单，正在前往药房",
      subtitle: "请保持电话畅通，方便骑手与您联系",
      progress: 45,
    },
    delivering: {
      title: "骑手正在配送途中",
      subtitle: "药品已备齐，正在送往您的位置",
      progress: 80,
    },
    completed: {
      title: "药品已送达，请及时查收",
      subtitle: "订单已完成，如有问题请联系平台客服",
      progress: 100,
    },
    cancelled: {
      title: "订单已取消",
      subtitle: "如有疑问，请联系平台客服处理",
      progress: 0,
    },
    fallback: {
      title: "订单处理中",
      subtitle: "请稍后查看最新状态",
      progress: 30,
    },
  },
};

function trimMedicineValue(value) {
  return String(value || "").trim();
}

export function createDefaultMedicineOrderForm() {
  return {
    medOrderDesc: "",
    medPrice: "",
    hasPrescription: false,
    prescriptionFileName: "",
    prescriptionFileUrl: "",
    deliveryAddress: DEFAULT_MEDICINE_DELIVERY_ADDRESS,
    serviceFee: DEFAULT_MEDICINE_SERVICE_FEE,
    uploadingPrescription: false,
    submitting: false,
  };
}

export function decodeMedicineOrderPrefill(query = {}) {
  const rawPrefill = trimMedicineValue(query?.prefill);
  if (!rawPrefill) {
    return "";
  }
  try {
    return decodeURIComponent(rawPrefill);
  } catch (_error) {
    return rawPrefill;
  }
}

export function decodeMedicineTrackingOrderId(query = {}) {
  const rawId = trimMedicineValue(query?.id);
  if (!rawId) {
    return "";
  }
  try {
    return decodeURIComponent(rawId);
  } catch (_error) {
    return rawId;
  }
}

export function resolveMedicineDeliveryAddress(
  selectedAddress,
  fallback = DEFAULT_MEDICINE_DELIVERY_ADDRESS,
) {
  return trimMedicineValue(selectedAddress) || fallback;
}

export function normalizeMedicinePriceNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolveMedicineUploadedUrl(uploadResult = {}) {
  return trimMedicineValue(uploadResult?.url);
}

export function extractMedicinePrescriptionFileName(
  filePath,
  fallbackName = "已上传处方",
) {
  const normalizedPath = trimMedicineValue(filePath);
  if (!normalizedPath) {
    return fallbackName;
  }
  const parts = normalizedPath.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || fallbackName;
}

export function canEstimateMedicineOrder({
  medOrderDesc = "",
  medPriceNumber = 0,
} = {}) {
  return (
    trimMedicineValue(medOrderDesc) !== "" &&
    normalizeMedicinePriceNumber(medPriceNumber) > 0
  );
}

export function canSubmitMedicineOrder({
  canEstimate = false,
  deliveryAddress = "",
  hasPrescription = false,
  prescriptionFileUrl = "",
  defaultAddress = DEFAULT_MEDICINE_DELIVERY_ADDRESS,
} = {}) {
  if (!canEstimate) {
    return false;
  }
  const address = trimMedicineValue(deliveryAddress);
  if (!address || address === defaultAddress) {
    return false;
  }
  if (hasPrescription && !trimMedicineValue(prescriptionFileUrl)) {
    return false;
  }
  return true;
}

export function calculateMedicineTotalFee(
  medPriceNumber = 0,
  serviceFee = DEFAULT_MEDICINE_SERVICE_FEE,
) {
  return (
    Math.max(0, normalizeMedicinePriceNumber(serviceFee)) +
    Math.max(0, normalizeMedicinePriceNumber(medPriceNumber))
  );
}

export function buildMedicineOrderRequestConfig(form = {}) {
  const medOrderDesc = trimMedicineValue(form.medOrderDesc);
  const medPriceNumber = Math.max(
    0,
    normalizeMedicinePriceNumber(form.medPriceNumber ?? form.medPrice),
  );
  const serviceFee = Math.max(
    0,
    normalizeMedicinePriceNumber(
      form.serviceFee ?? DEFAULT_MEDICINE_SERVICE_FEE,
    ),
  );
  const deliveryAddress = trimMedicineValue(form.deliveryAddress);
  const totalFee = calculateMedicineTotalFee(medPriceNumber, serviceFee);

  return {
    serviceType: "errand_buy",
    serviceName: "极速买药",
    shopName: "极速买药",
    pickup: "就近药房",
    dropoff: deliveryAddress,
    itemDescription: medOrderDesc,
    estimatedAmount: medPriceNumber,
    deliveryFee: serviceFee,
    totalPrice: totalFee,
    requestExtra: {
      category: "medicine",
      hasPrescription: Boolean(form.hasPrescription),
      prescriptionFileName: trimMedicineValue(form.prescriptionFileName),
      prescriptionFileUrl: trimMedicineValue(form.prescriptionFileUrl),
    },
    requirementsExtra: {
      deliveryAddress,
    },
  };
}

export function pickMedicineOrderErrorMessage(
  error,
  fallback = "提交失败",
) {
  return error?.data?.error || error?.error || error?.message || fallback;
}

export function createDefaultMedicineTrackingOrder(
  texts = MEDICINE_TRACKING_TEXTS,
) {
  return {
    id: "",
    item: "",
    dropoff: "",
    amount: 0,
    deliveryFee: 0,
    totalPrice: 0,
    status: "pending",
    statusText: texts.pendingStatus || MEDICINE_TRACKING_TEXTS.pendingStatus,
    riderName: "",
    riderPhone: "",
    serviceType: "",
  };
}

export function normalizeMedicineTrackingOrder(
  order = {},
  texts = MEDICINE_TRACKING_TEXTS,
) {
  const defaults = createDefaultMedicineTrackingOrder(texts);
  return {
    ...defaults,
    ...order,
    id: trimMedicineValue(order.id || defaults.id),
    item: trimMedicineValue(order.item || defaults.item),
    dropoff: trimMedicineValue(order.dropoff || defaults.dropoff),
    amount: Math.max(0, normalizeMedicinePriceNumber(order.amount)),
    deliveryFee: Math.max(0, normalizeMedicinePriceNumber(order.deliveryFee)),
    totalPrice: Math.max(0, normalizeMedicinePriceNumber(order.totalPrice)),
    status:
      trimMedicineValue(order.status).toLowerCase() || defaults.status,
    statusText:
      trimMedicineValue(order.statusText) || defaults.statusText,
    riderName: trimMedicineValue(order.riderName),
    riderPhone: trimMedicineValue(order.riderPhone),
    serviceType: trimMedicineValue(order.serviceType),
  };
}

export function resolveMedicineTrackingState(
  order = {},
  texts = MEDICINE_TRACKING_TEXTS,
) {
  const progressStates =
    texts?.progressStates || MEDICINE_TRACKING_TEXTS.progressStates;
  const status = trimMedicineValue(order?.status).toLowerCase();
  if (status && progressStates[status]) {
    return progressStates[status];
  }
  return {
    title:
      trimMedicineValue(order?.statusText) || progressStates.fallback.title,
    subtitle: progressStates.fallback.subtitle,
    progress: progressStates.fallback.progress,
  };
}

export function countMedicineTrackingItems(itemText = "") {
  const text = trimMedicineValue(itemText);
  if (!text) {
    return 0;
  }
  return text.split(/[,，\n ]+/).filter(Boolean).length;
}

export function buildMedicineItemCountLabel(itemCount = 0) {
  const count = Math.max(0, Number(itemCount) || 0);
  return `共 ${count} 件`;
}

export function resolveMedicineRiderDisplayName(
  order = {},
  texts = MEDICINE_TRACKING_TEXTS,
) {
  return (
    trimMedicineValue(order?.riderName) ||
    texts.riderUnassigned ||
    MEDICINE_TRACKING_TEXTS.riderUnassigned
  );
}

export function formatMedicinePriceText(value) {
  return normalizeMedicinePriceNumber(value).toFixed(2);
}

export function buildMedicineTrackingCallPayload(order = {}) {
  const normalizedOrder = normalizeMedicineTrackingOrder(order);
  return {
    targetRole: "rider",
    targetPhone: normalizedOrder.riderPhone,
    entryPoint: "medicine_tracking",
    scene: "medicine_order_contact",
    orderId: normalizedOrder.id,
    roomId: normalizedOrder.id ? `rider_${normalizedOrder.id}` : "",
    pagePath: "/pages/medicine/tracking",
    metadata: {
      status: normalizedOrder.status,
      serviceType: normalizedOrder.serviceType,
      riderName: normalizedOrder.riderName,
    },
  };
}

export function pickMedicineTrackingErrorMessage(
  error,
  texts = MEDICINE_TRACKING_TEXTS,
  fallback,
) {
  return (
    error?.data?.error ||
    error?.error ||
    error?.message ||
    fallback ||
    texts.loadFailed ||
    MEDICINE_TRACKING_TEXTS.loadFailed
  );
}
