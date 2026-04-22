import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  applyCouponClaimSuccess,
  formatCouponDisplayAmount,
  formatCouponLandingRuleText,
  formatCouponValidityRange,
  getCouponClaimBlockedText,
  getCouponLandingRemainingText,
  isCouponPhoneValid,
} from '@infinitech/admin-core';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';

export function useCouponLandingPage({ request, ElMessage }) {
  const route = useRoute();
  const loading = ref(true);
  const loadError = ref('');
  const view = ref('gift');
  const coupon = ref(null);
  const phone = ref('');
  const claiming = ref(false);
  const isClaimed = ref(false);
  const toastMessage = ref('');

  const token = computed(() => String(route.params.token || '').trim());

  const displayAmount = computed(() => formatCouponDisplayAmount(coupon.value));
  const couponRuleText = computed(() => formatCouponLandingRuleText(coupon.value));
  const validityText = computed(() => formatCouponValidityRange(coupon.value));
  const remainingText = computed(() => getCouponLandingRemainingText(coupon.value));
  const claimBlockedText = computed(() => getCouponClaimBlockedText(coupon.value));
  const claimButtonText = computed(() => {
    if (claiming.value) {
      return '领取中...';
    }

    if (claimBlockedText.value) {
      return claimBlockedText.value;
    }

    return '立即领取';
  });

  watch(token, () => {
    resetState();
    void loadCoupon();
  });

  onMounted(() => {
    void loadCoupon();
  });

  function resetState() {
    loading.value = true;
    loadError.value = '';
    view.value = 'gift';
    coupon.value = null;
    phone.value = '';
    claiming.value = false;
    isClaimed.value = false;
    toastMessage.value = '';
  }

  async function loadCoupon() {
    if (!token.value) {
      loadError.value = '领券链接无效';
      loading.value = false;
      return;
    }

    loading.value = true;
    loadError.value = '';

    try {
      const { data } = await request.get(`/api/coupons/link/${encodeURIComponent(token.value)}`);
      const enveloped = extractEnvelopeData(data);
      const payload = enveloped?.coupon || enveloped || null;
      if (!payload || !payload.id) {
        throw new Error('优惠券信息无效');
      }
      coupon.value = payload;
    } catch (error) {
      loadError.value = extractErrorMessage(error, '领券链接不可用');
    } finally {
      loading.value = false;
    }
  }

  function handleOpenGift() {
    if (view.value !== 'gift') {
      return;
    }

    view.value = 'opening';
    window.setTimeout(() => {
      view.value = 'coupon';
    }, 1200);
  }

  async function handleClaim() {
    if (claiming.value || claimBlockedText.value) {
      return;
    }

    const input = String(phone.value || '').trim();
    if (!isCouponPhoneValid(input)) {
      ElMessage.warning('请输入注册手机号领取');
      return;
    }

    claiming.value = true;
    try {
      const { data } = await request.post(
        `/api/coupons/link/${encodeURIComponent(token.value)}/claim`,
        {
          phone: input,
        },
      );
      const payload = extractEnvelopeData(data) || {};

      isClaimed.value = true;
      coupon.value = applyCouponClaimSuccess(coupon.value);
      showToast(payload.message || data?.message || '领取成功，已放入卡包');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '领取失败'));
    } finally {
      claiming.value = false;
    }
  }

  function setPhone(value) {
    phone.value = String(value || '').trim();
  }

  function showToast(message) {
    toastMessage.value = String(message || '操作成功');
    window.setTimeout(() => {
      toastMessage.value = '';
    }, 2200);
  }

  return {
    claimBlockedText,
    claimButtonText,
    claiming,
    couponRuleText,
    displayAmount,
    handleClaim,
    handleOpenGift,
    isClaimed,
    loadCoupon,
    loadError,
    loading,
    phone,
    remainingText,
    setPhone,
    toastMessage,
    validityText,
    view,
  };
}
