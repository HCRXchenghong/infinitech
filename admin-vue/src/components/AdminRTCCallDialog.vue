<template>
  <el-dialog
    :model-value="adminRTCState.visible"
    width="420px"
    :show-close="canCloseDialog"
    :close-on-click-modal="false"
    :close-on-press-escape="canCloseDialog"
    @close="handleDialogClose"
  >
    <template #header>
      <div class="rtc-dialog-header">
        <div>
          <div class="rtc-dialog-title">
            {{ adminRTCState.mode === 'incoming' ? 'RTC 来电' : 'RTC 通话' }}
          </div>
          <div class="rtc-dialog-subtitle">
            {{ adminRTCState.mode === 'incoming' ? '对方正在呼叫你' : '管理端发起的站内语音' }}
          </div>
        </div>
        <el-tag :type="statusTagType" effect="light">
          {{ adminRTCState.statusText }}
        </el-tag>
      </div>
    </template>

    <div class="rtc-panel">
      <div class="rtc-target-card">
        <div class="rtc-target-name">{{ adminRTCState.targetName || '当前联系人' }}</div>
        <div class="rtc-target-meta">
          <span>{{ roleText }}</span>
          <span v-if="adminRTCState.targetPhone">{{ adminRTCState.targetPhone }}</span>
          <span v-else-if="adminRTCState.targetId">ID {{ adminRTCState.targetId }}</span>
        </div>
      </div>

      <div class="rtc-info-list">
        <div class="rtc-info-item">
          <span class="rtc-info-label">通话 ID</span>
          <span class="rtc-info-value">{{ adminRTCState.callId || '--' }}</span>
        </div>
        <div class="rtc-info-item">
          <span class="rtc-info-label">媒体能力</span>
          <span class="rtc-info-value">
            {{ adminRTCState.mediaSupported ? '支持 WebRTC 音频' : '仅支持信令与审计' }}
          </span>
        </div>
        <div class="rtc-info-item">
          <span class="rtc-info-label">媒体状态</span>
          <span class="rtc-info-value">{{ adminRTCState.mediaStatusText }}</span>
        </div>
        <div class="rtc-info-item" v-if="adminRTCState.mode === 'outgoing'">
          <span class="rtc-info-label">对端在线</span>
          <span class="rtc-info-value">
            {{ adminRTCState.calleeOnline ? '在线' : '未确认' }}
          </span>
        </div>
      </div>

      <div class="rtc-status-hint">
        {{ adminRTCState.statusHint }}
      </div>

      <div v-if="adminRTCState.errorMessage" class="rtc-error">
        {{ adminRTCState.errorMessage }}
      </div>
    </div>

    <template #footer>
      <div class="rtc-actions">
        <el-button
          v-if="showReject"
          :disabled="adminRTCState.busy"
          @click="handleReject"
        >
          拒绝
        </el-button>
        <el-button
          v-if="showCancel"
          :disabled="adminRTCState.busy"
          @click="handleCancel"
        >
          取消呼叫
        </el-button>
        <el-button
          v-if="showAccept"
          type="primary"
          :loading="adminRTCState.busy"
          @click="handleAccept"
        >
          接听
        </el-button>
        <el-button
          v-if="showEnd"
          type="danger"
          :loading="adminRTCState.busy"
          @click="handleEnd"
        >
          挂断
        </el-button>
        <el-button
          v-if="canCloseDialog"
          type="primary"
          @click="handleDialogClose"
        >
          关闭
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { ElMessage } from 'element-plus';

import {
  acceptAdminRTCCall,
  adminRTCState,
  cancelAdminRTCCall,
  dismissAdminRTCCallDialog,
  endAdminRTCCall,
  isFinalStatus,
  isWaitingStatus,
  rejectAdminRTCCall,
} from '@/utils/adminRtc';

const roleText = computed(() => {
  switch (adminRTCState.targetRole) {
    case 'user':
      return '用户';
    case 'merchant':
      return '商家';
    case 'rider':
      return '骑手';
    case 'admin':
      return '管理员';
    default:
      return '联系人';
  }
});

const showAccept = computed(() => {
  return adminRTCState.mode === 'incoming' && isWaitingStatus(adminRTCState.status);
});

const showReject = computed(() => {
  return adminRTCState.mode === 'incoming' && isWaitingStatus(adminRTCState.status);
});

const showCancel = computed(() => {
  return adminRTCState.mode === 'outgoing' && isWaitingStatus(adminRTCState.status);
});

const showEnd = computed(() => {
  return adminRTCState.status === 'accepted';
});

const canCloseDialog = computed(() => {
  return !adminRTCState.callId || isFinalStatus(adminRTCState.status);
});

const statusTagType = computed(() => {
  switch (adminRTCState.status) {
    case 'accepted':
      return 'success';
    case 'ringing':
      return 'warning';
    case 'failed':
    case 'timeout':
    case 'busy':
    case 'rejected':
      return 'danger';
    default:
      return 'info';
  }
});

function handleDialogClose() {
  if (!dismissAdminRTCCallDialog()) {
    ElMessage.warning('请先结束当前 RTC 通话');
  }
}

async function handleAccept() {
  try {
    await acceptAdminRTCCall();
  } catch (error) {
    ElMessage.error(error?.message || '接听 RTC 通话失败');
  }
}

async function handleReject() {
  try {
    await rejectAdminRTCCall();
  } catch (error) {
    ElMessage.error(error?.message || '拒绝 RTC 通话失败');
  }
}

async function handleCancel() {
  try {
    await cancelAdminRTCCall();
  } catch (error) {
    ElMessage.error(error?.message || '取消 RTC 呼叫失败');
  }
}

async function handleEnd() {
  try {
    await endAdminRTCCall();
  } catch (error) {
    ElMessage.error(error?.message || '结束 RTC 通话失败');
  }
}
</script>

<style scoped>
.rtc-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.rtc-dialog-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.rtc-dialog-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.rtc-panel {
  display: grid;
  gap: 16px;
}

.rtc-target-card {
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #eff6ff 0%, #ecfeff 100%);
  border: 1px solid rgba(14, 116, 144, 0.16);
}

.rtc-target-name {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.rtc-target-meta {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: #475569;
}

.rtc-info-list {
  display: grid;
  gap: 10px;
}

.rtc-info-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;
}

.rtc-info-label {
  color: #64748b;
}

.rtc-info-value {
  max-width: 240px;
  color: #0f172a;
  font-weight: 600;
  text-align: right;
  word-break: break-all;
}

.rtc-status-hint {
  padding: 12px 14px;
  border-radius: 12px;
  background: #f8fafc;
  color: #334155;
  font-size: 13px;
  line-height: 1.6;
}

.rtc-error {
  padding: 12px 14px;
  border-radius: 12px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  line-height: 1.6;
}

.rtc-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
