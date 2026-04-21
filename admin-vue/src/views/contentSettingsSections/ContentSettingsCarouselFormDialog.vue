<template>
  <el-dialog
    :model-value="visible"
    title="添加轮播图"
    width="600px"
    class="content-settings-carousel-form-dialog"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form :model="newCarousel" label-width="100px" size="small">
      <el-form-item label="图片" required>
        <el-upload
          class="carousel-uploader"
          :http-request="uploadCarouselImage"
          :show-file-list="false"
          :before-upload="beforeCarouselUpload"
          accept="image/*"
        >
          <el-image
            v-if="newCarousel.image_url"
            :src="newCarousel.image_url"
            fit="cover"
            class="carousel-form-preview"
          />
          <el-icon v-else class="carousel-uploader-icon"><Plus /></el-icon>
          <template #tip>
            <div class="el-upload__tip">只能上传 jpg/png 文件，且不超过 10MB</div>
          </template>
        </el-upload>
      </el-form-item>
      <el-form-item label="标题">
        <el-input v-model="newCarousel.title" placeholder="请输入标题（可选）" />
      </el-form-item>
      <el-form-item label="跳转链接">
        <el-input v-model="newCarousel.link_url" placeholder="请输入跳转链接（可选）" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number
          v-model="newCarousel.sort_order"
          :min="0"
          :max="999"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-switch v-model="newCarousel.is_active" />
        <span class="switch-hint">{{ newCarousel.is_active ? '启用' : '禁用' }}</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="cancelAddCarousel">取消</el-button>
      <el-button type="primary" :loading="saving" @click="confirmAddCarousel">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { Plus } from '@element-plus/icons-vue';

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  newCarousel: {
    type: Object,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  cancelAddCarousel: {
    type: Function,
    required: true,
  },
  confirmAddCarousel: {
    type: Function,
    required: true,
  },
  uploadCarouselImage: {
    type: Function,
    required: true,
  },
  beforeCarouselUpload: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
</script>

<style scoped>
.carousel-form-preview {
  width: 200px;
  height: 120px;
  border-radius: 4px;
}

.switch-hint {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}
</style>
