<template>
  <el-dialog
    :model-value="visible"
    title="售后申请详情"
    width="760px"
    @update:model-value="emit('update:visible', $event)"
  >
    <template v-if="detailRecord">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="售后单号">{{ detailRecord.requestNo }}</el-descriptions-item>
        <el-descriptions-item label="订单号">{{ detailRecord.orderNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ detailRecord.userId }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ detailRecord.contactPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="售后类型">{{ detailRecord.typeText }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType(detailRecord.status)">{{ detailRecord.statusText }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="申请退款">
          {{ detailRecord.requestedRefundAmount > 0 ? `¥${fen2yuan(detailRecord.requestedRefundAmount)}` : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="退款决策">
          <el-tag :type="detailRecord.shouldRefund ? 'success' : 'info'">
            {{ detailRecord.shouldRefund ? '退款' : '不退款' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="实际退款">
          {{ detailRecord.refundAmount > 0 ? `¥${fen2yuan(detailRecord.refundAmount)}` : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="退款流水号">
          {{ detailRecord.refundTransactionId || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">
          {{ formatDateTime(detailRecord.createdAt || detailRecord.created_at) }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ formatDateTime(detailRecord.updatedAt || detailRecord.updated_at) }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="section-title">问题描述</div>
      <div class="section-content">{{ detailRecord.problemDesc || '-' }}</div>

      <div class="section-title">申请商品</div>
      <el-table :data="detailRecord.selectedProducts || []" size="small" border>
        <el-table-column prop="name" label="商品名" min-width="140" />
        <el-table-column prop="spec" label="规格" min-width="120" />
        <el-table-column prop="price" label="单价" min-width="90" />
        <el-table-column prop="count" label="数量" min-width="80" />
      </el-table>

      <div class="section-title">凭证图片</div>
      <div class="image-list">
        <el-image
          v-for="(url, index) in detailRecord.evidenceImages || []"
          :key="index"
          :src="url"
          :preview-src-list="detailRecord.evidenceImages || []"
          fit="cover"
          class="evidence-image"
        />
        <span v-if="!detailRecord.evidenceImages || detailRecord.evidenceImages.length === 0">未上传</span>
      </div>

      <div class="section-title">处理备注</div>
      <div class="section-content">{{ detailRecord.adminRemark || '-' }}</div>
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
  fen2yuan: {
    type: Function,
    required: true,
  },
  formatDateTime: {
    type: Function,
    required: true,
  },
  statusTagType: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:visible'])
</script>

<style scoped>
.section-title {
  margin-top: 14px;
  margin-bottom: 8px;
  font-weight: 600;
  color: #303133;
}

.section-content {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 12px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.image-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 44px;
  color: #909399;
}

.evidence-image {
  width: 88px;
  height: 88px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}
</style>
