<template>
  <el-card>
    <template #header>
      <div class="preview-header">
        <span>预览</span>
        <el-tag size="small" type="info">{{ isPreview ? '只读模式' : '实时预览' }}</el-tag>
      </div>
    </template>

    <div class="preview">
      <h2 class="preview-title">{{ form.title || '通知标题' }}</h2>
      <div class="preview-meta">
        <span>{{ form.source || '悦享e食' }}</span>
        <span>·</span>
        <span>{{ nowText }}</span>
      </div>

      <el-image v-if="form.cover" :src="form.cover" class="preview-cover" fit="cover" />

      <div class="preview-body">
        <template v-for="block in form.blocks" :key="`preview_${block.key}`">
          <p v-if="block.type === 'p'" class="preview-p">{{ block.text }}</p>
          <h3 v-else-if="block.type === 'h2'" class="preview-h2">{{ block.text }}</h3>
          <blockquote v-else-if="block.type === 'quote'" class="preview-quote">{{ block.text }}</blockquote>
          <ul v-else-if="block.type === 'ul'" class="preview-ul">
            <li v-for="(item, itemIndex) in block.items" :key="`preview_item_${itemIndex}`">{{ item }}</li>
          </ul>
          <div v-else-if="block.type === 'img'" class="preview-img-wrap">
            <el-image v-if="block.url" :src="block.url" class="preview-inline-image" fit="cover" />
            <p v-if="block.caption" class="preview-caption">{{ block.caption }}</p>
          </div>
        </template>
        <div v-if="form.blocks.length === 0" class="preview-empty">暂无内容</div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  form: {
    type: Object,
    required: true,
  },
  isPreview: {
    type: Boolean,
    default: false,
  },
  nowText: {
    type: String,
    required: true,
  },
})
</script>
