<template>
  <div class="preview-topbar">
    <el-button text @click="goBack">
      <el-icon><ArrowLeft /></el-icon>
      返回列表
    </el-button>
    <el-button v-if="notificationId" type="primary" link @click="goEdit">去编辑</el-button>
  </div>
</template>

<script setup>
import { ArrowLeft } from '@element-plus/icons-vue';

defineProps({
  goBack: {
    type: Function,
    required: true,
  },
  goEdit: {
    type: Function,
    required: true,
  },
  notificationId: {
    type: [String, Number],
    default: '',
  },
});
</script>
