<template>
  <div class="title-row">
    <div>
      <div class="title">RTC 管理台</div>
      <div class="title-subtitle">
        面向管理端的独立 RTC 工作台。这里可以搜索站内联系人、直接发起语音、查看当前通话状态，并快速回看最近审计记录。
      </div>
    </div>
    <div class="title-actions">
      <el-tag :type="rtcState.bridgeConnected ? 'success' : 'warning'" effect="light">
        {{ rtcState.bridgeConnected ? 'RTC 信令已连接' : 'RTC 信令未连接' }}
      </el-tag>
      <el-tag :type="rtcState.mediaSupported ? 'success' : 'info'" effect="light">
        {{ rtcState.mediaSupported ? '支持 WebRTC 音频' : '当前仅支持信令与审计' }}
      </el-tag>
      <el-button @click="goToChatConsole">客服工作台</el-button>
      <el-button type="primary" plain @click="goToAudits">查看审计</el-button>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">最近记录</div>
      <div class="summary-value">{{ auditSummary.total }}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">已接通</div>
      <div class="summary-value success">{{ auditSummary.accepted }}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">已结束</div>
      <div class="summary-value primary">{{ auditSummary.ended }}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">投诉中</div>
      <div class="summary-value warning">{{ auditSummary.complaints }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  rtcState: {
    type: Object,
    required: true,
  },
  auditSummary: {
    type: Object,
    required: true,
  },
  goToChatConsole: {
    type: Function,
    required: true,
  },
  goToAudits: {
    type: Function,
    required: true,
  },
})
</script>
