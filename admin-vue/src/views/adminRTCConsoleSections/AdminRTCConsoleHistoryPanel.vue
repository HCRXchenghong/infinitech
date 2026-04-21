<template>
  <el-card class="card history-card">
    <template #header>
      <div class="card-header">
        <span>最近 RTC 通话记录</span>
        <div class="history-actions">
          <el-button size="small" :loading="auditsLoading" @click="loadRecentAudits">刷新</el-button>
          <el-button size="small" type="primary" plain @click="goToAudits">进入通话审计</el-button>
        </div>
      </div>
    </template>

    <PageStateAlert :message="auditsError" />

    <el-table :data="recentAudits" size="small" stripe v-loading="auditsLoading">
      <el-table-column label="创建时间" width="168">
        <template #default="{ row }">
          {{ formatDateTime(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="通话 ID" min-width="170" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.uid || row.id || row.call_id_raw || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="双方" min-width="230">
        <template #default="{ row }">
          <div>{{ roleLabel(row.caller_role) }} {{ row.caller_phone || row.caller_id || '-' }}</div>
          <div class="muted-text">-> {{ roleLabel(row.callee_role) }} {{ row.callee_phone || row.callee_id || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag size="small" :type="statusTagType(row.status)">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时长" width="110">
        <template #default="{ row }">
          {{ formatDuration(row.duration_seconds) }}
        </template>
      </el-table-column>
      <el-table-column label="会话 / 订单" min-width="180">
        <template #default="{ row }">
          <div>{{ row.conversation_id || '-' }}</div>
          <div class="muted-text">{{ row.order_id || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="投诉" width="96">
        <template #default="{ row }">
          <el-tag size="small" :type="complaintTagType(row.complaint_status)">
            {{ complaintLabel(row.complaint_status) }}
          </el-tag>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="auditsError ? '加载失败，暂无可显示数据' : '暂无 RTC 通话记录'" :image-size="88" />
      </template>
    </el-table>
  </el-card>
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue'

defineProps({
  recentAudits: {
    type: Array,
    default: () => [],
  },
  auditsLoading: {
    type: Boolean,
    default: false,
  },
  auditsError: {
    type: String,
    default: '',
  },
  loadRecentAudits: {
    type: Function,
    required: true,
  },
  goToAudits: {
    type: Function,
    required: true,
  },
  formatDateTime: {
    type: Function,
    required: true,
  },
  roleLabel: {
    type: Function,
    required: true,
  },
  statusTagType: {
    type: Function,
    required: true,
  },
  statusLabel: {
    type: Function,
    required: true,
  },
  formatDuration: {
    type: Function,
    required: true,
  },
  complaintTagType: {
    type: Function,
    required: true,
  },
  complaintLabel: {
    type: Function,
    required: true,
  },
})
</script>
