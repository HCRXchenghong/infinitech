<template>
  <div>
    <div class="panel-header">
      <div>
        <div class="panel-title">RTC 通话审计</div>
        <div class="panel-subtitle">
          查看 App / H5 站内语音的服务端留痕，并在后台处理投诉冻结与录音留存状态。
        </div>
      </div>
      <div class="panel-actions">
        <el-button size="small" :loading="loading" @click="loadAudits">刷新</el-button>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">当前筛选总数</div>
        <div class="summary-value">{{ summary.total }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">已接通</div>
        <div class="summary-value success">{{ summary.accepted }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">已结束</div>
        <div class="summary-value primary">{{ summary.ended }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">异常 / 失败</div>
        <div class="summary-value danger">{{ summary.failed }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">投诉中</div>
        <div class="summary-value warning">{{ summary.complaints }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  summary: {
    type: Object,
    required: true,
  },
  loadAudits: {
    type: Function,
    required: true,
  },
})
</script>
