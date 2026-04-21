<template>
  <div>
    <PageStateAlert :message="loadError" />

    <el-table :data="records" :row-key="rowKey" size="small" stripe v-loading="loading">
      <el-table-column label="创建时间" width="168">
        <template #default="{ row }">
          {{ formatDateTime(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="通话 ID" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.uid || row.id || row.call_id_raw || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="发起方" min-width="170">
        <template #default="{ row }">
          <div>{{ roleLabel(row.caller_role) }} / {{ row.caller_id || '-' }}</div>
          <div class="muted-text">{{ row.caller_phone || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="接收方" min-width="170">
        <template #default="{ row }">
          <div>{{ roleLabel(row.callee_role) }} / {{ row.callee_id || '-' }}</div>
          <div class="muted-text">{{ row.callee_phone || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="会话 / 订单" min-width="180">
        <template #default="{ row }">
          <div>{{ row.conversation_id || '-' }}</div>
          <div class="muted-text">{{ row.order_id || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag size="small" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时长" width="110">
        <template #default="{ row }">
          {{ formatDuration(row.duration_seconds) }}
        </template>
      </el-table-column>
      <el-table-column label="投诉" width="96">
        <template #default="{ row }">
          <el-tag size="small" :type="complaintTagType(row.complaint_status)">
            {{ complaintLabel(row.complaint_status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="录音留存" width="120">
        <template #default="{ row }">
          <el-tag size="small" :type="retentionTagType(row.recording_retention)">
            {{ retentionLabel(row.recording_retention) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <div class="row-actions">
            <el-button type="primary" link size="small" @click="openDetail(row)">查看详情</el-button>
            <el-button
              v-if="row.complaint_status !== 'reported'"
              type="danger"
              link
              size="small"
              :loading="actionLoading[row.uid || row.id]"
              @click="markComplaint(row)"
            >
              标记投诉
            </el-button>
            <el-button
              v-if="row.complaint_status === 'reported'"
              type="success"
              link
              size="small"
              :loading="actionLoading[row.uid || row.id]"
              @click="resolveComplaint(row)"
            >
              处理完成
            </el-button>
            <el-button
              v-if="row.recording_retention !== 'frozen'"
              type="warning"
              link
              size="small"
              :loading="actionLoading[row.uid || row.id]"
              @click="freezeRetention(row)"
            >
              冻结留存
            </el-button>
            <el-button
              v-if="row.recording_retention !== 'cleared' && row.complaint_status !== 'reported'"
              type="info"
              link
              size="small"
              :loading="actionLoading[row.uid || row.id]"
              @click="clearRetention(row)"
            >
              标记清理
            </el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
          :description="loadError ? '加载失败，暂无可显示数据' : '暂无 RTC 通话审计记录'"
          :image-size="96"
        />
      </template>
    </el-table>

    <el-pagination
      v-if="pagination.total > 0"
      v-model:current-page="pagination.page"
      v-model:page-size="pagination.limit"
      :page-sizes="[20, 50, 100]"
      :total="pagination.total"
      layout="total, sizes, prev, pager, next, jumper"
      class="pager"
      @current-change="loadAudits"
      @size-change="handlePageSizeChange"
    />
  </div>
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue'

defineProps({
  records: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadError: {
    type: String,
    default: '',
  },
  pagination: {
    type: Object,
    required: true,
  },
  actionLoading: {
    type: Object,
    default: () => ({}),
  },
  rowKey: {
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
  roleLabel: {
    type: Function,
    required: true,
  },
  statusLabel: {
    type: Function,
    required: true,
  },
  statusTagType: {
    type: Function,
    required: true,
  },
  complaintLabel: {
    type: Function,
    required: true,
  },
  complaintTagType: {
    type: Function,
    required: true,
  },
  retentionLabel: {
    type: Function,
    required: true,
  },
  retentionTagType: {
    type: Function,
    required: true,
  },
  openDetail: {
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
  handlePageSizeChange: {
    type: Function,
    required: true,
  },
  loadAudits: {
    type: Function,
    required: true,
  },
})
</script>
