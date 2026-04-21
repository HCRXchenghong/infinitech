<template>
  <el-dialog
    :model-value="visible"
    title="推送消息统计"
    :width="isMobile ? '95%' : '720px'"
    class="content-settings-push-message-stats-dialog"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-if="currentPushMessageStats" class="push-stats-body">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="消息标题">
          {{ currentPushMessageStats.title }}
        </el-descriptions-item>
        <el-descriptions-item label="总用户数">
          {{ currentPushMessageStats.total_users }}
        </el-descriptions-item>
        <el-descriptions-item label="已读人数">
          <span class="stats-value success">{{ currentPushMessageStats.read_count }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="未读人数">
          <span class="stats-value danger">{{ currentPushMessageStats.unread_count }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="已读率">
          {{ currentPushMessageStats.read_rate_display }}
        </el-descriptions-item>
        <el-descriptions-item label="投递记录数">
          {{ currentPushMessageStats.total_deliveries }}
        </el-descriptions-item>
        <el-descriptions-item label="Queued">
          {{ currentPushMessageStats.queued_count }}
        </el-descriptions-item>
        <el-descriptions-item label="Sent">
          {{ currentPushMessageStats.sent_count }}
        </el-descriptions-item>
        <el-descriptions-item label="Failed">
          <span class="stats-value danger">{{ currentPushMessageStats.failed_count }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="Acked">
          {{ currentPushMessageStats.acknowledged_count }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="push-stats-table-section">
        <div class="push-stats-table-title">最近投递明细</div>
        <el-table
          :data="currentPushMessageDeliveries"
          size="small"
          border
          max-height="320"
          empty-text="暂无投递记录"
          v-loading="pushMessageDeliveryLoading"
        >
          <el-table-column prop="user_type" label="角色" width="90" />
          <el-table-column prop="user_id" label="用户ID" min-width="120" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="getPushDeliveryStatusTagType(row.status)">
                {{ row.status || 'unknown' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="回执" width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="getPushDeliveryActionTagType(row.action)">
                {{ formatPushDeliveryActionLabel(row.action) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="dispatch_provider" label="Provider" width="100">
            <template #default="{ row }">
              <span>{{ row.dispatch_provider || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="app_env" label="环境" width="90">
            <template #default="{ row }">
              <span>{{ row.app_env || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="retry_count" label="重试" width="80" />
          <el-table-column label="最近时间" min-width="170">
            <template #default="{ row }">
              <span>{{
                formatPushDeliveryTime(
                  row.acknowledged_at || row.sent_at || row.next_retry_at || row.updated_at
                )
              }}</span>
            </template>
          </el-table-column>
          <el-table-column label="错误" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              <span>{{ formatPushDeliveryError(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="device_token" label="设备" min-width="180" show-overflow-tooltip />
        </el-table>
      </div>
    </div>
    <template #footer>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  isMobile: {
    type: Boolean,
    default: false,
  },
  currentPushMessageStats: {
    type: Object,
    default: null,
  },
  currentPushMessageDeliveries: {
    type: Array,
    default: () => [],
  },
  pushMessageDeliveryLoading: {
    type: Boolean,
    default: false,
  },
  formatPushDeliveryActionLabel: {
    type: Function,
    required: true,
  },
  formatPushDeliveryError: {
    type: Function,
    required: true,
  },
  formatPushDeliveryTime: {
    type: Function,
    required: true,
  },
  getPushDeliveryActionTagType: {
    type: Function,
    required: true,
  },
  getPushDeliveryStatusTagType: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
</script>

<style scoped>
.push-stats-body {
  padding: 20px;
}

.stats-value {
  font-weight: 600;
}

.stats-value.success {
  color: #67c23a;
}

.stats-value.danger {
  color: #f56c6c;
}

.push-stats-table-section {
  margin-top: 16px;
}

.push-stats-table-title {
  font-weight: 600;
  margin-bottom: 8px;
}
</style>
