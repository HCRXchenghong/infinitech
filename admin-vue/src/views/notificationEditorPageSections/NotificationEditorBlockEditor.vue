<template>
  <div class="block-editor">
    <div v-if="!isPreview" class="block-toolbar">
      <el-button size="small" @click="addBlock('p')">
        <el-icon><Document /></el-icon>
        段落
      </el-button>
      <el-button size="small" @click="addBlock('h2')">
        <el-icon><Memo /></el-icon>
        标题
      </el-button>
      <el-button size="small" @click="addBlock('quote')">
        <el-icon><ChatLineSquare /></el-icon>
        引用
      </el-button>
      <el-button size="small" @click="addBlock('ul')">
        <el-icon><List /></el-icon>
        列表
      </el-button>
      <el-button size="small" @click="addBlock('img')">
        <el-icon><Picture /></el-icon>
        图片
      </el-button>
    </div>

    <div class="block-list">
      <div v-if="form.blocks.length === 0" class="empty-blocks">
        <el-empty description="暂无内容块，请先添加" :image-size="90" />
      </div>

      <div
        v-for="(block, index) in form.blocks"
        :key="block.key"
        class="block-card"
      >
        <div class="block-card-header">
          <el-tag size="small" effect="plain">{{ blockTypeLabel[block.type] || block.type }}</el-tag>
          <div v-if="!isPreview" class="block-card-actions">
            <el-button text :disabled="index === 0" @click="moveBlockUp(index)">
              <el-icon><Top /></el-icon>
            </el-button>
            <el-button text :disabled="index === form.blocks.length - 1" @click="moveBlockDown(index)">
              <el-icon><Bottom /></el-icon>
            </el-button>
            <el-button text type="danger" @click="removeBlock(index)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>

        <div class="block-card-body">
          <el-input
            v-if="block.type === 'p'"
            v-model="block.text"
            type="textarea"
            :rows="4"
            placeholder="请输入段落内容"
            :disabled="isPreview"
          />

          <el-input
            v-else-if="block.type === 'h2'"
            v-model="block.text"
            placeholder="请输入标题"
            :disabled="isPreview"
          />

          <el-input
            v-else-if="block.type === 'quote'"
            v-model="block.text"
            type="textarea"
            :rows="3"
            placeholder="请输入引用内容"
            :disabled="isPreview"
          />

          <div v-else-if="block.type === 'ul'" class="list-block">
            <div
              v-for="(item, itemIndex) in block.items"
              :key="`${block.key}_item_${itemIndex}`"
              class="list-item-row"
            >
              <el-input
                v-model="block.items[itemIndex]"
                placeholder="请输入列表项"
                :disabled="isPreview"
              />
              <el-button
                v-if="!isPreview"
                text
                type="danger"
                @click="removeListItem(index, itemIndex)"
              >
                删除
              </el-button>
            </div>
            <el-button v-if="!isPreview" size="small" @click="addListItem(index)">
              <el-icon><Plus /></el-icon>
              添加列表项
            </el-button>
          </div>

          <div v-else-if="block.type === 'img'" class="img-block">
            <div class="img-block-main">
              <el-image
                v-if="block.url"
                :src="block.url"
                class="inline-image"
                fit="cover"
                :preview-src-list="[block.url]"
                preview-teleported
              />
              <div v-else class="inline-image empty">暂无图片</div>

              <el-upload
                v-if="!isPreview"
                :show-file-list="false"
                :http-request="(option) => uploadBlockImage(option, index)"
                accept="image/*"
              >
                <el-button :loading="Boolean(uploadingBlockMap[block.key])" :disabled="saving || publishing">
                  <el-icon><Picture /></el-icon>
                  上传内容图
                </el-button>
              </el-upload>
            </div>
            <el-input
              v-model="block.caption"
              placeholder="图片说明（可选）"
              :disabled="isPreview"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  Bottom,
  ChatLineSquare,
  Delete,
  Document,
  List,
  Memo,
  Picture,
  Plus,
  Top,
} from '@element-plus/icons-vue'

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
  uploadBlockImage: {
    type: Function,
    required: true,
  },
})
</script>
