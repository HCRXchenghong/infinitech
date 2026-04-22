import { onMounted, onUnmounted, ref, watch } from 'vue';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import {
  buildAdminOrderDetail,
  canAdminOrderQuickDispatch,
  extractAdminOrderPage,
  formatAdminOrderTime,
  getAdminOrderStatusTagType,
  getAdminOrderStatusText,
  getAdminOrderTypeIcon,
  getAdminOrderTypeText,
} from '@infinitech/admin-core';
import { useResponsiveListPage } from '@/composables/useResponsiveListPage';

const CACHE_KEY_PREFIX = 'admin_orders_cache_';
const CACHE_DURATION_MS = 30_000;
const MAX_CACHE_ENTRIES = 50;
const REFRESH_INTERVAL_MS = 5_000;

function resolveOrdersStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function getOrdersCacheStorageKey(cacheKey) {
  return `${CACHE_KEY_PREFIX}${cacheKey}`;
}

function listOrderCacheKeys(storage) {
  if (!storage) {
    return [];
  }

  const keys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && key.startsWith(CACHE_KEY_PREFIX)) {
      keys.push(key);
    }
  }
  return keys;
}

function removeOrderCacheEntry(storage, storageKey) {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(storageKey);
  } catch {
    // ignore storage cleanup failures
  }
}

function readOrdersCacheEntry(storage, cacheKey) {
  if (!storage) {
    return null;
  }

  const storageKey = getOrdersCacheStorageKey(cacheKey);
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const timestamp = Number(parsed?.timestamp || 0);
    if (!timestamp || Date.now() - timestamp >= CACHE_DURATION_MS) {
      removeOrderCacheEntry(storage, storageKey);
      return null;
    }

    const data = parsed?.data;
    if (!data || !Array.isArray(data.orders)) {
      removeOrderCacheEntry(storage, storageKey);
      return null;
    }

    return {
      orders: data.orders,
      total: Number(data.total || 0),
    };
  } catch {
    removeOrderCacheEntry(storage, storageKey);
    return null;
  }
}

function writeOrdersCacheEntry(storage, cacheKey, orders, total) {
  if (!storage) {
    return;
  }

  const storageKey = getOrdersCacheStorageKey(cacheKey);
  try {
    storage.setItem(
      storageKey,
      JSON.stringify({
        data: {
          orders,
          total,
        },
        timestamp: Date.now(),
      }),
    );

    const cacheEntries = listOrderCacheKeys(storage)
      .map((key) => {
        try {
          const raw = storage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : null;
          return {
            key,
            timestamp: Number(parsed?.timestamp || 0),
          };
        } catch {
          removeOrderCacheEntry(storage, key);
          return null;
        }
      })
      .filter((entry) => entry && entry.timestamp > 0)
      .sort((left, right) => left.timestamp - right.timestamp);

    while (cacheEntries.length > MAX_CACHE_ENTRIES) {
      const oldestEntry = cacheEntries.shift();
      removeOrderCacheEntry(storage, oldestEntry.key);
    }
  } catch {
    removeOrderCacheEntry(storage, storageKey);
  }
}

function clearOrdersCache(storage) {
  for (const key of listOrderCacheKeys(storage)) {
    removeOrderCacheEntry(storage, key);
  }
}

export function useOrdersPage({ request, ElMessage, ElMessageBox }) {
  const loading = ref(false);
  const loadError = ref('');
  const orders = ref([]);
  const currentPage = ref(1);
  const total = ref(0);
  const searchKeyword = ref('');
  const statusFilter = ref('');
  const bizTypeFilter = ref('');
  const detailVisible = ref(false);
  const detail = ref({});
  const clearing = ref(false);
  const dispatchingOrderId = ref(null);
  const ordersStorage = resolveOrdersStorage();
  let refreshInterval = null;

  async function loadOrders(forceRefresh = false) {
    const cacheKey = buildOrdersCacheKey();
    const cached = forceRefresh ? null : readOrdersCacheEntry(ordersStorage, cacheKey);
    loadError.value = '';

    if (cached) {
      applyCachedOrderPage(cached);
      loading.value = false;
    }

    if (forceRefresh || !cached) {
      loading.value = true;
    }

    try {
      const params = {
        page: currentPage.value,
        limit: pageSize.value,
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
      const page = extractAdminOrderPage(data);
      orders.value = Array.isArray(page.items) ? page.items : [];
      total.value = Number(page.total || 0);
      writeOrdersCacheEntry(ordersStorage, cacheKey, [...orders.value], total.value);
    } catch (error) {
      loadError.value = extractErrorMessage(error, '加载订单失败，请稍后重试');
      if (!cached) {
        orders.value = [];
        total.value = 0;
      }
    } finally {
      loading.value = false;
    }
  }

  const { isMobile, pageSize } = useResponsiveListPage({
    onModeChange: () => {
      currentPage.value = 1;
      void loadOrders();
    },
  });

  onMounted(async () => {
    const cached = readOrdersCacheEntry(ordersStorage, buildOrdersCacheKey());
    if (cached) {
      applyCachedOrderPage(cached);
      loading.value = false;
    }

    await loadOrders(true);
    refreshInterval = setInterval(() => {
      void loadOrders(false);
    }, REFRESH_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  });

  watch([statusFilter, bizTypeFilter], () => {
    currentPage.value = 1;
    void loadOrders();
  });

  function buildOrdersCacheKey() {
    return [
      currentPage.value,
      pageSize.value,
      statusFilter.value || 'all',
      bizTypeFilter.value || 'all',
      searchKeyword.value || '',
    ].join('-');
  }

  function applyCachedOrderPage(cached) {
    orders.value = Array.isArray(cached?.orders) ? cached.orders : [];
    total.value = Number(cached?.total || 0);
  }

  function setSearchKeyword(value) {
    searchKeyword.value = String(value ?? '');
  }

  function setStatusFilter(value) {
    statusFilter.value = String(value ?? '');
  }

  function setBizTypeFilter(value) {
    bizTypeFilter.value = String(value ?? '');
  }

  function handleSearch() {
    currentPage.value = 1;
    void loadOrders();
  }

  function handlePageChange(page) {
    currentPage.value = Number(page || 1);
    const cached = readOrdersCacheEntry(ordersStorage, buildOrdersCacheKey());
    if (cached) {
      applyCachedOrderPage(cached);
    }
    void loadOrders();
  }

  function handleSizeChange(size) {
    pageSize.value = Number(size || pageSize.value);
    currentPage.value = 1;
    void loadOrders();
  }

  function setDetailVisible(value) {
    detailVisible.value = Boolean(value);
    if (!detailVisible.value) {
      detail.value = {};
    }
  }

  function openDetail(order) {
    detail.value = buildAdminOrderDetail(order);
    detailVisible.value = true;
  }

  async function handleClearAllOrders() {
    try {
      await ElMessageBox.confirm('确定要清空所有订单吗？此操作不可恢复！', '确认清空', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      });
    } catch {
      return;
    }

    clearing.value = true;
    try {
      const { data } = await request.post('/api/orders/delete-all');
      const payload = extractEnvelopeData(data) || data || {};
      if (payload.success === false) {
        throw new Error(String(payload.message || '').trim() || '清空订单失败');
      }

      ElMessage.success(`成功清空 ${Number(payload.deleted || 0)} 条订单`);
      clearOrdersCache(ordersStorage);
      currentPage.value = 1;
      setDetailVisible(false);
      await loadOrders(true);
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '清空订单失败'));
    } finally {
      clearing.value = false;
    }
  }

  async function handleQuickDispatch(order) {
    if (!order?.id) {
      return;
    }

    try {
      await ElMessageBox.confirm(
        `确认对订单 #${order.daily_order_id || order.id} 执行一键派单？`,
        '一键派单',
        {
          confirmButtonText: '确认派单',
          cancelButtonText: '取消',
          type: 'warning',
        },
      );
    } catch {
      return;
    }

    dispatchingOrderId.value = order.id;
    try {
      const { data } = await request.post(`/api/orders/${order.id}/dispatch`);
      const payload = extractEnvelopeData(data) || data || {};
      const rider = payload.rider || {};
      const riderName = rider.name || rider.phone || '骑手';
      ElMessage.success(`派单成功，已分配给 ${riderName}`);

      clearOrdersCache(ordersStorage);
      await loadOrders(true);

      if (detailVisible.value && String(detail.value?.id || '') === String(order.id)) {
        detail.value = buildAdminOrderDetail({
          ...detail.value,
          ...(payload.order || {}),
        });
      }
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '一键派单失败'));
    } finally {
      dispatchingOrderId.value = null;
    }
  }

  return {
    bizTypeFilter,
    canQuickDispatch: canAdminOrderQuickDispatch,
    clearing,
    currentPage,
    detail,
    detailVisible,
    dispatchingOrderId,
    formatTime: formatAdminOrderTime,
    getOrderTypeIcon: getAdminOrderTypeIcon,
    getOrderTypeText: getAdminOrderTypeText,
    getStatusTagType: getAdminOrderStatusTagType,
    getStatusText: getAdminOrderStatusText,
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
  };
}
