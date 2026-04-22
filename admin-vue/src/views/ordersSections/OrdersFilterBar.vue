<template>
  <ResponsiveActions :is-mobile="isMobile">
    <template #desktop>
      <el-input
        :model-value="searchKeyword"
        placeholder="搜索订单号/客户/骑手"
        size="small"
        style="width: 200px; margin-right: 8px"
        clearable
        @update:model-value="updateSearchKeyword"
        @keyup.enter="handleSearch"
      />
      <el-select
        :model-value="statusFilter"
        size="small"
        style="width: 120px; margin-right: 8px"
        clearable
        placeholder="状态筛选"
        @update:model-value="updateStatusFilter"
      >
        <el-option
          v-for="option in STATUS_OPTIONS"
          :key="option.value || 'all-status'"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-select
        :model-value="bizTypeFilter"
        size="small"
        style="width: 120px; margin-right: 8px"
        clearable
        placeholder="业务筛选"
        @update:model-value="updateBizTypeFilter"
      >
        <el-option
          v-for="option in BIZ_TYPE_OPTIONS"
          :key="option.value || 'all-biz'"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-button size="small" @click="handleSearch">搜索</el-button>
      <el-button size="small" :loading="loading" @click="handleRefresh">刷新</el-button>
      <el-button type="danger" size="small" :loading="clearing" @click="handleClearAllOrders">
        清空订单
      </el-button>
    </template>

    <template #mobile>
      <div class="orders-mobile-search-row">
        <el-input
          :model-value="searchKeyword"
          placeholder="搜索订单号/客户/骑手"
          size="small"
          clearable
          @update:model-value="updateSearchKeyword"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button size="small" type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      </div>
      <div class="orders-mobile-filter-row">
        <el-select
          :model-value="statusFilter"
          size="small"
          clearable
          placeholder="状态筛选"
          @update:model-value="updateStatusFilter"
        >
          <el-option
            v-for="option in STATUS_OPTIONS"
            :key="option.value || 'mobile-all-status'"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select
          :model-value="bizTypeFilter"
          size="small"
          clearable
          placeholder="业务筛选"
          @update:model-value="updateBizTypeFilter"
        >
          <el-option
            v-for="option in BIZ_TYPE_OPTIONS"
            :key="option.value || 'mobile-all-biz'"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-button size="small" :icon="Refresh" :loading="loading" @click="handleRefresh">刷新</el-button>
        <el-dropdown trigger="click" @command="handleMobileAction">
          <el-button size="small" :icon="More">更多</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="clear" divided>
                <el-icon><Delete /></el-icon>
                <span>清空订单</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </template>
  </ResponsiveActions>
</template>

<script setup>
import { Delete, More, Refresh, Search } from '@element-plus/icons-vue';
import ResponsiveActions from '@/components/ResponsiveActions.vue';

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待确认', value: 'pending' },
  { label: '待上门', value: 'accepted' },
  { label: '配送中', value: 'delivering' },
  { label: '待付款', value: 'priced' },
  { label: '待核销', value: 'paid_unused' },
  { label: '已核销', value: 'redeemed' },
  { label: '退款中', value: 'refunding' },
  { label: '已退款', value: 'refunded' },
  { label: '已过期', value: 'expired' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
];

const BIZ_TYPE_OPTIONS = [
  { label: '全部业务', value: '' },
  { label: '外卖', value: 'takeout' },
  { label: '团购', value: 'groupbuy' },
];

const props = defineProps({
  bizTypeFilter: {
    type: String,
    default: '',
  },
  clearing: {
    type: Boolean,
    default: false,
  },
  handleClearAllOrders: {
    type: Function,
    required: true,
  },
  handleSearch: {
    type: Function,
    required: true,
  },
  isMobile: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadOrders: {
    type: Function,
    required: true,
  },
  searchKeyword: {
    type: String,
    default: '',
  },
  statusFilter: {
    type: String,
    default: '',
  },
  updateBizTypeFilter: {
    type: Function,
    required: true,
  },
  updateSearchKeyword: {
    type: Function,
    required: true,
  },
  updateStatusFilter: {
    type: Function,
    required: true,
  },
});

function handleRefresh() {
  void props.loadOrders(true);
}

function handleMobileAction(command) {
  if (command === 'clear') {
    void props.handleClearAllOrders();
  }
}
</script>
