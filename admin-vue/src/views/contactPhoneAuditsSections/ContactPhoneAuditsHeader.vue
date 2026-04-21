<template>
  <div class="contact-phone-audits-header">
    <div>
      <div class="contact-phone-audits-title">电话联系审计</div>
      <div class="contact-phone-audits-subtitle">
        查看各端触发系统电话联系的真实记录，便于排查投诉、订单协作和热线使用情况。
      </div>
    </div>

    <div class="contact-phone-audits-actions">
      <el-button size="small" :loading="loading" @click="loadAudits">刷新</el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loadAudits: {
    type: Function,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});
</script>
