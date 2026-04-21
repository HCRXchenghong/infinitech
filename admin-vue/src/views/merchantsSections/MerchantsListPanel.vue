<template>
  <div class="merchants-panel">
    <div class="merchants-panel-header">
      <div class="merchants-panel-title">商户管理</div>
      <div class="merchants-panel-actions">
        <el-input
          :model-value="searchKeyword"
          class="merchants-search"
          placeholder="搜索商户名称/负责人/手机号"
          size="small"
          clearable
          @update:model-value="updateSearchKeyword"
          @keyup.enter="handleSearch"
        />
        <el-button size="small" @click="handleSearch">搜索</el-button>
        <el-button size="small" :loading="loading" @click="loadMerchants">刷新</el-button>
        <el-button type="primary" size="small" @click="openCreateDialog">新增商户</el-button>
        <el-button type="success" size="small" @click="openInviteDialog">链接邀请</el-button>
      </div>
    </div>

    <PageStateAlert :message="loadError" />

    <el-table :data="merchants" stripe size="small" v-loading="loading">
      <el-table-column label="商户ID" width="150" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="merchant-id-text">{{ row.id }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="商户名称" min-width="180" />
      <el-table-column prop="owner_name" label="负责人" min-width="140" />
      <el-table-column prop="phone" label="手机号" width="150" />
      <el-table-column label="店铺数量" width="100" align="center">
        <template #default="{ row }">
          <span class="merchant-shop-count">{{ row.shopCount }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" text size="small" @click="goDetail(row)">详情</el-button>
          <el-button type="primary" link size="small" @click="resetPassword(row)">重置密码</el-button>
          <el-button type="danger" link size="small" @click="deleteMerchant(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
          :description="loadError ? '加载失败，暂无可显示数据' : '暂无商户数据'"
          :image-size="90"
        />
      </template>
    </el-table>

    <div class="merchants-pagination">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[10, 20, 30, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue';

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  loadError: {
    type: String,
    default: '',
  },
  merchants: {
    type: Array,
    default: () => [],
  },
  searchKeyword: {
    type: String,
    default: '',
  },
  updateSearchKeyword: {
    type: Function,
    required: true,
  },
  handleSearch: {
    type: Function,
    required: true,
  },
  loadMerchants: {
    type: Function,
    required: true,
  },
  openCreateDialog: {
    type: Function,
    required: true,
  },
  openInviteDialog: {
    type: Function,
    required: true,
  },
  goDetail: {
    type: Function,
    required: true,
  },
  resetPassword: {
    type: Function,
    required: true,
  },
  deleteMerchant: {
    type: Function,
    required: true,
  },
  currentPage: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 10,
  },
  total: {
    type: Number,
    default: 0,
  },
  handlePageChange: {
    type: Function,
    required: true,
  },
  handleSizeChange: {
    type: Function,
    required: true,
  },
});
</script>
