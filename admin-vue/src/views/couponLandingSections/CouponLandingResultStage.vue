<template>
  <section class="coupon-stage">
    <div class="coupon-header">
      <h2>恭喜获得惊喜福利</h2>
      <p>快去点一份美食犒劳自己吧</p>
    </div>

    <div class="coupon-card">
      <div class="card-top">
        <div class="limited-tag">限时福利</div>
        <div class="amount-wrap">
          <span class="amount">{{ displayAmount }}</span>
        </div>
        <p class="rule-text">{{ couponRuleText }}</p>
        <div class="notch notch-left"></div>
        <div class="notch notch-right"></div>
      </div>

      <div class="divider"></div>

      <div class="card-bottom">
        <p class="meta-text">有效期：{{ validityText }}</p>
        <p class="meta-text">剩余数量：{{ remainingText }}</p>

        <template v-if="isClaimed">
          <button class="claim-btn disabled" type="button" disabled>已存入账户</button>
        </template>

        <template v-else>
          <div class="phone-row">
            <input
              :value="phone"
              class="phone-input"
              maxlength="11"
              type="tel"
              placeholder="输入注册手机号领取"
              @input="setPhone($event.target.value)"
            />
          </div>

          <button
            class="claim-btn"
            type="button"
            :disabled="claiming || !!claimBlockedText"
            @click="handleClaim"
          >
            {{ claimButtonText }}
          </button>
        </template>
      </div>
    </div>

    <p class="copyright">最终解释权归悦享e食所有</p>
  </section>
</template>

<script setup>
defineProps({
  claimBlockedText: {
    type: String,
    default: '',
  },
  claimButtonText: {
    type: String,
    default: '立即领取',
  },
  claiming: {
    type: Boolean,
    default: false,
  },
  couponRuleText: {
    type: String,
    default: '',
  },
  displayAmount: {
    type: String,
    default: '',
  },
  handleClaim: {
    type: Function,
    required: true,
  },
  isClaimed: {
    type: Boolean,
    default: false,
  },
  phone: {
    type: String,
    default: '',
  },
  remainingText: {
    type: String,
    default: '',
  },
  setPhone: {
    type: Function,
    required: true,
  },
  validityText: {
    type: String,
    default: '',
  },
});
</script>
