<template>
  <div class="orders-mobile-list" v-loading="loading">
    <div
      v-for="order in orders"
      :key="order.id"
      class="orders-mobile-card"
      @click="openDetail(order)"
    >
      <div class="orders-mobile-card-header">
        <div class="orders-mobile-card-id">订单 #{{ order.daily_order_id }}</div>
        <el-tag :type="getStatusTagType(order.status)" size="small">
          {{ getStatusText(order.status, order) }}
        </el-tag>
      </div>

      <div class="orders-mobile-card-type">
        <span class="orders-mobile-type-icon">{{ getOrderTypeIcon(order) }}</span>
        <span class="orders-mobile-type-text">{{ getOrderTypeText(order) }}</span>
      </div>

      <div class="orders-mobile-card-content">
        <div class="orders-mobile-card-item" v-if="order.service_type === 'phone_film'">
          <span class="orders-mobile-card-item-label">📱 服务：</span>
          <span class="orders-mobile-card-item-value">{{ order.service_description || '手机贴膜服务' }}</span>
          <span v-if="order.package_name" class="orders-mobile-card-item-value">- {{ order.package_name }}</span>
          <span v-if="order.phone_model" class="orders-mobile-card-item-value">({{ order.phone_model }})</span>
        </div>
        <div class="orders-mobile-card-item" v-else-if="order.service_type === 'massage'">
          <span class="orders-mobile-card-item-label">💆 服务：</span>
          <span class="orders-mobile-card-item-value">{{ order.service_description || '推拿按摩服务' }}</span>
          <span v-if="order.package_name" class="orders-mobile-card-item-value">- {{ order.package_name }}</span>
        </div>
        <div class="orders-mobile-card-item" v-if="order.food_request">
          <span class="orders-mobile-card-item-label">🍽️ 餐食：</span>
          <span class="orders-mobile-card-item-value">{{ order.food_request }}</span>
        </div>
        <div class="orders-mobile-card-item" v-if="order.drink_request">
          <span class="orders-mobile-card-item-label">🥤 饮品：</span>
          <span class="orders-mobile-card-item-value">{{ order.drink_request }}</span>
        </div>
        <div class="orders-mobile-card-item" v-if="order.delivery_request">
          <span class="orders-mobile-card-item-label">📮 快递：</span>
          <span class="orders-mobile-card-item-value">{{ order.delivery_request }}</span>
        </div>
        <div class="orders-mobile-card-item" v-if="order.errand_request && !order.service_type">
          <span class="orders-mobile-card-item-label">🚴 跑腿：</span>
          <span class="orders-mobile-card-item-value">{{ order.errand_request }}</span>
        </div>
      </div>

      <div class="orders-mobile-card-footer">
        <div class="orders-mobile-card-info">
          <div class="orders-mobile-card-info-item">
            <span class="orders-mobile-card-info-label">客户：</span>
            <span class="orders-mobile-card-info-value">{{ order.customer_name || order.customer_phone || '-' }}</span>
          </div>
          <div class="orders-mobile-card-info-item" v-if="order.rider_name || order.rider_phone">
            <span class="orders-mobile-card-info-label">骑手：</span>
            <span class="orders-mobile-card-info-value">{{ order.rider_name || order.rider_phone }}</span>
          </div>
          <div class="orders-mobile-card-info-item">
            <span class="orders-mobile-card-info-label">宿舍：</span>
            <span class="orders-mobile-card-info-value">{{ order.dorm_number || '-' }}</span>
          </div>
        </div>
        <div class="orders-mobile-card-meta">
          <div class="orders-mobile-card-price" v-if="order.total_price || order.package_price">
            ¥{{ order.total_price || order.package_price }}
          </div>
          <div class="orders-mobile-card-time">{{ formatTime(order.created_at) }}</div>
        </div>
      </div>

      <div v-if="canQuickDispatch(order)" class="orders-mobile-card-actions">
        <el-button
          type="warning"
          size="small"
          :loading="dispatchingOrderId === order.id"
          @click.stop="handleQuickDispatch(order)"
        >
          一键派单
        </el-button>
      </div>
    </div>

    <div v-if="orders.length === 0 && !loading" class="orders-mobile-empty-state">
      <div class="orders-mobile-empty-icon">📋</div>
      <div class="orders-mobile-empty-text">
        {{ loadError ? '加载失败，请稍后重试' : '暂无订单' }}
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  canQuickDispatch: {
    type: Function,
    required: true,
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
  handleQuickDispatch: {
    type: Function,
    required: true,
  },
  loadError: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  openDetail: {
    type: Function,
    required: true,
  },
  orders: {
    type: Array,
    default: () => [],
  },
});
</script>
