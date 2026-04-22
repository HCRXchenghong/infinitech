<template>
  <section class="app-download-page">
    <div class="app-download-grid"></div>
    <div class="app-download-halo app-download-halo-a"></div>
    <div class="app-download-halo app-download-halo-b"></div>

    <div class="app-download-main">
      <div class="app-download-icon">
        <img class="app-download-logo" :src="logoUrl" alt="悦享e食 logo" />
      </div>

      <h1 class="app-download-title">悦享e食</h1>
      <p class="app-download-tagline">随时随地，享受身边美食</p>

      <div class="app-download-button-group">
        <button
          class="app-download-button app-download-button-android"
          type="button"
          :disabled="Boolean(downloading)"
          @click="handleDownload('android')"
        >
          <span class="app-download-button-title">Android 下载</span>
        </button>

        <button
          class="app-download-button app-download-button-ios"
          type="button"
          :disabled="Boolean(downloading)"
          @click="handleDownload('ios')"
        >
          <span class="app-download-button-title">iOS 下载</span>
        </button>

        <button
          class="app-download-button app-download-button-mini-program"
          type="button"
          @click="openMiniProgramDialog"
        >
          <span class="app-download-button-title">小程序</span>
        </button>
      </div>

      <div class="app-download-version-tip">
        最新版本: {{ latestVersionText }} | 更新于 {{ updateDateText }}
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  downloading: {
    type: String,
    default: '',
  },
  handleDownload: {
    type: Function,
    required: true,
  },
  latestVersionText: {
    type: String,
    default: '待配置',
  },
  logoUrl: {
    type: String,
    default: '/logo.png',
  },
  openMiniProgramDialog: {
    type: Function,
    required: true,
  },
  updateDateText: {
    type: String,
    default: '--',
  },
});
</script>
