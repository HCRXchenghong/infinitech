<template>
  <el-dialog
    :model-value="visible"
    title="电话联系详情"
    width="720px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-descriptions v-if="detailRecord" :column="2" border size="small">
      <el-descriptions-item label="时间">
        {{ formatDateTime(detailRecord.created_at) }}
      </el-descriptions-item>
      <el-descriptions-item label="客户端结果">
        {{ resultLabel(detailRecord.client_result) }}
      </el-descriptions-item>
      <el-descriptions-item label="发起方角色">
        {{ roleLabel(detailRecord.actor_role) }}
      </el-descriptions-item>
      <el-descriptions-item label="发起方 ID">
        {{ detailRecord.actor_id || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="发起方电话">
        {{ detailRecord.actor_phone || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="目标方角色">
        {{ roleLabel(detailRecord.target_role) }}
      </el-descriptions-item>
      <el-descriptions-item label="目标方 ID">
        {{ detailRecord.target_id || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="目标方电话">
        {{ detailRecord.target_phone || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="场景">{{ detailRecord.scene || '-' }}</el-descriptions-item>
      <el-descriptions-item label="入口点">{{ detailRecord.entry_point || '-' }}</el-descriptions-item>
      <el-descriptions-item label="订单号">{{ detailRecord.order_id || '-' }}</el-descriptions-item>
      <el-descriptions-item label="房间号">{{ detailRecord.room_id || '-' }}</el-descriptions-item>
      <el-descriptions-item label="页面路径" :span="2">
        {{ detailRecord.page_path || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="客户端平台">
        {{ detailRecord.client_platform || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="联系通道">
        {{ detailRecord.contact_channel || '-' }}
      </el-descriptions-item>
    </el-descriptions>

    <div class="contact-phone-audits-metadata-title">元数据</div>
    <el-input
      :model-value="formatMetadata(detailRecord?.metadata)"
      type="textarea"
      :rows="10"
      readonly
    />

    <template #footer>
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineEmits(['update:visible']);

defineProps({
  detailRecord: {
    type: Object,
    default: null,
  },
  formatDateTime: {
    type: Function,
    required: true,
  },
  formatMetadata: {
    type: Function,
    required: true,
  },
  resultLabel: {
    type: Function,
    required: true,
  },
  roleLabel: {
    type: Function,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>
