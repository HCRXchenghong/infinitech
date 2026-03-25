<template>
  <div class="image-upload">
    <div v-if="imageUrl" class="image-preview">
      <img :src="imageUrl" alt="预览" />
      <div class="image-actions">
        <el-button size="small" type="danger" @click="handleRemove">删除</el-button>
      </div>
    </div>
    <el-upload
      v-else
      class="upload-area"
      :action="uploadUrl"
      :show-file-list="false"
      :before-upload="beforeUpload"
      :on-success="handleSuccess"
      :on-error="handleError"
      drag
    >
      <el-icon class="upload-icon"><Plus /></el-icon>
      <div class="upload-text">点击或拖拽上传图片</div>
      <div class="upload-hint">支持 jpg, png, gif, webp 格式，最大 5MB</div>
    </el-upload>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  maxSize: {
    type: Number,
    default: 5
  }
})

const emit = defineEmits(['update:modelValue'])

const imageUrl = ref(props.modelValue)
const UPLOAD_PATH = '/api/upload'

function resolveUploadUrl() {
  const rawBaseURL = String(request?.defaults?.baseURL || '').replace(/\/+$/, '')
  if (!rawBaseURL) {
    return UPLOAD_PATH
  }
  const normalizedBaseURL = rawBaseURL.replace(/\/api$/i, '')
  return `${normalizedBaseURL}${UPLOAD_PATH}`
}

const uploadUrl = ref(resolveUploadUrl())

watch(() => props.modelValue, (newVal) => {
  imageUrl.value = newVal
})

const beforeUpload = (file) => {
  const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
  const isLt5M = file.size / 1024 / 1024 < props.maxSize

  if (!isImage) {
    ElMessage.error('只能上传 jpg, png, gif, webp 格式的图片')
    return false
  }
  if (!isLt5M) {
    ElMessage.error(`图片大小不能超过 ${props.maxSize}MB`)
    return false
  }
  return true
}

const handleSuccess = (response) => {
  if (response.url) {
    imageUrl.value = response.url
    emit('update:modelValue', response.url)
    ElMessage.success('上传成功')
  } else {
    ElMessage.error('上传失败')
  }
}

const handleError = (error) => {
  console.error('上传失败:', error)
  ElMessage.error('上传失败，请重试')
}

const handleRemove = () => {
  imageUrl.value = ''
  emit('update:modelValue', '')
}
</script>

<style scoped>
.image-upload {
  width: 100%;
}

.image-preview {
  position: relative;
  width: 200px;
  height: 200px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  padding: 8px;
  text-align: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-preview:hover .image-actions {
  opacity: 1;
}

.upload-area {
  width: 200px;
  height: 200px;
}

.upload-area :deep(.el-upload) {
  width: 100%;
  height: 100%;
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  background: #fafafa;
  transition: all 0.3s;
}

.upload-area :deep(.el-upload-dragger:hover) {
  border-color: #409eff;
  background: #f5f7fa;
}

.upload-icon {
  font-size: 48px;
  color: #8c939d;
  margin-bottom: 12px;
}

.upload-text {
  font-size: 14px;
  color: #606266;
  margin-bottom: 4px;
}

.upload-hint {
  font-size: 12px;
  color: #909399;
}
</style>
