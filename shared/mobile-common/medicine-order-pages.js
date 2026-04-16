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
  normalizeMedicinePriceNumber,
  normalizeMedicineTrackingOrder,
  pickMedicineOrderErrorMessage,
  pickMedicineTrackingErrorMessage,
  resolveMedicineDeliveryAddress,
  resolveMedicineRiderDisplayName,
  resolveMedicineTrackingState,
  resolveMedicineUploadedUrl,
} from "../../packages/mobile-core/src/medicine-order.js";
import { createPhoneContactHelper } from "./phone-contact.js";

export function createMedicineOrderPage({
  createOrder = async () => ({}),
  uploadCommonImage = async () => ({}),
  buildErrandOrderPayload = (payload) => payload,
  requireCurrentUserIdentity = () => null,
} = {}) {
  return {
    data() {
      return createDefaultMedicineOrderForm();
    },
    computed: {
      medPriceNumber() {
        return normalizeMedicinePriceNumber(this.medPrice);
      },
      canEstimate() {
        return canEstimateMedicineOrder({
          medOrderDesc: this.medOrderDesc,
          medPriceNumber: this.medPriceNumber,
        });
      },
      canSubmit() {
        return canSubmitMedicineOrder({
          canEstimate: this.canEstimate,
          deliveryAddress: this.deliveryAddress,
          hasPrescription: this.hasPrescription,
          prescriptionFileUrl: this.prescriptionFileUrl,
        });
      },
      totalFee() {
        return calculateMedicineTotalFee(this.medPriceNumber, this.serviceFee);
      },
    },
    onLoad(query = {}) {
      const prefill = decodeMedicineOrderPrefill(query);
      if (prefill) {
        this.medOrderDesc = prefill;
      }
      this.syncAddress();
    },
    onShow() {
      this.syncAddress();
    },
    methods: {
      syncAddress() {
        this.deliveryAddress = resolveMedicineDeliveryAddress(
          uni.getStorageSync("selectedAddress"),
        );
      },
      back() {
        uni.navigateBack();
      },
      onRxChange(event) {
        this.hasPrescription = Boolean(event?.detail?.value);
        if (!this.hasPrescription) {
          this.prescriptionFileName = "";
          this.prescriptionFileUrl = "";
        }
      },
      selectAddress() {
        uni.navigateTo({ url: "/pages/profile/address-list/index?select=1" });
      },
      uploadPrescription() {
        if (this.uploadingPrescription) {
          return;
        }
        uni.chooseImage({
          count: 1,
          success: async (res) => {
            const filePath = res?.tempFilePaths?.[0];
            if (!filePath) {
              return;
            }
            this.uploadingPrescription = true;
            uni.showLoading({ title: "上传处方中...", mask: true });
            try {
              const uploadResult = await uploadCommonImage(filePath);
              const prescriptionFileUrl = resolveMedicineUploadedUrl(uploadResult);
              if (!prescriptionFileUrl) {
                throw new Error("上传失败");
              }
              this.prescriptionFileName =
                extractMedicinePrescriptionFileName(filePath);
              this.prescriptionFileUrl = prescriptionFileUrl;
            } catch (_error) {
              uni.showToast({ title: "处方上传失败", icon: "none" });
            } finally {
              uni.hideLoading();
              this.uploadingPrescription = false;
            }
          },
        });
      },
      async submit() {
        if (!this.canSubmit || this.submitting) {
          return;
        }
        const identity = requireCurrentUserIdentity();
        if (!identity) {
          return;
        }

        this.submitting = true;
        uni.showLoading({ title: "提交中...", mask: true });
        try {
          const payload = buildErrandOrderPayload(
            buildMedicineOrderRequestConfig({
              medOrderDesc: this.medOrderDesc,
              medPriceNumber: this.medPriceNumber,
              hasPrescription: this.hasPrescription,
              prescriptionFileName: this.prescriptionFileName,
              prescriptionFileUrl: this.prescriptionFileUrl,
              deliveryAddress: this.deliveryAddress,
              serviceFee: this.serviceFee,
            }),
            identity,
          );

          const result = await createOrder(payload);
          if (!result || !result.id) {
            throw new Error("订单创建失败");
          }
          uni.navigateTo({
            url: `/pages/medicine/tracking?id=${encodeURIComponent(result.id)}`,
          });
        } catch (error) {
          uni.showToast({
            title: pickMedicineOrderErrorMessage(error),
            icon: "none",
          });
        } finally {
          uni.hideLoading();
          this.submitting = false;
        }
      },
    },
  };
}

export function createMedicineTrackingPage({
  fetchOrderDetail = async () => ({}),
  mapErrandOrderDetail = (payload) => payload || {},
  recordPhoneContactClick = async () => ({}),
} = {}) {
  const phoneContactHelper = createPhoneContactHelper({ recordPhoneContactClick });

  return {
    data() {
      return {
        texts: MEDICINE_TRACKING_TEXTS,
        order: createDefaultMedicineTrackingOrder(MEDICINE_TRACKING_TEXTS),
      };
    },
    computed: {
      trackingState() {
        return resolveMedicineTrackingState(this.order, this.texts);
      },
      itemCount() {
        return countMedicineTrackingItems(this.order.item);
      },
      itemCountLabel() {
        return buildMedicineItemCountLabel(this.itemCount);
      },
      riderDisplayName() {
        return resolveMedicineRiderDisplayName(this.order, this.texts);
      },
      amountText() {
        return formatMedicinePriceText(this.order.amount);
      },
      deliveryFeeText() {
        return formatMedicinePriceText(this.order.deliveryFee);
      },
      totalPriceText() {
        return formatMedicinePriceText(this.order.totalPrice);
      },
    },
    onLoad(query = {}) {
      const id = decodeMedicineTrackingOrderId(query);
      if (!id) {
        uni.showToast({ title: this.texts.missingOrderId, icon: "none" });
        return;
      }
      void this.loadOrder(id);
    },
    methods: {
      async loadOrder(id) {
        uni.showLoading({ title: this.texts.loading });
        try {
          const data = await fetchOrderDetail(id);
          this.order = normalizeMedicineTrackingOrder(
            mapErrandOrderDetail(data || {}),
            this.texts,
          );
        } catch (error) {
          uni.showToast({
            title: pickMedicineTrackingErrorMessage(error, this.texts),
            icon: "none",
          });
          this.order = {
            ...this.order,
            id: String(id || ""),
          };
        } finally {
          uni.hideLoading();
        }
      },
      back() {
        uni.navigateBack();
      },
      finish() {
        uni.switchTab({ url: "/pages/index/index" });
      },
      callRider() {
        if (!this.order.riderPhone) {
          uni.showToast({ title: this.texts.riderUnavailable, icon: "none" });
          return;
        }

        phoneContactHelper
          .makePhoneCall(buildMedicineTrackingCallPayload(this.order))
          .catch(() => {
            uni.showToast({
              title: this.texts.callFailed,
              icon: "none",
            });
          });
      },
    },
  };
}
