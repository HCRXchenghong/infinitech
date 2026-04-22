<template>
  <div class="orders-page">
    <OrdersListPanel
      :biz-type-filter="bizTypeFilter"
      :can-quick-dispatch="canQuickDispatch"
      :clearing="clearing"
      :current-page="currentPage"
      :dispatching-order-id="dispatchingOrderId"
      :format-time="formatTime"
      :get-order-type-icon="getOrderTypeIcon"
      :get-order-type-text="getOrderTypeText"
      :get-status-tag-type="getStatusTagType"
      :get-status-text="getStatusText"
      :handle-clear-all-orders="handleClearAllOrders"
      :handle-page-change="handlePageChange"
      :handle-quick-dispatch="handleQuickDispatch"
      :handle-search="handleSearch"
      :handle-size-change="handleSizeChange"
      :is-mobile="isMobile"
      :load-error="loadError"
      :loading="loading"
      :load-orders="loadOrders"
      :open-detail="openDetail"
      :orders="orders"
      :page-size="pageSize"
      :search-keyword="searchKeyword"
      :status-filter="statusFilter"
      :total="total"
      :update-biz-type-filter="setBizTypeFilter"
      :update-search-keyword="setSearchKeyword"
      :update-status-filter="setStatusFilter"
    />

    <OrdersDetailDialog
      :can-quick-dispatch="canQuickDispatch"
      :detail="detail"
      :dispatching-order-id="dispatchingOrderId"
      :get-order-type-text="getOrderTypeText"
      :get-status-tag-type="getStatusTagType"
      :get-status-text="getStatusText"
      :handle-quick-dispatch="handleQuickDispatch"
      :visible="detailVisible"
      @update:visible="handleDetailVisibleUpdate"
    />
  </div>
</template>
<script setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import './Orders.css';
import OrdersDetailDialog from './ordersSections/OrdersDetailDialog.vue';
import OrdersListPanel from './ordersSections/OrdersListPanel.vue';
import { useOrdersPage } from './ordersPageHelpers';

const {
  bizTypeFilter,
  canQuickDispatch,
  clearing,
  currentPage,
  detail,
  detailVisible,
  dispatchingOrderId,
  formatTime,
  getOrderTypeIcon,
  getOrderTypeText,
  getStatusTagType,
  getStatusText,
  handleClearAllOrders,
  handlePageChange,
  handleQuickDispatch,
  handleSearch,
  handleSizeChange,
  isMobile,
  loadError,
  loading,
  loadOrders,
  openDetail,
  orders,
  pageSize,
  searchKeyword,
  setBizTypeFilter,
  setDetailVisible,
  setSearchKeyword,
  setStatusFilter,
  statusFilter,
  total,
} = useOrdersPage({
  request,
  ElMessage,
  ElMessageBox,
});

function handleDetailVisibleUpdate(value) {
  setDetailVisible(value);
}
</script>
