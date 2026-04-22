<template>
  <el-descriptions :column="2" size="small" border>
    <el-descriptions-item label="商户ID">{{ merchant.id || '-' }}</el-descriptions-item>
    <el-descriptions-item label="商户名称">{{ merchant.name || '-' }}</el-descriptions-item>
    <el-descriptions-item label="手机号">{{ merchant.phone || '-' }}</el-descriptions-item>
    <el-descriptions-item label="在线状态">
      <el-tag :type="merchant.is_online ? 'success' : 'info'" size="small">
        {{ merchant.is_online ? '🟢 在线' : '⚪ 离线' }}
      </el-tag>
    </el-descriptions-item>
    <el-descriptions-item label="创建时间" :span="2">
      {{ merchant.created_at || '-' }}
    </el-descriptions-item>
  </el-descriptions>
</template>

<script setup>
defineProps({
  merchant: {
    type: Object,
    required: true,
  },
})
</script>
