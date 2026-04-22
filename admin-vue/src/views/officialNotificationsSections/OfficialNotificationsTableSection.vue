<template>
  <el-card
    class="official-notifications-filter-card"
    body-class="official-notifications-filter-card-body"
  >
    <div class="official-notifications-filters">
      <el-input
        :model-value="keyword"
        clearable
        placeholder="搜索标题/来源"
        class="official-notifications-filter-input"
        @update:model-value="setKeyword"
      />
      <el-select
        :model-value="statusFilter"
        class="official-notifications-filter-select"
        @update:model-value="setStatusFilter"
      >
        <el-option label="全部状态" value="all" />
        <el-option label="已发布" value="published" />
        <el-option label="草稿" value="draft" />
      </el-select>
    </div>

    <div class="official-notifications-stats-row">
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
            class="official-notifications-cover"
            fit="cover"
            :preview-src-list="[row.cover]"
            preview-teleported
          />
          <span v-else class="official-notifications-muted">无</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getAdminNotificationStatusTagType(row.is_published)">
            {{ formatAdminNotificationStatus(row.is_published) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="source" label="来源" width="120" />
      <el-table-column label="更新时间" width="180">
        <template #default="{ row }">
          {{ formatAdminNotificationTime(row.updated_at || row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" :disabled="deletingId === row.id" @click="previewNotification(row)">预览</el-button>
          <el-button size="small" type="primary" :disabled="deletingId === row.id" @click="editNotification(row)">编辑</el-button>
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

    <div class="official-notifications-pagination-wrap">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        background
        layout="total, sizes, prev, pager, next"
        :total="filteredNotifications.length"
        :page-sizes="[10, 20, 50]"
        @current-change="setCurrentPage"
        @size-change="setPageSize"
      />
    </div>
  </el-card>
</template>

<script setup>
import {
  formatAdminNotificationStatus,
  formatAdminNotificationTime,
  getAdminNotificationStatusTagType,
} from '@infinitech/admin-core';

defineProps({
  currentPage: {
    type: Number,
    default: 1,
  },
  deleteNotification: {
    type: Function,
    required: true,
  },
  deletingId: {
    type: [Number, String],
    default: null,
  },
  draftCount: {
    type: Number,
    default: 0,
  },
  editNotification: {
    type: Function,
    required: true,
  },
  filteredNotifications: {
    type: Array,
    default: () => [],
  },
  keyword: {
    type: String,
    default: '',
  },
  loadError: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  normalizedNotifications: {
    type: Array,
    default: () => [],
  },
  pageSize: {
    type: Number,
    default: 10,
  },
  pagedNotifications: {
    type: Array,
    default: () => [],
  },
  previewNotification: {
    type: Function,
    required: true,
  },
  publishedCount: {
    type: Number,
    default: 0,
  },
  setCurrentPage: {
    type: Function,
    required: true,
  },
  setKeyword: {
    type: Function,
    required: true,
  },
  setPageSize: {
    type: Function,
    required: true,
  },
  setStatusFilter: {
    type: Function,
    required: true,
  },
  statusFilter: {
    type: String,
    default: 'all',
  },
});
</script>
