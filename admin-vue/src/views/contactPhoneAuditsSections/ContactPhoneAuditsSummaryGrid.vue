<template>
  <div class="contact-phone-audits-summary-grid">
    <div class="contact-phone-audits-summary-card">
      <div class="contact-phone-audits-summary-label">当前筛选总数</div>
      <div class="contact-phone-audits-summary-value">{{ summary.total }}</div>
    </div>
    <div class="contact-phone-audits-summary-card">
      <div class="contact-phone-audits-summary-label">已点击</div>
      <div class="contact-phone-audits-summary-value success">{{ summary.clicked }}</div>
    </div>
    <div class="contact-phone-audits-summary-card">
      <div class="contact-phone-audits-summary-label">已拉起</div>
      <div class="contact-phone-audits-summary-value primary">{{ summary.opened }}</div>
    </div>
    <div class="contact-phone-audits-summary-card">
      <div class="contact-phone-audits-summary-label">失败</div>
      <div class="contact-phone-audits-summary-value danger">{{ summary.failed }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  summary: {
    type: Object,
    required: true,
  },
});
</script>
