import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { fetchShopDetail, updateShop } from '@/shared-ui/api'
import { fetchMerchantWalletSnapshot, formatWalletFen } from '@/shared-ui/merchantWallet'
import { unregisterCurrentPushDevice, clearPushRegistrationState } from '@/shared-ui/push-registration'
import {
  clearMerchantContext,
  ensureMerchantShops,
  getCurrentShopId,
} from '@/shared-ui/merchantContext'
import { clearRoleAuthSession } from '../../packages/client-sdk/src/role-auth-session.js'

export function useMerchantStoreHomePage() {
  const refreshing = ref(false)
  const switching = ref(false)
  const loadingWallet = ref(false)

  const shops = ref<any[]>([])
  const currentShop = ref<any>(null)

  const balance = ref(0)
  const frozenBalance = ref(0)

  function fen2yuan(value: any) {
    return formatWalletFen(value)
  }

  async function loadWallet() {
    loadingWallet.value = true
    try {
      const snapshot = await fetchMerchantWalletSnapshot()
      balance.value = Number(snapshot?.balance || 0)
      frozenBalance.value = Number(snapshot?.frozenBalance || 0)
    } catch (_error) {
      balance.value = 0
      frozenBalance.value = 0
    } finally {
      loadingWallet.value = false
    }
  }

  async function loadData(force = false) {
    const context = await ensureMerchantShops(force)
    shops.value = context.shops || []

    const currentId = getCurrentShopId()
    currentShop.value = shops.value.find((item: any) => String(item?.id) === String(currentId)) || context.currentShop || null

    if (currentShop.value?.id) {
      try {
        const detail: any = await fetchShopDetail(currentShop.value.id)
        if (detail && typeof detail === 'object') {
          currentShop.value = detail
        }
      } catch (_error) {
        // Keep cached shop info as fallback.
      }
    }

    await loadWallet()
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
    switching.value = true
    const next = !!event?.detail?.value
    try {
      await updateShop(currentShop.value.id, { isActive: next })
      currentShop.value = {
        ...currentShop.value,
        isActive: next,
      }
      uni.showToast({ title: next ? '已恢复营业' : '已暂停营业', icon: 'success' })
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '更新失败', icon: 'none' })
    } finally {
      switching.value = false
    }
  }

  function goWallet() {
    uni.navigateTo({ url: '/pages/store/wallet' })
  }

  function goEditShop() {
    if (!currentShop.value) {
      goCreateShop()
      return
    }
    uni.navigateTo({ url: '/pages/store/settings' })
  }

  function goSettings() {
    uni.navigateTo({ url: '/pages/store/app-settings' })
  }

  function goSwitchShop() {
    uni.navigateTo({ url: '/pages/store/shop-switch' })
  }

  function goCreateShop() {
    uni.navigateTo({ url: '/pages/store/create' })
  }

  function logout() {
    uni.showModal({
      title: '退出登录',
      content: '确认退出当前商户账号？',
      confirmText: '退出',
      success: async (res: any) => {
        if (!res?.confirm) return
        try {
          await unregisterCurrentPushDevice()
        } catch (_error) {
          clearPushRegistrationState()
        }
        clearRoleAuthSession({
          uniApp: uni,
          profileStorageKey: 'merchantProfile',
        })
        clearPushRegistrationState()
        clearMerchantContext()
        uni.reLaunch({ url: '/pages/login/index' })
      },
    })
  }

  onShow(async () => {
    try {
      await loadData()
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '加载失败', icon: 'none' })
    }
  })

  return {
    refreshing,
    switching,
    loadingWallet,
    currentShop,
    balance,
    frozenBalance,
    fen2yuan,
    refreshAll,
    toggleBusiness,
    goWallet,
    goEditShop,
    goSettings,
    goSwitchShop,
    goCreateShop,
    logout,
  }
}
