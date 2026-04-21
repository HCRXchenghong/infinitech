<template>
  <div class="panel">
    <div class="panel-title">商户基本信息</div>
    <el-descriptions :column="2" border size="small">
      <el-descriptions-item label="商户名称">{{ merchant.name || '-' }}</el-descriptions-item>
      <el-descriptions-item label="负责人">{{ merchant.owner_name || '-' }}</el-descriptions-item>
      <el-descriptions-item label="手机号">{{ merchant.phone || '-' }}</el-descriptions-item>
      <el-descriptions-item label="店铺数量">{{ shops.length }}</el-descriptions-item>
      <el-descriptions-item label="营业执照" :span="2">
        <el-image
          v-if="merchant.business_license_image"
          class="license-image"
          :src="merchant.business_license_image"
          :preview-src-list="[merchant.business_license_image]"
          fit="cover"
        />
        <span v-else>-</span>
      </el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ merchant.created_at || '-' }}</el-descriptions-item>
      <el-descriptions-item label="更新时间">{{ merchant.updated_at || '-' }}</el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script setup>
defineProps({
  merchant: {
    type: Object,
    default: () => ({}),
  },
  shops: {
    type: Array,
    default: () => [],
  },
});
</script>
