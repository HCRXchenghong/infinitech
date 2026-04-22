<template>
  <el-dialog :model-value="visible" title="日志详情（原始格式）" width="760px" @update:model-value="setDetailVisible">
    <el-descriptions :column="2" border size="small">
      <el-descriptions-item label="时间">{{ formatTime(detailLog?.timestamp) }}</el-descriptions-item>
      <el-descriptions-item label="来源">{{ detailLog?.sourceLabel || '-' }}</el-descriptions-item>
      <el-descriptions-item label="操作类型">{{ detailLog?.actionLabel || '-' }}</el-descriptions-item>
      <el-descriptions-item label="级别">{{ detailLog?.level || '-' }}</el-descriptions-item>
      <el-descriptions-item label="操作人">
        {{ detailLog?.operatorName || detailLog?.operatorId || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="操作人 ID">{{ detailLog?.operatorId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="操作说明" :span="2">{{ detailLog?.operation || '-' }}</el-descriptions-item>
      <el-descriptions-item label="接口" :span="2">{{ formatMethodPath(detailLog) }}</el-descriptions-item>
      <el-descriptions-item label="状态码">{{ detailLog?.status || '-' }}</el-descriptions-item>
      <el-descriptions-item label="IP">{{ detailLog?.ip || '-' }}</el-descriptions-item>
    </el-descriptions>

    <div class="raw-title">原始日志</div>
    <el-input :model-value="detailLog?.raw || '-'" type="textarea" :rows="14" readonly />
    <template #footer>
      <el-button @click="setDetailVisible(false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  detailLog: {
    type: Object,
    default: null,
  },
  formatMethodPath: {
    type: Function,
    required: true,
  },
  formatTime: {
    type: Function,
    required: true,
  },
  setDetailVisible: {
    type: Function,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>
