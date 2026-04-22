<template>
  <section class="gift-stage">
    <div class="blob blob-a"></div>
    <div class="blob blob-b"></div>

    <div class="gift-content">
      <h1>惊喜福利掉落</h1>
      <p class="sub-title">悦享e食为您准备了一份专属惊喜大礼</p>

      <div class="gift-click-area" :class="{ clickable: view === 'gift' }" @click="handleOpenGift">
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
</template>

<script setup>
defineProps({
  handleOpenGift: {
    type: Function,
    required: true,
  },
  view: {
    type: String,
    default: 'gift',
  },
});
</script>
