<template>
  <div class="notifications-page">
    <div class="page-header">
      <div>
        <div class="page-title">官方通知</div>
        <div class="page-subtitle">发布与维护平台公告</div>
      </div>
      <div class="header-actions">
        <el-button @click="loadNotifications" :loading="loading">
          <el-icon><RefreshRight /></el-icon>
          刷新
        </el-button>
        <el-button type="primary" @click="createNotification">
          <el-icon><Plus /></el-icon>
          新建通知
        </el-button>
      </div>
    </div>
    <PageStateAlert :message="loadError" />

    <el-card class="filter-card">
      <div class="filters">
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索标题/来源"
          class="filter-input"
        />
        <el-select v-model="statusFilter" class="filter-select">
          <el-option label="全部状态" value="all" />
          <el-option label="已发布" value="published" />
          <el-option label="草稿" value="draft" />
        </el-select>
      </div>

      <div class="stats-row">
        <el-tag type="info">总计 {{ normalizedNotifications.length }}</el-tag>
        <el-tag type="success">已发布 {{ publishedCount }}</el-tag>
        <el-tag>草稿 {{ draftCount }}</el-tag>
      </div>

      <el-table :data="pagedNotifications" v-loading="loading" stripe>
        <el-table-column type="index" label="#" width="56" />
        <el-table-column prop="title" label="标题" min-width="240" show-overflow-tooltip />
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.cover"
              :src="row.cover"
              style="width: 64px; height: 40px; border-radius: 6px;"
              fit="cover"
              :preview-src-list="[row.cover]"
              preview-teleported
            />
            <span v-else class="muted">无</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_published ? 'success' : 'info'">
              {{ row.is_published ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="120" />
        <el-table-column prop="updated_at" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.updated_at || row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="previewNotification(row)" :disabled="deletingId === row.id">预览</el-button>
            <el-button size="small" type="primary" @click="editNotification(row)" :disabled="deletingId === row.id">编辑</el-button>
            <el-popconfirm title="确定删除该通知？" @confirm="deleteNotification(row)">
              <template #reference>
                <el-button size="small" type="danger" :loading="deletingId === row.id">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无通知'" :image-size="90" />
        </template>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="filteredNotifications.length"
          :page-sizes="[10, 20, 50]"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, RefreshRight } from '@element-plus/icons-vue';
import request from '@/utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';

const router = useRouter();
const loading = ref(false);
const loadError = ref('');
const notifications = ref([]);
const deletingId = ref(null);

const keyword = ref('');
const statusFilter = ref('all');
const currentPage = ref(1);
const pageSize = ref(10);

function timeToNumber(raw) {
  if (!raw) return 0;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getTime();
}

const normalizedNotifications = computed(() => {
  return [...notifications.value]
    .map((item) => ({ ...item, is_published: Boolean(item?.is_published) }))
    .sort((a, b) => timeToNumber(b.updated_at || b.created_at) - timeToNumber(a.updated_at || a.created_at));
});

const filteredNotifications = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  return normalizedNotifications.value.filter((item) => {
    const title = String(item?.title || '').toLowerCase();
    const source = String(item?.source || '').toLowerCase();
    const matchKeyword = !q || title.includes(q) || source.includes(q);

    let matchStatus = true;
    if (statusFilter.value === 'published') {
      matchStatus = item.is_published;
    } else if (statusFilter.value === 'draft') {
      matchStatus = !item.is_published;
    }

    return matchKeyword && matchStatus;
  });
});

const pagedNotifications = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredNotifications.value.slice(start, end);
});

const publishedCount = computed(() => normalizedNotifications.value.filter((item) => item.is_published).length);
const draftCount = computed(() => normalizedNotifications.value.filter((item) => !item.is_published).length);

watch([keyword, statusFilter], () => {
  currentPage.value = 1;
});

watch([filteredNotifications, pageSize], () => {
  const maxPage = Math.max(1, Math.ceil(filteredNotifications.value.length / pageSize.value));
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage;
  }
});

function formatTime(raw) {
  if (!raw) return '-';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

async function loadNotifications() {
  loadError.value = '';
  loading.value = true;
  try {
    const { data } = await request.get('/api/notifications/admin/all');
    notifications.value = Array.isArray(data) ? data : [];
  } catch (error) {
    notifications.value = [];
    loadError.value = error?.response?.data?.error || error?.response?.data?.message || error?.message || '加载通知失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

function createNotification() {
  router.push('/notifications/edit');
}

function editNotification(row) {
  router.push(`/notifications/edit/${row.id}`);
}

function previewNotification(row) {
  router.push(`/notifications/preview/${row.id}`);
}

async function deleteNotification(row) {
  if (deletingId.value) return;
  deletingId.value = row.id;
  try {
    await request.delete(`/api/notifications/admin/${row.id}`);
    ElMessage.success('删除成功');
    await loadNotifications();
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || error?.response?.data?.message || error?.message || '删除失败');
  } finally {
    deletingId.value = null;
  }
}

onMounted(loadNotifications);
</script>

<style scoped>
.notifications-page {
  padding: 8px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.page-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #6b7280;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filters {
  display: grid;
  grid-template-columns: minmax(0, 320px) 180px;
  gap: 10px;
}

.stats-row {
  display: flex;
  gap: 8px;
}

.filter-input,
.filter-select {
  width: 100%;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
}

.muted {
  color: #9ca3af;
  font-size: 12px;
}

@media (max-width: 960px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .filters {
    grid-template-columns: 1fr;
  }

  .pagination-wrap {
    justify-content: flex-start;
  }
}
</style>
