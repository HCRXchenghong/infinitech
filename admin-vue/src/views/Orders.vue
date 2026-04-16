<template src="./Orders.template.html"></template>
<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue';
import request from '@/utils/request';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, More, Delete } from '@element-plus/icons-vue';
import { extractErrorMessage } from '@infinitech/contracts';
import PageStateAlert from '@/components/PageStateAlert.vue';
import ResponsiveActions from '@/components/ResponsiveActions.vue';
import { useResponsiveListPage } from '@/composables/useResponsiveListPage';

// 移动端检测
const loading = ref(false);
const loadError = ref('');
const orders = ref([]);
const currentPage = ref(1);
const { isMobile, pageSize } = useResponsiveListPage({
  onModeChange: () => {
    currentPage.value = 1;
    loadOrders();
  }
});
const total = ref(0);
const searchKeyword = ref('');
const statusFilter = ref('');
const bizTypeFilter = ref('');
const detailVisible = ref(false);
const detail = ref({});
const clearing = ref(false);
const dispatchingOrderId = ref(null);
let refreshInterval = null;

// 数据缓存：使用localStorage持久化缓存
const CACHE_KEY_PREFIX = 'admin_orders_cache_';
const CACHE_DURATION = 30000; // 30秒缓存有效期

const cacheKey = () => {
  return `${currentPage.value}-${pageSize.value}-${statusFilter.value || 'all'}-${bizTypeFilter.value || 'all'}-${searchKeyword.value || ''}`;
};

// 获取缓存
function getCachedOrders(key) {
  try {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      if (now - timestamp < CACHE_DURATION) {
        return data;
      }
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
    }
  } catch (error) {
    console.error('读取缓存失败:', error);
    localStorage.removeItem(CACHE_KEY_PREFIX + key);
  }
  return null;
}

// 设置缓存
function setCachedOrders(key, ordersData, totalData) {
  try {
    const cacheData = {
      data: {
        orders: ordersData,
        total: totalData
      },
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheData));
    
    // 限制缓存数量，最多保留50个缓存项
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    if (allKeys.length > 50) {
      // 删除最旧的缓存
      const sortedKeys = allKeys.map(k => ({
        key: k,
        timestamp: JSON.parse(localStorage.getItem(k)).timestamp
      })).sort((a, b) => a.timestamp - b.timestamp);
      
      for (let i = 0; i < sortedKeys.length - 50; i++) {
        localStorage.removeItem(sortedKeys[i].key);
      }
    }
  } catch (error) {
    console.error('保存缓存失败:', error);
  }
}

// 清除所有缓存
function clearAllCache() {
  const allKeys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
  allKeys.forEach(k => localStorage.removeItem(k));
}

onMounted(async () => {
  // 先尝试从缓存加载
  const key = cacheKey();
  const cached = getCachedOrders(key);
  if (cached) {
    orders.value = cached.orders;
    total.value = cached.total;
    loading.value = false;
  }

  await loadOrders(true);

  // 每5秒自动刷新订单状态（静默刷新）
  refreshInterval = setInterval(() => {
    loadOrders(false); // 不显示loading，避免闪烁
  }, 5000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

watch([statusFilter, bizTypeFilter], () => {
  currentPage.value = 1;
  // 不需要清空缓存，让缓存自然过期，切换回来时还能使用
  loadOrders();
});

async function loadOrders(forceRefresh = false) {
  const key = cacheKey();
  loadError.value = '';
  
  // 如果不是强制刷新，先尝试从缓存加载
  if (!forceRefresh) {
    const cached = getCachedOrders(key);
    if (cached) {
    orders.value = cached.orders;
    total.value = cached.total;
      // 如果有缓存，后台静默更新
      if (loading.value) {
        loading.value = false;
  }
    }
  }
  
  // 如果强制刷新或没有缓存，显示loading
  if (forceRefresh || !getCachedOrders(key)) {
  loading.value = true;
  }
  
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    };
    
    if (searchKeyword.value) {
      params.search = searchKeyword.value;
    }
    
    if (statusFilter.value) {
      params.status = statusFilter.value;
    }
    if (bizTypeFilter.value) {
      params.bizType = bizTypeFilter.value;
    }
    
    const { data } = await request.get('/api/orders', { params });
    
    if (data && data.orders) {
      orders.value = data.orders;
      total.value = data.total || 0;
      // 保存到缓存
      setCachedOrders(key, [...data.orders], data.total || 0);
    } else {
      orders.value = [];
      total.value = 0;
    }
  } catch (e) {
    console.error('加载订单失败:', e);
    loadError.value = e?.response?.data?.error || e?.message || '加载订单失败，请稍后重试';
    // 如果请求失败且没有缓存数据，才清空显示
    if (!getCachedOrders(key)) {
    orders.value = [];
    total.value = 0;
    }
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  // 不需要清空缓存，让缓存自然过期，切换回来时还能使用
  loadOrders();
}

function handlePageChange(page) {
  currentPage.value = page;
  // 先尝试从缓存加载
  const key = cacheKey();
  const cached = getCachedOrders(key);
  if (cached) {
    orders.value = cached.orders;
    total.value = cached.total;
  }
  loadOrders(); // 后台更新数据
}

function handleSizeChange(size) {
  pageSize.value = size;
  currentPage.value = 1;
  // 不需要清空缓存，让缓存自然过期
  loadOrders();
}

async function handleClearAllOrders() {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有订单吗？此操作不可恢复！',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    clearing.value = true;
    try {
      const { data } = await request.post('/api/orders/delete-all');
      if (data.success) {
        ElMessage.success(`成功清空 ${data.deleted || 0} 条订单`);
        clearAllCache(); // 清空订单后清空所有缓存
        await loadOrders(true);
      }
    } catch (e) {
      console.error('清空订单失败:', e);
      ElMessage.error(extractErrorMessage(e, '清空订单失败'));
    } finally {
      clearing.value = false;
    }
  } catch (e) {
    // 用户取消操作
  }
}

function canQuickDispatch(order) {
  if (!order || order.status !== 'pending') return false;
  if (normalizeBizType(order) === 'groupbuy') return false;
  const riderId = String(order.rider_id || '').trim();
  const riderName = String(order.rider_name || '').trim();
  const riderPhone = String(order.rider_phone || '').trim();
  return !riderId && !riderName && !riderPhone;
}

function normalizeBizType(order) {
  const value = String(order?.bizType || order?.biz_type || '').trim().toLowerCase();
  if (value === 'groupbuy') return 'groupbuy';
  return 'takeout';
}

async function handleQuickDispatch(order) {
  if (!order || !order.id) return;

  try {
    await ElMessageBox.confirm(
      `确认对订单 #${order.daily_order_id || order.id} 执行一键派单？`,
      '一键派单',
      {
        confirmButtonText: '确认派单',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
  } catch (err) {
    return;
  }

  dispatchingOrderId.value = order.id;
  try {
    const { data } = await request.post(`/api/orders/${order.id}/dispatch`);
    const riderName = data?.rider?.name || data?.rider?.phone || '骑手';
    ElMessage.success(`派单成功，已分配给 ${riderName}`);

    clearAllCache();
    await loadOrders(true);

    if (detailVisible.value && detail.value?.id === order.id && data?.order) {
      detail.value = { ...detail.value, ...data.order };
    }
  } catch (e) {
    console.error('一键派单失败:', e);
    ElMessage.error(extractErrorMessage(e, '一键派单失败'));
  } finally {
    dispatchingOrderId.value = null;
  }
}

function getStatusText(status, order) {
  if (normalizeBizType(order) === 'groupbuy') {
    const groupbuyText = {
      pending_payment: '待支付',
      paid_unused: '待核销',
      redeemed: '已核销',
      refunding: '退款中',
      refunded: '已退款',
      expired: '已过期',
      cancelled: '已取消',
    };
    return groupbuyText[status] || '团购订单';
  }

  // 服务订单（贴膜、按摩）的状态：待确认、待上门、已完成、已取消
  if (order?.service_type === 'phone_film' || order?.service_type === 'massage') {
    if (status === 'completed') return '已完成';
    if (status === 'cancelled') return '已取消';
    if (status === 'pending') return '待确认';
    // accepted/priced 都显示为"待上门"
    return '待上门';
  }
  
  // 普通订单使用原有逻辑
  const texts = {
    draft: '草稿',
    pending: '待接单',
    accepted: '进行中',
    delivering: '配送中',
    priced: '待付款',
    completed: '已完成',
    cancelled: '已取消'
  };
  return texts[status] || '未知状态';
}

function getStatusTagType(status) {
  const groupbuyTypes = {
    pending_payment: 'warning',
    paid_unused: 'primary',
    redeemed: 'success',
    refunding: 'warning',
    refunded: 'info',
    expired: 'info',
  };
  if (groupbuyTypes[status]) {
    return groupbuyTypes[status];
  }

  const types = {
    draft: 'info',
    pending: 'warning',
    accepted: 'primary',
    delivering: 'primary',
    priced: 'success',
    completed: 'success',
    cancelled: 'info'
  };
  return types[status] || '';
}

function getOrderTypeText(order) {
  if (normalizeBizType(order) === 'groupbuy') return '团购';

  if (order.service_type === 'phone_film') return '手机贴膜';
  if (order.service_type === 'massage') return '推拿按摩';
  if (order.food_request) return '餐食服务';
  if (order.drink_request) return '饮品服务';
  if (order.delivery_request) return '快递服务';
  if (order.errand_request && !order.service_type) return '跑腿服务';
  return '其他';
}

function getOrderTypeIcon(order) {
  if (normalizeBizType(order) === 'groupbuy') return '🎫';

  if (order.service_type === 'phone_film') return '📱';
  if (order.service_type === 'massage') return '💆';
  if (order.food_request) return '🍽️';
  if (order.drink_request) return '🥤';
  if (order.delivery_request) return '📮';
  if (order.errand_request && !order.service_type) return '🚴';
  return '📦';
}

function formatTime(timeStr) {
  if (!timeStr) return '-';
  const date = new Date(timeStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

function openDetail(row) {
  // 深度复制订单数据，并确保所有字段都包含
  detail.value = { ...row };
  
  // 如果errand_request是JSON字符串，尝试解析服务订单信息
  if (row.errand_request && typeof row.errand_request === 'string') {
    try {
      const serviceInfo = JSON.parse(row.errand_request);
      if (serviceInfo.service_type) {
        detail.value.service_type = serviceInfo.service_type;
        detail.value.service_description = serviceInfo.service_description;
        detail.value.package_name = serviceInfo.package_name;
        detail.value.package_price = serviceInfo.package_price;
        detail.value.phone_model = serviceInfo.phone_model;
        detail.value.preferred_time = serviceInfo.preferred_time || detail.value.preferred_time;
        detail.value.special_notes = serviceInfo.special_notes;
      }
    } catch (e) {
      // 不是JSON格式，忽略
    }
  }
  
  detailVisible.value = true;
}

function handleRowClick(row) {
  openDetail(row);
}

function handleMobileAction(command) {
  if (command === 'clear') {
    handleClearAllOrders();
  }
}
</script>

<style scoped lang="css" src="./Orders.css"></style>
