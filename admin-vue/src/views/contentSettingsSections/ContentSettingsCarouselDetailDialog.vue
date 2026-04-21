<template>
  <el-dialog
    :model-value="visible"
    title="轮播图详情"
    width="600px"
    class="content-settings-carousel-detail-dialog"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-if="carousel" class="carousel-detail">
      <div class="detail-image">
        <el-image
          :src="carousel.image_url"
          fit="contain"
          class="detail-image-preview"
          :preview-src-list="[carousel.image_url]"
        />
      </div>
      <el-descriptions :column="1" border size="small" class="detail-info">
        <el-descriptions-item label="ID">{{ carousel.id }}</el-descriptions-item>
        <el-descriptions-item label="标题">{{ carousel.title || '无标题' }}</el-descriptions-item>
        <el-descriptions-item label="跳转链接">
          <a
            v-if="carousel.link_url"
            :href="carousel.link_url"
            target="_blank"
            rel="noopener noreferrer"
            class="detail-link"
          >
            {{ carousel.link_url }}
          </a>
          <span v-else>无链接</span>
        </el-descriptions-item>
        <el-descriptions-item label="排序">{{ carousel.sort_order }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="carousel.is_active ? 'success' : 'danger'">
            {{ carousel.is_active ? '启用' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="图片URL">
          <el-input :model-value="carousel.image_url" readonly size="small">
            <template #append>
              <el-button size="small" @click="copyToClipboard(carousel.image_url)">复制</el-button>
            </template>
          </el-input>
        </el-descriptions-item>
      </el-descriptions>
    </div>
    <template #footer>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
      <el-button type="primary" @click="editFromDetail">编辑</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  carousel: {
    type: Object,
    default: null,
  },
  editFromDetail: {
    type: Function,
    required: true,
  },
  copyToClipboard: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
</script>

<style scoped>
.carousel-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-image {
  text-align: center;
  background: #f5f7fa;
  padding: 20px;
  border-radius: 4px;
}

.detail-image-preview {
  width: 100%;
  max-height: 400px;
}

.detail-info {
  margin-top: 10px;
}

.detail-link {
  color: #409eff;
}
</style>
