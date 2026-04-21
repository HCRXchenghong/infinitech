<template>
  <el-card class="card status-card">
    <template #header>
      <div class="card-header">
        <span>当前通话状态</span>
        <el-button size="small" :loading="auditsLoading" @click="loadRecentAudits">刷新记录</el-button>
      </div>
    </template>

    <div class="status-hero">
      <div class="status-title">{{ rtcState.statusText }}</div>
      <div class="status-hint">{{ rtcState.statusHint }}</div>
    </div>

    <div class="status-grid">
      <div class="status-item">
        <span class="status-label">通话 ID</span>
        <span class="status-value">{{ rtcState.callId || '--' }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">当前模式</span>
        <span class="status-value">{{ rtcState.mode === 'incoming' ? '来电' : '呼出' }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">目标角色</span>
        <span class="status-value">{{ rtcState.targetRole ? roleLabel(rtcState.targetRole) : '--' }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">目标信息</span>
        <span class="status-value">{{ currentTargetText }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">媒体状态</span>
        <span class="status-value">{{ rtcState.mediaStatusText }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">会话 / 订单</span>
        <span class="status-value">{{ currentBizText }}</span>
      </div>
    </div>

    <div v-if="rtcState.errorMessage" class="status-error">
      {{ rtcState.errorMessage }}
    </div>

    <div class="status-actions">
      <el-button v-if="showReject" :disabled="rtcState.busy" @click="handleReject">
        拒绝
      </el-button>
      <el-button v-if="showCancel" :disabled="rtcState.busy" @click="handleCancel">
        取消呼叫
      </el-button>
      <el-button v-if="showAccept" type="primary" :loading="rtcState.busy" @click="handleAccept">
        接听
      </el-button>
      <el-button v-if="showEnd" type="danger" :loading="rtcState.busy" @click="handleEnd">
        挂断
      </el-button>
      <el-button v-if="canCloseCurrentCall" @click="handleCloseCall">
        关闭状态
      </el-button>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  rtcState: {
    type: Object,
    required: true,
  },
  auditsLoading: {
    type: Boolean,
    default: false,
  },
  loadRecentAudits: {
    type: Function,
    required: true,
  },
  currentTargetText: {
    type: String,
    default: '--',
  },
  currentBizText: {
    type: String,
    default: '-- / --',
  },
  roleLabel: {
    type: Function,
    required: true,
  },
  showReject: {
    type: Boolean,
    default: false,
  },
  showCancel: {
    type: Boolean,
    default: false,
  },
  showAccept: {
    type: Boolean,
    default: false,
  },
  showEnd: {
    type: Boolean,
    default: false,
  },
  canCloseCurrentCall: {
    type: Boolean,
    default: false,
  },
  handleReject: {
    type: Function,
    required: true,
  },
  handleCancel: {
    type: Function,
    required: true,
  },
  handleAccept: {
    type: Function,
    required: true,
  },
  handleEnd: {
    type: Function,
    required: true,
  },
  handleCloseCall: {
    type: Function,
    required: true,
  },
})
</script>
