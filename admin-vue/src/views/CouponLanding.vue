<template>
  <div class="coupon-landing">
    <CouponLandingLoadingState v-if="loading" />
    <CouponLandingErrorState
      v-else-if="loadError"
      :load-coupon="loadCoupon"
      :load-error="loadError"
    />
    <template v-else>
      <CouponLandingGiftStage
        v-if="view === 'gift' || view === 'opening'"
        :handle-open-gift="handleOpenGift"
        :view="view"
      />
      <CouponLandingResultStage
        v-else
        :claim-blocked-text="claimBlockedText"
        :claim-button-text="claimButtonText"
        :claiming="claiming"
        :coupon-rule-text="couponRuleText"
        :display-amount="displayAmount"
        :handle-claim="handleClaim"
        :is-claimed="isClaimed"
        :phone="phone"
        :remaining-text="remainingText"
        :set-phone="setPhone"
        :validity-text="validityText"
      />
    </template>
    <CouponLandingToast :message="toastMessage" />
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus';
import request from '@/utils/request';
import './CouponLanding.css';
import CouponLandingErrorState from './couponLandingSections/CouponLandingErrorState.vue';
import CouponLandingGiftStage from './couponLandingSections/CouponLandingGiftStage.vue';
import CouponLandingLoadingState from './couponLandingSections/CouponLandingLoadingState.vue';
import CouponLandingResultStage from './couponLandingSections/CouponLandingResultStage.vue';
import CouponLandingToast from './couponLandingSections/CouponLandingToast.vue';
import { useCouponLandingPage } from './couponLandingPageHelpers';

const {
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
} = useCouponLandingPage({
  request,
  ElMessage,
});
</script>
