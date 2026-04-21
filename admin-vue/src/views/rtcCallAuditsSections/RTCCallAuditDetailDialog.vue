<template>
  <el-dialog
    :model-value="visible"
    title="RTC 通话详情"
    width="820px"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-descriptions v-if="detailRecord" :column="2" border size="small">
      <el-descriptions-item label="通话 ID">{{ detailRecord.uid || detailRecord.id || detailRecord.call_id_raw || '-' }}</el-descriptions-item>
      <el-descriptions-item label="通话类型">{{ callTypeLabel(detailRecord.call_type) }}</el-descriptions-item>
      <el-descriptions-item label="发起方">{{ roleLabel(detailRecord.caller_role) }}</el-descriptions-item>
      <el-descriptions-item label="发起方 ID">{{ detailRecord.caller_id || '-' }}</el-descriptions-item>
      <el-descriptions-item label="发起方电话">{{ detailRecord.caller_phone || '-' }}</el-descriptions-item>
      <el-descriptions-item label="接收方">{{ roleLabel(detailRecord.callee_role) }}</el-descriptions-item>
      <el-descriptions-item label="接收方 ID">{{ detailRecord.callee_id || '-' }}</el-descriptions-item>
      <el-descriptions-item label="接收方电话">{{ detailRecord.callee_phone || '-' }}</el-descriptions-item>
      <el-descriptions-item label="入口点">{{ detailRecord.entry_point || '-' }}</el-descriptions-item>
      <el-descriptions-item label="场景">{{ detailRecord.scene || '-' }}</el-descriptions-item>
      <el-descriptions-item label="会话号">{{ detailRecord.conversation_id || '-' }}</el-descriptions-item>
      <el-descriptions-item label="订单号">{{ detailRecord.order_id || '-' }}</el-descriptions-item>
      <el-descriptions-item label="客户端平台">{{ detailRecord.client_platform || '-' }}</el-descriptions-item>
      <el-descriptions-item label="终端类型">{{ detailRecord.client_kind || '-' }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ statusLabel(detailRecord.status) }}</el-descriptions-item>
      <el-descriptions-item label="失败原因">{{ detailRecord.failure_reason || '-' }}</el-descriptions-item>
      <el-descriptions-item label="投诉状态">{{ complaintLabel(detailRecord.complaint_status) }}</el-descriptions-item>
      <el-descriptions-item label="录音留存">{{ retentionLabel(detailRecord.recording_retention) }}</el-descriptions-item>
      <el-descriptions-item label="开始时间">{{ formatDateTime(detailRecord.started_at) }}</el-descriptions-item>
      <el-descriptions-item label="接通时间">{{ formatDateTime(detailRecord.answered_at) }}</el-descriptions-item>
      <el-descriptions-item label="结束时间">{{ formatDateTime(detailRecord.ended_at) }}</el-descriptions-item>
      <el-descriptions-item label="时长">{{ formatDuration(detailRecord.duration_seconds) }}</el-descriptions-item>
    </el-descriptions>

    <div class="metadata-title">元数据</div>
    <el-input :model-value="formatMetadata(detailRecord?.metadata)" type="textarea" :rows="10" readonly />

    <template #footer>
      <div class="dialog-actions">
        <el-button
          v-if="detailRecord && detailRecord.complaint_status !== 'reported'"
          type="danger"
          :loading="actionLoading[detailRecord.uid || detailRecord.id]"
          @click="markComplaint(detailRecord)"
        >
          标记投诉
        </el-button>
        <el-button
          v-if="detailRecord && detailRecord.complaint_status === 'reported'"
          type="success"
          :loading="actionLoading[detailRecord.uid || detailRecord.id]"
          @click="resolveComplaint(detailRecord)"
        >
          处理完成
        </el-button>
        <el-button
          v-if="detailRecord && detailRecord.recording_retention !== 'frozen'"
          type="warning"
          :loading="actionLoading[detailRecord.uid || detailRecord.id]"
          @click="freezeRetention(detailRecord)"
        >
          冻结留存
        </el-button>
        <el-button
          v-if="detailRecord && detailRecord.recording_retention !== 'cleared' && detailRecord.complaint_status !== 'reported'"
          :loading="actionLoading[detailRecord.uid || detailRecord.id]"
          @click="clearRetention(detailRecord)"
        >
          标记清理
        </el-button>
        <el-button @click="emit('update:visible', false)">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  detailRecord: {
    type: Object,
    default: null,
  },
  actionLoading: {
    type: Object,
    default: () => ({}),
  },
  callTypeLabel: {
    type: Function,
    required: true,
  },
  roleLabel: {
    type: Function,
    required: true,
  },
  statusLabel: {
    type: Function,
    required: true,
  },
  complaintLabel: {
    type: Function,
    required: true,
  },
  retentionLabel: {
    type: Function,
    required: true,
  },
  formatDateTime: {
    type: Function,
    required: true,
  },
  formatDuration: {
    type: Function,
    required: true,
  },
  formatMetadata: {
    type: Function,
    required: true,
  },
  markComplaint: {
    type: Function,
    required: true,
  },
  resolveComplaint: {
    type: Function,
    required: true,
  },
  freezeRetention: {
    type: Function,
    required: true,
  },
  clearRetention: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:visible'])
</script>
