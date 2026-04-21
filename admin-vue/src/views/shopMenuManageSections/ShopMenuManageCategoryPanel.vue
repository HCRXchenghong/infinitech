<template>
  <div class="category-panel">
    <div class="panel-header">
      <span>分类管理</span>
      <el-button type="primary" size="small" @click="openCategoryDialog()">新增分类</el-button>
    </div>
    <div class="category-list">
      <div
        v-for="category in categories"
        :key="category.id"
        class="category-item"
        :class="{ active: selectedCategoryId === category.id }"
        @click="selectCategory(category.id)"
      >
        <div class="cat-info">
          <span class="cat-name">{{ category.name }}</span>
          <el-tag size="small" :type="category.isActive ? 'success' : 'info'">
            {{ category.isActive ? '启用' : '禁用' }}
          </el-tag>
        </div>
        <div class="cat-actions">
          <el-button type="primary" text size="small" @click.stop="openCategoryDialog(category)">编辑</el-button>
          <el-button type="danger" text size="small" @click.stop="deleteCategory(category)">删除</el-button>
        </div>
      </div>
      <div v-if="categories.length === 0" class="empty-tip">暂无分类，请先添加分类</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  categories: {
    type: Array,
    default: () => [],
  },
  selectedCategoryId: {
    type: [Number, String],
    default: null,
  },
  selectCategory: {
    type: Function,
    required: true,
  },
  openCategoryDialog: {
    type: Function,
    required: true,
  },
  deleteCategory: {
    type: Function,
    required: true,
  },
});
</script>
