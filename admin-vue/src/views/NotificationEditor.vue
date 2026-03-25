<template>
  <div class="editor-page">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" text>
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <span class="page-title">{{ isEdit ? '编辑通知' : '新建通知' }}</span>
      </div>
      <div class="header-actions">
        <el-button @click="saveDraft" :loading="saving">保存草稿</el-button>
        <el-button type="primary" @click="publish" :loading="publishing">发布</el-button>
      </div>
    </div>

    <div class="editor-container">
      <el-card class="editor-card">
        <el-form :model="form" label-width="80px" label-position="top">
          <el-form-item label="通知标题" required>
            <el-input
              v-model="form.title"
              placeholder="请输入通知标题"
              maxlength="100"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="来源">
            <el-input
              v-model="form.source"
              placeholder="例如：悦享e食"
              maxlength="50"
            />
          </el-form-item>

          <el-form-item label="封面图">
            <div class="cover-upload">
              <el-upload
                class="cover-uploader"
                :action="uploadUrl"
                :show-file-list="false"
                :on-success="handleCoverSuccess"
                :before-upload="beforeCoverUpload"
                accept="image/*"
              >
                <img v-if="form.cover" :src="form.cover" class="cover-image" />
                <div v-else class="cover-placeholder">
                  <el-icon><Plus /></el-icon>
                  <div class="cover-hint">上传封面图</div>
                </div>
              </el-upload>
              <div class="cover-tips">
                <div>建议尺寸：750x400px</div>
                <div>支持 JPG、PNG 格式，大小不超过 2MB</div>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="通知内容" required>
            <div class="content-editor">
              <div class="editor-toolbar">
                <el-button-group>
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
                </el-button-group>
              </div>

              <div class="blocks-container">
                <div
                  v-for="(block, index) in form.content.blocks"
                  :key="index"
                  class="block-item"
                >
                  <div class="block-header">
                    <span class="block-type">{{ getBlockTypeName(block.type) }}</span>
                    <div class="block-actions">
                      <el-button
                        size="small"
                        text
                        @click="moveBlockUp(index)"
                        :disabled="index === 0"
                      >
                        <el-icon><Top /></el-icon>
                      </el-button>
                      <el-button
                        size="small"
                        text
                        @click="moveBlockDown(index)"
                        :disabled="index === form.content.blocks.length - 1"
                      >
                        <el-icon><Bottom /></el-icon>
                      </el-button>
                      <el-button
                        size="small"
                        text
                        type="danger"
                        @click="removeBlock(index)"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                  </div>

                  <!-- 段落 -->
                  <el-input
                    v-if="block.type === 'p'"
                    v-model="block.text"
                    type="textarea"
                    :rows="3"
                    placeholder="请输入段落内容"
                  />

                  <!-- 标题 -->
                  <el-input
                    v-else-if="block.type === 'h2'"
                    v-model="block.text"
                    placeholder="请输入标题"
                  />

                  <!-- 引用 -->
                  <el-input
                    v-else-if="block.type === 'quote'"
                    v-model="block.text"
                    type="textarea"
                    :rows="2"
                    placeholder="请输入引用内容"
                  />

                  <!-- 列表 -->
                  <div v-else-if="block.type === 'ul'" class="list-editor">
                    <div
                      v-for="(item, itemIndex) in block.items"
                      :key="itemIndex"
                      class="list-item-editor"
                    >
                      <el-input
                        v-model="block.items[itemIndex]"
                        placeholder="列表项"
                      >
                        <template #append>
                          <el-button
                            @click="removeListItem(index, itemIndex)"
                            :icon="Delete"
                          />
                        </template>
                      </el-input>
                    </div>
                    <el-button
                      size="small"
                      @click="addListItem(index)"
                      style="margin-top: 8px;"
                    >
                      <el-icon><Plus /></el-icon>
                      添加列表项
                    </el-button>
                  </div>

                  <!-- 图片 -->
                  <div v-else-if="block.type === 'img'" class="image-editor">
                    <el-upload
                      class="image-uploader"
                      :action="uploadUrl"
                      :show-file-list="false"
                      :on-success="(res) => handleImageSuccess(res, index)"
                      :before-upload="beforeImageUpload"
                      accept="image/*"
                    >
                      <img v-if="block.url" :src="block.url" class="uploaded-image" />
                      <div v-else class="image-placeholder">
                        <el-icon><Plus /></el-icon>
                        <div>上传图片</div>
                      </div>
                    </el-upload>
                    <el-input
                      v-model="block.caption"
                      placeholder="图片说明（可选）"
                      style="margin-top: 8px;"
                    />
                  </div>
                </div>

                <div v-if="form.content.blocks.length === 0" class="empty-blocks">
                  <el-empty description="暂无内容，请点击上方按钮添加内容块" />
                </div>
              </div>
            </div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 预览区域 -->
      <el-card class="preview-card">
        <template #header>
          <div class="preview-header">
            <span>预览</span>
            <el-tag size="small">实时预览</el-tag>
          </div>
        </template>
        <div class="preview-content">
          <div class="preview-title">{{ form.title || '通知标题' }}</div>
          <div class="preview-meta">
            <span>{{ formatTime(new Date()) }}</span>
            <span>·</span>
            <span>{{ form.source || '悦享e食' }}</span>
          </div>
          <img v-if="form.cover" :src="form.cover" class="preview-cover" />
          <div class="preview-body">
            <div v-for="(block, index) in form.content.blocks" :key="index">
              <p v-if="block.type === 'p'" class="preview-p">{{ block.text }}</p>
              <h2 v-else-if="block.type === 'h2'" class="preview-h2">{{ block.text }}</h2>
              <blockquote v-else-if="block.type === 'quote'" class="preview-quote">
                {{ block.text }}
              </blockquote>
              <ul v-else-if="block.type === 'ul'" class="preview-ul">
                <li v-for="(item, i) in block.items" :key="i">{{ item }}</li>
              </ul>
              <div v-else-if="block.type === 'img'" class="preview-img">
                <img :src="block.url" />
                <p v-if="block.caption" class="preview-caption">{{ block.caption }}</p>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  Plus,
  Document,
  Memo,
  ChatLineSquare,
  List,
  Picture,
  Top,
  Bottom,
  Delete
} from '@element-plus/icons-vue'
import axios from 'axios'
import {
  createEmptyNotificationForm,
  normalizeNotificationContent,
  createBlock,
  moveBlock,
  getBlockTypeName,
  validateImageFile,
  buildNotificationPayload
} from './notificationEditorHelpers'

const router = useRouter()
const route = useRoute()

const isEdit = ref(false)
const saving = ref(false)
const publishing = ref(false)
const uploadUrl = ref('/api/upload/image')

const form = ref(createEmptyNotificationForm())

const loadNotification = async (id) => {
  try {
    const res = await axios.get(`/api/notifications/admin/${id}`)
    if (res.data) {
      form.value = {
        title: res.data.title || '',
        source: res.data.source || '悦享e食',
        cover: res.data.cover || '',
        content: normalizeNotificationContent(res.data.content)
      }
    }
  } catch (error) {
    console.error('加载通知失败:', error)
    ElMessage.error('加载通知失败')
  }
}

const addBlock = (type) => {
  form.value.content.blocks.push(createBlock(type))
}

const removeBlock = (index) => {
  form.value.content.blocks.splice(index, 1)
}

const moveBlockUp = (index) => {
  moveBlock(form.value.content.blocks, index, -1)
}

const moveBlockDown = (index) => {
  moveBlock(form.value.content.blocks, index, 1)
}

const addListItem = (blockIndex) => {
  form.value.content.blocks[blockIndex].items.push('')
}

const removeListItem = (blockIndex, itemIndex) => {
  form.value.content.blocks[blockIndex].items.splice(itemIndex, 1)
}

const handleCoverSuccess = (response) => {
  if (response.url) {
    form.value.cover = response.url
    ElMessage.success('封面上传成功')
  } else {
    ElMessage.error('封面上传失败')
  }
}

const beforeCoverUpload = (file) => {
  const result = validateImageFile(file, 2)
  if (!result.valid) {
    ElMessage.error(result.message)
    return false
  }
  return true
}

const handleImageSuccess = (response, blockIndex) => {
  if (response.url) {
    form.value.content.blocks[blockIndex].url = response.url
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error('图片上传失败')
  }
}

const beforeImageUpload = (file) => {
  const result = validateImageFile(file, 5)
  if (!result.valid) {
    ElMessage.error(result.message)
    return false
  }
  return true
}

const saveDraft = async () => {
  if (!form.value.title) {
    ElMessage.warning('请输入通知标题')
    return
  }

  saving.value = true
  try {
    const data = buildNotificationPayload(form.value, false)

    if (isEdit.value) {
      await axios.put(`/api/notifications/admin/${route.params.id}`, data)
      ElMessage.success('保存成功')
    } else {
      const res = await axios.post('/api/notifications/admin', data)
      ElMessage.success('保存成功')
      isEdit.value = true
      router.replace(`/notifications/edit/${res.data.id}`)
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const publish = async () => {
  if (!form.value.title) {
    ElMessage.warning('请输入通知标题')
    return
  }
  if (form.value.content.blocks.length === 0) {
    ElMessage.warning('请添加通知内容')
    return
  }

  publishing.value = true
  try {
    const data = buildNotificationPayload(form.value, true)

    if (isEdit.value) {
      await axios.put(`/api/notifications/admin/${route.params.id}`, data)
    } else {
      await axios.post('/api/notifications/admin', data)
    }

    ElMessage.success('发布成功')
    router.push('/notifications')
  } catch (error) {
    console.error('发布失败:', error)
    ElMessage.error('发布失败')
  } finally {
    publishing.value = false
  }
}

const goBack = () => {
  router.back()
}

const formatTime = (date) => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  if (route.params.id) {
    isEdit.value = true
    loadNotification(route.params.id)
  }
})
</script>

<style scoped lang="css" src="./NotificationEditor.css"></style>
