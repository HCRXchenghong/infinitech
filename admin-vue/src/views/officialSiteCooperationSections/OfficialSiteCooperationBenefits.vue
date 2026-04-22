<template>
  <article class="official-site-cooperation-content-card">
    <img
      class="official-site-cooperation-cover"
      src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=760&fit=crop"
      alt="商务合作"
    />

    <div class="official-site-cooperation-content-body">
      <h2 class="official-site-cooperation-section-title">
        为什么选择入驻燧石创想平台？
      </h2>
      <p class="official-site-cooperation-section-copy">
        {{ featureIntro }}
      </p>

      <ul class="official-site-cooperation-benefit-list">
        <li
          v-for="item in benefits"
          :key="item"
          class="official-site-cooperation-benefit-item"
        >
          <span class="official-site-cooperation-benefit-icon">✓</span>
          <span class="official-site-cooperation-benefit-text">{{ item }}</span>
        </li>
      </ul>
    </div>
  </article>
</template>

<script setup>
defineProps({
  benefits: {
    type: Array,
    default: () => [],
  },
  featureIntro: {
    type: String,
    default: '',
  },
})
</script>
