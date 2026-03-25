<template>
  <div class="coupon-landing">
    <div v-if="loading" class="state-wrap">
      <div class="loading-card">
        <div class="loading-title">优惠券加载中</div>
        <div class="loading-line" v-for="n in 4" :key="n"></div>
      </div>
    </div>

    <div v-else-if="loadError" class="state-wrap">
      <div class="error-card">
        <h2>链接不可用</h2>
        <p>{{ loadError }}</p>
        <button class="btn-primary" type="button" @click="loadCoupon">重新加载</button>
      </div>
    </div>

    <template v-else>
      <section v-if="view === 'gift' || view === 'opening'" class="gift-stage">
        <div class="blob blob-a"></div>
        <div class="blob blob-b"></div>

        <div class="gift-content">
          <h1>惊喜福利掉落</h1>
          <p class="sub-title">悦享e食为您准备了一份专属惊喜大礼</p>

          <div
            class="gift-click-area"
            :class="{ clickable: view === 'gift' }"
            @click="handleOpenGift"
          >
            <div class="gift-glow" :class="{ opening: view === 'opening' }"></div>

            <div class="gift-box" :class="{ float: view === 'gift', shake: view === 'opening' }">
              <div v-if="view === 'opening'" class="particles">
                <span v-for="n in 6" :key="n" class="particle" :class="`particle-${n}`">✦</span>
              </div>

              <div class="gift-lid" :class="{ open: view === 'opening' }">
                <div class="bow-wrap">
                  <div class="bow bow-left"></div>
                  <div class="bow bow-right"></div>
                  <div class="bow-core"></div>
                </div>
                <div class="lid-strip"></div>
              </div>

              <div class="gift-body">
                <div class="body-strip"></div>
              </div>
            </div>

            <div class="gift-shadow" :class="{ opening: view === 'opening' }"></div>
          </div>

          <p class="tip-pill" :class="{ pulse: view === 'gift' }">
            {{ view === 'opening' ? '正在为您开启惊喜...' : '点击立刻拆开' }}
          </p>
        </div>
      </section>

      <section v-else class="coupon-stage">
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
                  v-model.trim="phone"
                  class="phone-input"
                  maxlength="11"
                  type="tel"
                  placeholder="输入注册手机号领取"
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

    <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '@/utils/request';

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

const displayAmount = computed(() => {
  const item = coupon.value;
  if (!item) return '-';

  const amount = Number(item.amount || 0);
  if (String(item.type || '').toLowerCase() === 'percent') {
    const discount = Math.max(0, 100 - amount);
    if (Number.isFinite(discount)) {
      return `${discount.toFixed(0)}折`;
    }
  }

  return `¥${formatMoney(amount)}`;
});

const couponRuleText = computed(() => {
  const item = coupon.value;
  if (!item) return '优惠券';

  const type = String(item.type || '').toLowerCase();
  const minAmount = Number(item.minAmount || 0);
  const noThreshold = String(item.conditionType || '') === 'no_threshold' || minAmount <= 0;

  if (type === 'fixed') {
    if (noThreshold) return '全场通用无门槛券';
    return `满${formatCny(minAmount)}可用`;
  }

  if (noThreshold) return '全场通用折扣券';
  return `满${formatCny(minAmount)}可用`; 
});

const validityText = computed(() => {
  const item = coupon.value;
  if (!item) return '-';
  return `${formatDateTime(item.validFrom)} - ${formatDateTime(item.validUntil)}`;
});

const remainingText = computed(() => {
  const item = coupon.value;
  if (!item) return '-';

  const total = Number(item.totalCount || 0);
  const remaining = Number(item.remainingCount);
  if (total <= 0 || remaining < 0 || Number.isNaN(remaining)) {
    return '不限';
  }
  return String(Math.max(0, remaining));
});

const claimBlockedText = computed(() => {
  const item = coupon.value;
  if (!item) return '优惠券加载中';

  if (String(item.status || '') !== 'active') {
    return '该优惠券暂不可领取';
  }

  const now = Date.now();
  const start = new Date(item.validFrom).getTime();
  const end = new Date(item.validUntil).getTime();
  if (!Number.isNaN(start) && now < start) {
    return '未到领取时间';
  }
  if (!Number.isNaN(end) && now > end) {
    return '该优惠券已过期';
  }

  const total = Number(item.totalCount || 0);
  const remaining = Number(item.remainingCount);
  if (total > 0 && !Number.isNaN(remaining) && remaining <= 0) {
    return '该优惠券已领完';
  }

  return '';
});

const claimButtonText = computed(() => {
  if (claiming.value) return '领取中...';
  if (claimBlockedText.value) return claimBlockedText.value;
  return '立即领取';
});

watch(token, () => {
  resetState();
  loadCoupon();
});

onMounted(() => {
  loadCoupon();
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
    const payload = data?.coupon || data?.data?.coupon || data?.data || null;
    if (!payload || !payload.id) {
      throw new Error('优惠券信息无效');
    }
    coupon.value = payload;
  } catch (error) {
    loadError.value = error?.response?.data?.error || error?.message || '领券链接不可用';
  } finally {
    loading.value = false;
  }
}

function handleOpenGift() {
  if (view.value !== 'gift') return;
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
  if (!/^1[3-9]\d{9}$/.test(input)) {
    ElMessage.warning('请输入注册手机号领取');
    return;
  }

  claiming.value = true;
  try {
    const { data } = await request.post(`/api/coupons/link/${encodeURIComponent(token.value)}/claim`, {
      phone: input
    });

    isClaimed.value = true;
    updateCouponAfterClaim();
    showToast(data?.message || '领取成功，已放入卡包');
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || '领取失败');
  } finally {
    claiming.value = false;
  }
}

function updateCouponAfterClaim() {
  if (!coupon.value) return;

  const next = { ...coupon.value };
  const received = Number(next.receivedCount || 0);
  next.receivedCount = Number.isNaN(received) ? 1 : received + 1;

  const total = Number(next.totalCount || 0);
  const remaining = Number(next.remainingCount);
  if (total > 0 && !Number.isNaN(remaining)) {
    next.remainingCount = Math.max(0, remaining - 1);
  }

  coupon.value = next;
}

function showToast(message) {
  toastMessage.value = String(message || '操作成功');
  window.setTimeout(() => {
    toastMessage.value = '';
  }, 2200);
}

function formatMoney(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0.00';
  return num.toFixed(2).replace(/\.00$/, '');
}

function formatCny(value) {
  return `¥${formatMoney(value)}`;
}

function formatDateTime(raw) {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yy}-${mm}-${dd} ${hh}:${mi}`;
}
</script>

<style scoped lang="css" src="./CouponLanding.css"></style>
