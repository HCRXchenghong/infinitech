<template>
  <div class="preview-page">
    <div class="preview-topbar">
      <el-button text @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回列表
      </el-button>
      <el-button v-if="notification.id" type="primary" link @click="goEdit">去编辑</el-button>
    </div>

    <el-card class="preview-card" v-loading="loading">
      <template #header>
        <div class="header-row">
          <span class="header-title">通知预览</span>
          <el-tag :type="getAdminNotificationStatusTagType(notification.is_published)">
            {{ formatAdminNotificationStatus(notification.is_published) }}
          </el-tag>
        </div>
      </template>

      <el-alert
        v-if="loadError"
        :title="loadError"
        type="error"
        show-icon
        :closable="false"
        class="state-alert"
      />

      <el-empty v-else-if="!loading && !notification.id" description="通知不存在或已被删除" />

      <article v-else class="article">
        <h1 class="article-title">{{ notification.title || '未命名通知' }}</h1>
        <div class="article-meta">
          <span>{{ notification.source || '悦享e食' }}</span>
          <span>·</span>
          <span>{{ formatAdminNotificationTime(notification.updated_at || notification.created_at) }}</span>
        </div>

        <el-image
          v-if="notification.cover"
          :src="notification.cover"
          fit="cover"
          class="article-cover"
          :preview-src-list="[notification.cover]"
          preview-teleported
        />

        <div class="article-content">
          <template v-for="(block, index) in blocks" :key="`block_${index}`">
            <p v-if="block.type === 'p'" class="p-block">{{ block.text }}</p>
            <h2 v-else-if="block.type === 'h2'" class="h2-block">{{ block.text }}</h2>
            <blockquote v-else-if="block.type === 'quote'" class="quote-block">{{ block.text }}</blockquote>
            <ul v-else-if="block.type === 'ul'" class="ul-block">
              <li v-for="(item, itemIndex) in block.items" :key="`li_${itemIndex}`">{{ item }}</li>
            </ul>
            <figure v-else-if="block.type === 'img'" class="img-block">
              <el-image
                v-if="block.url"
                :src="block.url"
                fit="cover"
                class="inline-img"
                :preview-src-list="[block.url]"
                preview-teleported
              />
              <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
            </figure>
          </template>
        </div>
      </article>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';
import {
  formatAdminNotificationStatus,
  formatAdminNotificationTime,
  getAdminNotificationStatusTagType,
  normalizeAdminNotificationRecord,
} from '@infinitech/admin-core';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import { parseNotificationDisplayBlocks } from '@infinitech/domain-core';
import request from '@/utils/request';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const loadError = ref('');
const notification = ref({});

const blocks = computed(() => {
  return parseNotificationDisplayBlocks(notification.value.content);
});

async function loadNotification() {
  loading.value = true;
  loadError.value = '';
  try {
    const id = route.params.id;
    const { data } = await request.get(`/api/notifications/admin/${id}`);
    notification.value = normalizeAdminNotificationRecord(extractEnvelopeData(data) || {});
  } catch (error) {
    notification.value = {};
    loadError.value = extractErrorMessage(error, '加载通知失败');
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push('/notifications');
}

function goEdit() {
  if (!notification.value?.id) return;
  router.push(`/notifications/edit/${notification.value.id}`);
}

onMounted(loadNotification);
</script>

<style scoped>
.preview-page {
  padding: 8px;
}

.preview-topbar {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-card {
  max-width: 920px;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
}

.state-alert {
  margin-bottom: 14px;
}

.article-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.4;
  color: #111827;
}

.article-meta {
  margin-top: 12px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
}

.article-cover {
  width: 100%;
  border-radius: 12px;
  margin-bottom: 18px;
}

.article-content {
  color: #1f2937;
}

.p-block,
.h2-block,
.quote-block,
.ul-block,
.img-block {
  margin: 0 0 16px;
}

.p-block {
  white-space: pre-wrap;
  line-height: 1.9;
}

.h2-block {
  font-size: 22px;
  line-height: 1.6;
}

.quote-block {
  border-left: 4px solid #c7d2fe;
  background: #f8fafc;
  color: #4b5563;
  padding: 10px 14px;
}

.ul-block {
  padding-left: 20px;
  line-height: 1.9;
}

.inline-img {
  width: 100%;
  border-radius: 10px;
}

.img-block figcaption {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}
</style>
