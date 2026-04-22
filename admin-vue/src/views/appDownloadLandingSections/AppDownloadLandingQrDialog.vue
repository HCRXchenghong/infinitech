<template>
  <el-dialog
    :model-value="visible"
    width="360px"
    align-center
    class="app-download-qr-dialog"
    :show-close="true"
    @update:model-value="handleVisibleChange"
  >
    <div class="app-download-qr-modal">
      <div class="app-download-qr-kicker">小程序</div>
      <h2 class="app-download-qr-title">扫一扫去体验</h2>
      <div class="app-download-qr-shell">
        <img
          v-if="miniProgramQrUrl"
          :src="miniProgramQrUrl"
          class="app-download-qr-image"
          alt="悦享e食小程序二维码"
        />
        <div v-else class="app-download-qr-placeholder">暂未上传小程序二维码</div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
const emit = defineEmits(['update:visible']);

defineProps({
  miniProgramQrUrl: {
    type: String,
    default: '',
  },
  visible: {
    type: Boolean,
    default: false,
  },
});

function handleVisibleChange(value) {
  emit('update:visible', value);
}
</script>
