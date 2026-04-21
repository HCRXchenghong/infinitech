<template>
  <div class="page-header">
    <div class="header-left">
      <el-button text @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <span class="page-title">{{ titleText }}</span>
    </div>
    <div v-if="!isPreview" class="header-actions">
      <el-button @click="saveDraft" :loading="saving" :disabled="publishing || uploadingCover">保存草稿</el-button>
      <el-button type="primary" @click="publish" :loading="publishing" :disabled="saving || uploadingCover">发布</el-button>
    </div>
  </div>
</template>

<script setup>
import { ArrowLeft } from '@element-plus/icons-vue'

defineProps({
  titleText: {
    type: String,
    required: true,
  },
  isPreview: {
    type: Boolean,
    default: false,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  publishing: {
    type: Boolean,
    default: false,
  },
  uploadingCover: {
    type: Boolean,
    default: false,
  },
  goBack: {
    type: Function,
    required: true,
  },
  saveDraft: {
    type: Function,
    required: true,
  },
  publish: {
    type: Function,
    required: true,
  },
})
</script>
