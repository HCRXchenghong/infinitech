<template>
  <div class="panel">
    <div class="panel-title">入驻邀请信息</div>
    <el-descriptions :column="2" border size="small">
      <el-descriptions-item label="来源">
        {{ formatOnboardingSource(merchant.onboarding_info?.source) }}
      </el-descriptions-item>
      <el-descriptions-item label="邀请类型">
        {{ formatOnboardingType(merchant.onboarding_info?.invite_type) }}
      </el-descriptions-item>
      <el-descriptions-item label="提交时间">{{ merchant.onboarding_info?.submitted_at || '-' }}</el-descriptions-item>
      <el-descriptions-item label="邀请链接ID">{{ merchant.onboarding_info?.invite_link_id || '-' }}</el-descriptions-item>
      <el-descriptions-item label="链接状态">{{ merchant.onboarding_info?.invite_status || '-' }}</el-descriptions-item>
      <el-descriptions-item label="链接过期">{{ merchant.onboarding_info?.invite_expires_at || '-' }}</el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script setup>
defineProps({
  merchant: {
    type: Object,
    default: () => ({}),
  },
  formatOnboardingSource: {
    type: Function,
    required: true,
  },
  formatOnboardingType: {
    type: Function,
    required: true,
  },
});
</script>
