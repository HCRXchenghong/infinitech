<template>
  <div class="orders-panel">
    <div class="orders-panel-header">
      <div class="orders-panel-title">订单管理</div>
      <OrdersFilterBar
        :biz-type-filter="bizTypeFilter"
        :clearing="clearing"
        :handle-clear-all-orders="handleClearAllOrders"
        :handle-search="handleSearch"
        :is-mobile="isMobile"
        :loading="loading"
        :load-orders="loadOrders"
        :search-keyword="searchKeyword"
        :status-filter="statusFilter"
        :update-biz-type-filter="updateBizTypeFilter"
        :update-search-keyword="updateSearchKeyword"
        :update-status-filter="updateStatusFilter"
      />
    </div>

    <PageStateAlert :message="loadError" />

    <OrdersDesktopTable
      v-if="!isMobile"
      :can-quick-dispatch="canQuickDispatch"
      :dispatching-order-id="dispatchingOrderId"
      :format-time="formatTime"
      :get-order-type-text="getOrderTypeText"
      :get-status-tag-type="getStatusTagType"
      :get-status-text="getStatusText"
      :handle-quick-dispatch="handleQuickDispatch"
      :load-error="loadError"
      :loading="loading"
      :open-detail="openDetail"
      :orders="orders"
    />
    <OrdersMobileList
      v-else
      :can-quick-dispatch="canQuickDispatch"
      :dispatching-order-id="dispatchingOrderId"
      :format-time="formatTime"
      :get-order-type-icon="getOrderTypeIcon"
      :get-order-type-text="getOrderTypeText"
      :get-status-tag-type="getStatusTagType"
      :get-status-text="getStatusText"
      :handle-quick-dispatch="handleQuickDispatch"
      :load-error="loadError"
      :loading="loading"
      :open-detail="openDetail"
      :orders="orders"
    />

    <div class="orders-pagination-container">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="isMobile ? [5, 10, 15] : [15, 30, 50, 100]"
        :total="total"
        :layout="isMobile ? 'total, prev, pager, next' : 'total, sizes, prev, pager, next, jumper'"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue';
import OrdersDesktopTable from './OrdersDesktopTable.vue';
import OrdersFilterBar from './OrdersFilterBar.vue';
import OrdersMobileList from './OrdersMobileList.vue';

defineProps({
  bizTypeFilter: {
    type: String,
    default: '',
  },
  canQuickDispatch: {
    type: Function,
    required: true,
  },
  clearing: {
    type: Boolean,
    default: false,
  },
  currentPage: {
    type: Number,
    default: 1,
  },
  dispatchingOrderId: {
    type: [Number, String, null],
    default: null,
  },
  formatTime: {
    type: Function,
    required: true,
  },
  getOrderTypeIcon: {
    type: Function,
    required: true,
  },
  getOrderTypeText: {
    type: Function,
    required: true,
  },
  getStatusTagType: {
    type: Function,
    required: true,
  },
  getStatusText: {
    type: Function,
    required: true,
  },
  handleClearAllOrders: {
    type: Function,
    required: true,
  },
  handlePageChange: {
    type: Function,
    required: true,
  },
  handleQuickDispatch: {
    type: Function,
    required: true,
  },
  handleSearch: {
    type: Function,
    required: true,
  },
  handleSizeChange: {
    type: Function,
    required: true,
  },
  isMobile: {
    type: Boolean,
    default: false,
  },
  loadError: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadOrders: {
    type: Function,
    required: true,
  },
  openDetail: {
    type: Function,
    required: true,
  },
  orders: {
    type: Array,
    default: () => [],
  },
  pageSize: {
    type: Number,
    default: 15,
  },
  searchKeyword: {
    type: String,
    default: '',
  },
  statusFilter: {
    type: String,
    default: '',
  },
  total: {
    type: Number,
    default: 0,
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
</script>
