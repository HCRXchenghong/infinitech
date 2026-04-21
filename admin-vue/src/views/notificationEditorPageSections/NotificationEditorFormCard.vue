<template>
  <el-card>
    <el-form :model="form" label-position="top">
      <el-form-item label="通知标题" required>
        <el-input
          v-model="form.title"
          maxlength="100"
          show-word-limit
          placeholder="请输入通知标题"
          :disabled="isPreview"
        />
      </el-form-item>

      <el-form-item label="来源">
        <el-input
          v-model="form.source"
          maxlength="50"
          placeholder="例如：悦享e食"
          :disabled="isPreview"
        />
      </el-form-item>

      <el-form-item label="封面图">
        <div class="cover-wrap">
          <el-image
            v-if="form.cover"
            :src="form.cover"
            class="cover-preview"
            fit="cover"
            :preview-src-list="[form.cover]"
            preview-teleported
          />
          <div v-else class="cover-empty">暂无封面</div>
          <el-upload
            v-if="!isPreview"
            :show-file-list="false"
            :http-request="uploadCover"
            accept="image/*"
          >
            <el-button :loading="uploadingCover" :disabled="saving || publishing">
              <el-icon><Picture /></el-icon>
              上传封面
            </el-button>
          </el-upload>
        </div>
      </el-form-item>

      <el-form-item label="通知正文" required>
        <NotificationEditorBlockEditor
          :form="form"
          :is-preview="isPreview"
          :saving="saving"
          :publishing="publishing"
          :uploading-block-map="uploadingBlockMap"
          :block-type-label="blockTypeLabel"
          :add-block="addBlock"
          :remove-block="removeBlock"
          :move-block-up="moveBlockUp"
          :move-block-down="moveBlockDown"
          :add-list-item="addListItem"
          :remove-list-item="removeListItem"
          :upload-block-image="uploadBlockImage"
        />
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { Picture } from '@element-plus/icons-vue'
import NotificationEditorBlockEditor from './NotificationEditorBlockEditor.vue'

defineProps({
  form: {
    type: Object,
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
  uploadingBlockMap: {
    type: Object,
    default: () => ({}),
  },
  blockTypeLabel: {
    type: Object,
    default: () => ({}),
  },
  addBlock: {
    type: Function,
    required: true,
  },
  removeBlock: {
    type: Function,
    required: true,
  },
  moveBlockUp: {
    type: Function,
    required: true,
  },
  moveBlockDown: {
    type: Function,
    required: true,
  },
  addListItem: {
    type: Function,
    required: true,
  },
  removeListItem: {
    type: Function,
    required: true,
  },
  uploadCover: {
    type: Function,
    required: true,
  },
  uploadBlockImage: {
    type: Function,
    required: true,
  },
})
</script>
