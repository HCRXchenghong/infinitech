<template>
  <section class="official-site-center-hero">
    <div class="official-site-center-copy">
      <span class="center-kicker">官网中心</span>
      <h2>把官网的客服、曝光治理和合作线索放到同一套控制台里持续推进</h2>
      <p>
        这里不是静态数据看板，而是官网对外入口在后台的真实工作面。
        在线客服支持实时推送，曝光审核与合作线索支持持续跟进和备注。
      </p>
    </div>

    <div class="center-summary-grid">
      <article v-for="item in supportSummaryCards" :key="item.label" class="center-summary-card">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
        <span>{{ item.desc }}</span>
      </article>
    </div>
  </section>
</template>

<script setup>
defineProps({
  supportSummaryCards: {
    type: Array,
    default: () => [],
  },
});
</script>
