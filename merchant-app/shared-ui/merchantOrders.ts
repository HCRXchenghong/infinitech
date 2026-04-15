import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
  createMerchantGroupbuyRefund,
  deliverOrder,
  dispatchOrder,
  fetchAfterSales,
  fetchOrderDetail,
  fetchOrders,
  pickupOrder,
  redeemGroupbuyVoucherByScan,
  updateShop,
} from '@/shared-ui/api'
import {
  openMerchantRiderChat,
  openMerchantSupportChat,
  openMerchantUserChat,
} from '@/shared-ui/chatNavigation'
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from '@/shared-ui/support-runtime'
import {
  ensureMerchantShops,
  formatMoney,
  getCurrentShopId,
  orderStatusText,
  parseOrderItems,
  paymentStatusText,
  setCurrentShopId,
} from '@/shared-ui/merchantContext'

function toText(value: any) {
  return String(value ?? '').trim()
}

function getCurrentMerchantShop(shops: any[], currentShopId: string, fallbackShop: any) {
  return shops.find((shop: any) => String(shop?.id) === String(currentShopId)) || fallbackShop || null
}

async function loadMerchantCurrentShop(force = false) {
  const context = await ensureMerchantShops(force)
  const shops = Array.isArray(context?.shops) ? context.shops : []
  const currentShop = getCurrentMerchantShop(shops, getCurrentShopId(), context?.currentShop)
  return { shops, currentShop }
}

export function resolveMerchantOrderBizType(order: any): string {
  const raw = toText(order?.bizType || order?.biz_type).toLowerCase()
  return raw === 'groupbuy' ? 'groupbuy' : 'takeout'
}

export function isMerchantGroupbuyOrder(order: any) {
  return resolveMerchantOrderBizType(order) === 'groupbuy'
}

export function formatMerchantOrderTime(value: any, withYear = false) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return withYear ? `${year}-${month}-${day} ${hour}:${minute}` : `${month}-${day} ${hour}:${minute}`
}

function sortMerchantOrders(orders: any[]) {
  return orders.slice().sort((left: any, right: any) => {
    const leftTime = new Date(left?.created_at || 0).getTime()
    const rightTime = new Date(right?.created_at || 0).getTime()
    return rightTime - leftTime
  })
}

export function useMerchantDashboardPage() {
  const refreshing = ref(false)
  const switching = ref(false)
  const supportTitle = ref(getCachedSupportRuntimeSettings().title)

  const shops = ref<any[]>([])
  const currentShop = ref<any>(null)
  const orders = ref<any[]>([])
  const afterSalesList = ref<any[]>([])
  const noShopPrompted = ref(false)

  const currentShopView = computed(() => {
    const shop = currentShop.value || {}
    return {
      name: toText(shop?.name) || '未绑定店铺',
      businessCategory: toText(shop?.businessCategory) || '请选择店铺',
      phone: toText(shop?.phone) || '--',
      isActive: !!shop?.isActive,
    }
  })

  const stats = computed(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todayRevenue = orders.value
      .filter((order: any) => order?.status === 'completed' && new Date(order?.created_at || 0).getTime() >= todayStart.getTime())
      .reduce((sum: number, order: any) => sum + Number(order?.total_price || 0), 0)

    return {
      todayRevenue: formatMoney(todayRevenue),
      todoCount: orders.value.filter((order: any) => ['pending', 'accepted'].includes(String(order?.status || ''))).length,
      deliveringCount: orders.value.filter((order: any) => order?.status === 'delivering').length,
      afterSalesCount: afterSalesList.value.filter((item: any) => item?.status === 'pending').length,
    }
  })

  const recentOrders = computed(() => sortMerchantOrders(orders.value).slice(0, 5))

  function maybePromptCreateShop() {
    if (noShopPrompted.value) return
    noShopPrompted.value = true
    uni.showModal({
      title: '还没有店铺',
      content: '检测到当前账号还没有店铺，是否现在去创建？',
      confirmText: '去创建',
      cancelText: '稍后',
      success: (res: any) => {
        if (!res?.confirm) return
        uni.navigateTo({ url: '/pages/store/create' })
      },
    })
  }

  async function loadData(force = false) {
    const context = await loadMerchantCurrentShop(force)
    shops.value = context.shops
    currentShop.value = context.currentShop

    if (!currentShop.value) {
      orders.value = []
      afterSalesList.value = []
      maybePromptCreateShop()
      return
    }

    noShopPrompted.value = false
    const shopId = toText(currentShop.value?.id)
    const [orderRes, afterSalesRes]: any[] = await Promise.all([
      fetchOrders({ page: 1, limit: 200 }),
      fetchAfterSales({ page: 1, limit: 200 }),
    ])

    const sourceOrders = Array.isArray(orderRes?.orders) ? orderRes.orders : []
    orders.value = sourceOrders.filter((item: any) => toText(item?.shop_id || item?.shopId) === shopId)

    const sourceAfterSales = Array.isArray(afterSalesRes?.list) ? afterSalesRes.list : []
    afterSalesList.value = sourceAfterSales.filter((item: any) => toText(item?.shopId || item?.shop_id) === shopId)
  }

  async function loadSupportRuntimeConfig() {
    const supportRuntime = await loadSupportRuntimeSettings()
    supportTitle.value = supportRuntime.title
  }

  async function refreshAll() {
    refreshing.value = true
    try {
      await loadData(true)
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '刷新失败', icon: 'none' })
    } finally {
      refreshing.value = false
    }
  }

  async function toggleBusiness(event: any) {
    if (!currentShop.value || switching.value) return
    const target = !!event?.detail?.value
    switching.value = true
    try {
      await updateShop(currentShop.value.id, { isActive: target })
      currentShop.value = {
        ...currentShop.value,
        isActive: target,
      }
      uni.showToast({ title: target ? '已恢复营业' : '已暂停营业', icon: 'success' })
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '更新失败', icon: 'none' })
    } finally {
      switching.value = false
    }
  }

  function selectShop() {
    if (!shops.value.length) {
      maybePromptCreateShop()
      return
    }
    uni.showActionSheet({
      itemList: shops.value.map((shop: any) => `${shop?.name || '未命名店铺'}`),
      success: async (res: any) => {
        const selected = shops.value[res?.tapIndex]
        if (!selected) return
        setCurrentShopId(selected.id)
        await refreshAll()
      },
    })
  }

  function goTab(url: string) {
    uni.switchTab({ url })
  }

  function openSupportChat() {
    openMerchantSupportChat()
  }

  function openOrder(id: string | number) {
    uni.navigateTo({ url: `/pages/orders/detail?id=${id}` })
  }

  function formatTime(value: any) {
    return formatMerchantOrderTime(value, false)
  }

  onShow(async () => {
    try {
      void loadSupportRuntimeConfig()
      await loadData()
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '加载失败', icon: 'none' })
    }
  })

  return {
    refreshing,
    switching,
    supportTitle,
    currentShop,
    currentShopView,
    stats,
    recentOrders,
    orderStatusText,
    formatTime,
    refreshAll,
    toggleBusiness,
    selectShop,
    goTab,
    openSupportChat,
    openOrder,
  }
}

export function useMerchantOrdersPage() {
  const refreshing = ref(false)
  const keyword = ref('')
  const activeTab = ref('all')
  const currentShop = ref<any>(null)
  const orders = ref<any[]>([])
  const actionLoading = ref<Record<string, boolean>>({})

  const currentShopName = computed(() => toText(currentShop.value?.name) || '未绑定店铺')

  function countByStatus(status: string) {
    return orders.value.filter((item: any) => item?.status === status).length
  }

  const tabs = computed(() => [
    { key: 'all', label: '全部' },
    { key: 'pending', label: `待接单(${countByStatus('pending')})` },
    { key: 'accepted', label: `待出餐(${countByStatus('accepted')})` },
    { key: 'delivering', label: `配送中(${countByStatus('delivering')})` },
    { key: 'paid_unused', label: `待核销(${countByStatus('paid_unused')})` },
    { key: 'redeemed', label: `已核销(${countByStatus('redeemed')})` },
    { key: 'completed', label: `已完成(${countByStatus('completed')})` },
  ])

  const filteredOrders = computed(() => {
    return orders.value.filter((item: any) => activeTab.value === 'all' || item?.status === activeTab.value)
  })

  async function loadOrders(force = false) {
    const context = await loadMerchantCurrentShop(force)
    currentShop.value = context.currentShop

    if (!currentShop.value) {
      orders.value = []
      return
    }

    const shopId = toText(currentShop.value?.id)
    const searchText = toText(keyword.value)
    const response: any = await fetchOrders({ page: 1, limit: 500, search: searchText })
    const sourceOrders = Array.isArray(response?.orders) ? response.orders : []

    orders.value = sortMerchantOrders(
      sourceOrders
        .map((item: any) => ({
          ...item,
          bizType: resolveMerchantOrderBizType(item),
        }))
        .filter((item: any) => toText(item?.shop_id || item?.shopId) === shopId)
    )
  }

  async function handleSearch() {
    try {
      await loadOrders()
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '搜索失败', icon: 'none' })
    }
  }

  async function refreshAll() {
    refreshing.value = true
    try {
      await loadOrders(true)
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '刷新失败', icon: 'none' })
    } finally {
      refreshing.value = false
    }
  }

  function setOrderActionLoading(orderId: string, value: boolean) {
    actionLoading.value = {
      ...actionLoading.value,
      [orderId]: value,
    }
  }

  async function runOrderAction(order: any, action: (orderId: string) => Promise<any>, successText: string, errorText: string) {
    const orderId = toText(order?.id)
    if (!orderId) return
    setOrderActionLoading(orderId, true)
    try {
      await action(orderId)
      uni.showToast({ title: successText, icon: 'success' })
      await loadOrders()
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || errorText, icon: 'none' })
    } finally {
      setOrderActionLoading(orderId, false)
    }
  }

  async function handleDispatch(order: any) {
    await runOrderAction(order, dispatchOrder, '接单成功，已派骑手', '接单失败')
  }

  async function handlePickup(order: any) {
    await runOrderAction(order, pickupOrder, '已通知骑手取货', '操作失败')
  }

  async function handleDeliver(order: any) {
    await runOrderAction(order, deliverOrder, '订单已完成', '操作失败')
  }

  function promptRedeemCode(): Promise<string> {
    return new Promise((resolve) => {
      uni.showModal({
        title: '手动输入券码',
        content: '无法扫码时可粘贴二维码内容',
        editable: true,
        placeholderText: '请输入券码或二维码内容',
        success: (modalRes: any) => {
          if (!modalRes?.confirm) {
            resolve('')
            return
          }
          resolve(toText(modalRes?.content))
        },
        fail: () => resolve(''),
      })
    })
  }

  function scanRedeemCode(): Promise<string> {
    return new Promise((resolve) => {
      if (typeof uni.scanCode !== 'function') {
        resolve('')
        return
      }
      uni.scanCode({
        onlyFromCamera: true,
        scanType: ['qrCode', 'barCode'],
        success: (res: any) => resolve(toText(res?.result)),
        fail: () => resolve(''),
      })
    })
  }

  async function handleRedeem(order: any) {
    const orderId = toText(order?.id)
    if (!orderId) return
    setOrderActionLoading(orderId, true)
    try {
      let qrCode = await scanRedeemCode()
      if (!qrCode) {
        qrCode = await promptRedeemCode()
      }
      if (!qrCode) {
        uni.showToast({ title: '未获取到扫码内容', icon: 'none' })
        return
      }
      await redeemGroupbuyVoucherByScan({
        qrCode,
        deviceId: 'merchant-app',
        idempotencyKey: `redeem_${orderId}_${Date.now()}`,
      })
      uni.showToast({ title: '核销成功', icon: 'success' })
      await loadOrders()
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '核销失败', icon: 'none' })
    } finally {
      setOrderActionLoading(orderId, false)
    }
  }

  async function handleGroupbuyRefund(order: any) {
    const orderId = toText(order?.id)
    if (!orderId) return

    uni.showModal({
      title: '发起已核销退款',
      content: '将创建一条商户退款申请，确认继续？',
      success: async (modalRes: any) => {
        if (!modalRes?.confirm) return
        setOrderActionLoading(orderId, true)
        try {
          await createMerchantGroupbuyRefund({
            orderId,
            refundReason: '商户发起已核销退款',
            requestedRefundAmount: Math.round(Number(order?.total_price || order?.totalPrice || 0) * 100),
          })
          uni.showToast({ title: '退款申请已提交', icon: 'success' })
          await loadOrders()
        } catch (error: any) {
          uni.showToast({ title: error?.error || error?.message || '提交失败', icon: 'none' })
        } finally {
          setOrderActionLoading(orderId, false)
        }
      },
    })
  }

  function formatTime(value: any) {
    return formatMerchantOrderTime(value, false)
  }

  function openDetail(id: string | number) {
    uni.navigateTo({ url: `/pages/orders/detail?id=${id}` })
  }

  function openUserChat(order: any) {
    openMerchantUserChat(order)
  }

  function openRiderChat(order: any) {
    openMerchantRiderChat(order)
  }

  function handleRealtimeOrdersRefresh() {
    void loadOrders().catch(() => {})
  }

  onShow(async () => {
    try {
      await loadOrders()
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '加载失败', icon: 'none' })
    }
  })

  onMounted(() => {
    uni.$off('realtime:refresh:orders', handleRealtimeOrdersRefresh)
    uni.$off('realtime:refresh:after_sales', handleRealtimeOrdersRefresh)
    uni.$on('realtime:refresh:orders', handleRealtimeOrdersRefresh)
    uni.$on('realtime:refresh:after_sales', handleRealtimeOrdersRefresh)
  })

  onUnmounted(() => {
    uni.$off('realtime:refresh:orders', handleRealtimeOrdersRefresh)
    uni.$off('realtime:refresh:after_sales', handleRealtimeOrdersRefresh)
  })

  return {
    refreshing,
    keyword,
    activeTab,
    currentShopName,
    tabs,
    filteredOrders,
    actionLoading,
    orderStatusText,
    paymentStatusText,
    isGroupbuy: isMerchantGroupbuyOrder,
    formatTime,
    handleSearch,
    refreshAll,
    handleDispatch,
    handlePickup,
    handleDeliver,
    handleRedeem,
    handleGroupbuyRefund,
    openDetail,
    openUserChat,
    openRiderChat,
  }
}

export function useMerchantOrderDetailPage() {
  const detail = ref<any>(null)
  const supportTitle = ref(getCachedSupportRuntimeSettings().title)

  const detailView = computed(() => {
    const current = detail.value || {}
    return {
      orderNo: current?.daily_order_id || current?.id || '--',
      status: toText(current?.status),
      bizType: resolveMerchantOrderBizType(current),
      paymentStatus: toText(current?.payment_status),
      createdAt: current?.created_at || '',
      customerName: current?.customer_name || '未填写',
      customerPhone: current?.customer_phone || '未填写',
      address: current?.address || '未填写',
      totalPrice: Number(current?.total_price || 0).toFixed(2),
      riderName: current?.rider_name || '-',
      riderPhone: current?.rider_phone || '-',
      acceptedAt: current?.accepted_at || '',
      completedAt: current?.completed_at || '',
      updatedAt: current?.updated_at || '',
    }
  })

  const items = computed(() => parseOrderItems(detail.value?.food_request || detail.value?.items || ''))
  const isTakeoutOrder = computed(() => detailView.value.bizType !== 'groupbuy')

  function openUserChat() {
    openMerchantUserChat(detail.value)
  }

  function openRiderChat() {
    openMerchantRiderChat(detail.value)
  }

  function openSupportChat() {
    openMerchantSupportChat(detail.value?.shop_id || detail.value?.shopId)
  }

  function formatDate(value: any) {
    return formatMerchantOrderTime(value, true)
  }

  onLoad(async (options: any) => {
    void loadSupportRuntimeSettings().then((supportRuntime) => {
      supportTitle.value = supportRuntime.title
    })

    const orderId = options?.id
    if (!orderId) {
      uni.showToast({ title: '缺少订单ID', icon: 'none' })
      return
    }

    try {
      detail.value = await fetchOrderDetail(orderId)
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '加载失败', icon: 'none' })
    }
  })

  return {
    supportTitle,
    detailView,
    items,
    isTakeoutOrder,
    openUserChat,
    openRiderChat,
    openSupportChat,
    formatDate,
    orderStatusText,
    paymentStatusText,
  }
}
