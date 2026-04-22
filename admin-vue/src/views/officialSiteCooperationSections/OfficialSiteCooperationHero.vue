<template>
  <section class="official-site-cooperation-hero">
    <span class="official-site-cooperation-eyebrow">Campus Partnership</span>
    <h1 class="official-site-cooperation-title">商务合作与入驻</h1>
    <p class="official-site-cooperation-subtitle">
      打通校园商业生态链路，连接品牌曝光、履约运力、内容运营与长期合作，
      让优质商家和服务团队可以在统一平台内稳定增长。
    </p>

    <div class="official-site-cooperation-hero-footer">
      <span
        v-for="badge in heroBadges"
        :key="badge"
        class="official-site-cooperation-badge"
      >
        {{ badge }}
      </span>
    </div>

    <div class="official-site-cooperation-stat-grid">
      <article
        v-for="item in heroStats"
        :key="item.label"
        class="official-site-cooperation-stat-card"
      >
        <div class="official-site-cooperation-stat-value">{{ item.value }}</div>
        <div class="official-site-cooperation-stat-label">{{ item.label }}</div>
      </article>
    </div>
  </section>
</template>

<script setup>
defineProps({
  heroBadges: {
    type: Array,
    default: () => [],
  },
  heroStats: {
    type: Array,
    default: () => [],
  },
})
</script>
