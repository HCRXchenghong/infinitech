<template>
  <div class="editor-page">
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

    <div class="content-grid">
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
          </el-form-item>
        </el-form>
      </el-card>

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
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  ArrowLeft,
  Bottom,
  ChatLineSquare,
  Delete,
  Document,
  List,
  Memo,
  Picture,
  Plus,
  Top
} from '@element-plus/icons-vue';
import { extractEnvelopeData, extractErrorMessage, extractUploadAsset } from '@infinitech/contracts';
import request from '@/utils/request';
import {
  blockTypeLabel,
  createDefaultEditorForm,
  createBlock,
  parseContent,
  sanitizeBlocks,
  moveBlock,
  buildPayload
} from './notificationEditorPageHelpers';

const router = useRouter();
const route = useRoute();

const saving = ref(false);
const publishing = ref(false);
const uploadingCover = ref(false);
const uploadingBlockMap = ref({});
const form = ref(createDefaultEditorForm());

function ensureInitialBlock() {
  if (!form.value.blocks.length && !isPreview.value) {
    form.value.blocks = [createBlock('p')];
  }
}

const notificationId = computed(() => route.params.id);
const isPreview = computed(() => route.path.startsWith('/notifications/preview/'));
const isEdit = computed(() => route.path.startsWith('/notifications/edit/') && !!notificationId.value);

const nowText = computed(() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
});

const titleText = computed(() => {
  if (isPreview.value) return '通知预览';
  if (isEdit.value) return '编辑通知';
  return '新建通知';
});

async function loadNotification() {
  if (!notificationId.value) {
    ensureInitialBlock();
    return;
  }

  try {
    const { data } = await request.get(`/api/notifications/admin/${notificationId.value}`);
    const payload = extractEnvelopeData(data) || {};
    form.value = {
      title: payload.title || '',
      source: payload.source || '悦享e食',
      cover: payload.cover || '',
      blocks: parseContent(payload.content)
    };
    ensureInitialBlock();
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '加载通知失败'));
    ensureInitialBlock();
  }
}

function addBlock(type) {
  form.value.blocks.push(createBlock(type));
}

function removeBlock(index) {
  form.value.blocks.splice(index, 1);
  ensureInitialBlock();
}

function moveBlockUp(index) {
  moveBlock(form.value.blocks, index, -1);
}

function moveBlockDown(index) {
  moveBlock(form.value.blocks, index, 1);
}

function addListItem(blockIndex) {
  form.value.blocks[blockIndex].items.push('');
}

function removeListItem(blockIndex, itemIndex) {
  const block = form.value.blocks[blockIndex];
  if (!block || !Array.isArray(block.items)) return;
  if (block.items.length <= 1) {
    block.items[0] = '';
    return;
  }
  block.items.splice(itemIndex, 1);
}

async function uploadCover(option) {
  uploadingCover.value = true;
  try {
    const fd = new FormData();
    fd.append('image', option.file);
    const { data } = await request.post('/api/upload/image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    const asset = extractUploadAsset(data);
    const imageUrl = asset?.url || '';
    if (!imageUrl) throw new Error('no image url');
    form.value.cover = imageUrl;
    ElMessage.success('封面上传成功');
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '封面上传失败'));
  } finally {
    uploadingCover.value = false;
  }
}

async function uploadBlockImage(option, blockIndex) {
  const block = form.value.blocks[blockIndex];
  if (!block?.key) return;
  uploadingBlockMap.value = {
    ...uploadingBlockMap.value,
    [block.key]: true
  };
  try {
    const fd = new FormData();
    fd.append('image', option.file);
    const { data } = await request.post('/api/upload/image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    const asset = extractUploadAsset(data);
    const imageUrl = asset?.url || '';
    if (!imageUrl) throw new Error('no image url');
    form.value.blocks[blockIndex].url = imageUrl;
    ElMessage.success('内容图上传成功');
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '内容图上传失败'));
  } finally {
    const next = { ...uploadingBlockMap.value };
    delete next[block.key];
    uploadingBlockMap.value = next;
  }
}

async function submitNotification(published) {
  if (!form.value.title.trim()) {
    ElMessage.warning('请输入通知标题');
    return false;
  }

  const blocks = sanitizeBlocks(form.value.blocks);
  if (blocks.length === 0) {
    ElMessage.warning('请至少添加一个有效内容块');
    return false;
  }

  const payload = buildPayload(form.value, published);

  if (isEdit.value) {
    await request.put(`/api/notifications/admin/${notificationId.value}`, payload);
    return true;
  }

  const { data } = await request.post('/api/notifications/admin', payload);
  const created = extractEnvelopeData(data) || {};
  if (created?.id) {
    router.replace(`/notifications/edit/${created.id}`);
  }
  return true;
}

async function saveDraft() {
  if (saving.value || publishing.value) return;
  saving.value = true;
  try {
    const ok = await submitNotification(false);
    if (ok) {
      ElMessage.success('草稿已保存');
    }
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '保存失败'));
  } finally {
    saving.value = false;
  }
}

async function publish() {
  if (publishing.value || saving.value) return;
  publishing.value = true;
  try {
    const ok = await submitNotification(true);
    if (ok) {
      ElMessage.success('发布成功');
      router.push('/notifications');
    }
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '发布失败'));
  } finally {
    publishing.value = false;
  }
}

function goBack() {
  router.push('/notifications');
}

onMounted(loadNotification);
</script>

<style scoped lang="css" src="./NotificationEditorPage.css"></style>
