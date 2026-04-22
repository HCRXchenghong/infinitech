<template>
  <div class="section-card review-card" v-loading="reviewsLoading">
    <div class="section-head">
      <span>评论管理</span>
      <el-button type="primary" size="small" @click="openCreateReviewDialog">新增评论</el-button>
    </div>

    <el-table :data="reviews" size="small" stripe>
      <el-table-column prop="id" label="ID" width="72" />
      <el-table-column label="用户" min-width="170">
        <template #default="{ row }">
          <div class="review-user-cell">
            <img v-if="row.userAvatar" :src="row.userAvatar" alt="avatar" class="review-avatar" />
            <div v-else class="review-avatar review-avatar-fallback">匿</div>
            <span>{{ row.userName || '匿名用户' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="评分" width="120">
        <template #default="{ row }">
          <span style="color: #f59e0b">★ {{ Number(row.rating || 0).toFixed(1) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="content" label="评论内容" min-width="240" show-overflow-tooltip />
      <el-table-column prop="reply" label="商家回复" min-width="220" show-overflow-tooltip />
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" text size="small" @click="openEditReviewDialog(row)">
            编辑
          </el-button>
          <el-button type="danger" text size="small" @click="handleDeleteReview(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
          :description="reviewError ? '加载失败，暂无可显示数据' : '暂无评论数据'"
          :image-size="90"
        />
      </template>
    </el-table>
  </div>
</template>

<script setup>
defineProps({
  formatDateTime: {
    type: Function,
    required: true,
  },
  handleDeleteReview: {
    type: Function,
    required: true,
  },
  openCreateReviewDialog: {
    type: Function,
    required: true,
  },
  openEditReviewDialog: {
    type: Function,
    required: true,
  },
  reviewError: {
    type: String,
    default: '',
  },
  reviews: {
    type: Array,
    default: () => [],
  },
  reviewsLoading: {
    type: Boolean,
    default: false,
  },
});
</script>
