import { onMounted, onUnmounted, reactive, ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { merchantLogin, requestSMSCode, deleteShop, verifySMSCodeCheck, merchantSetNewPassword } from '@/shared-ui/api'
import {
  clearMerchantContext,
  ensureMerchantShops,
  getCurrentShopId,
  setCurrentShopId,
} from '@/shared-ui/merchantContext'
import {
  getCachedMerchantPortalRuntimeSettings,
  loadMerchantPortalRuntimeSettings,
} from '@/shared-ui/portal-runtime'
import { getAppVersionLabel } from '@/shared-ui/app-version'
import {
  persistMerchantAuthSession,
  readMerchantAuthIdentity,
  readMerchantAuthSession,
} from '@/shared-ui/auth-session.js'
import { persistRoleAuthSessionFromAuthResult } from '../../packages/client-sdk/src/role-auth-response.js'

export function useMerchantLoginPage() {
  const loginType = ref<'code' | 'password'>('password')
  const phone = ref('')
  const code = ref('')
  const password = ref('')
  const submitting = ref(false)
  const sendingCode = ref(false)
  const codeCooldown = ref(0)
  const portalRuntime = reactive(getCachedMerchantPortalRuntimeSettings())

  let timer: any = null

  function startCooldown() {
    codeCooldown.value = 60
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      codeCooldown.value -= 1
      if (codeCooldown.value <= 0) {
        clearInterval(timer)
        timer = null
      }
    }, 1000)
  }

  function validatePhone() {
    const normalizedPhone = String(phone.value || '').trim()
    if (!/^1\d{10}$/.test(normalizedPhone)) {
      uni.showToast({ title: '请输入正确手机号', icon: 'none' })
      return ''
    }
    return normalizedPhone
  }

  function formatLoginError(error: any) {
    const raw = String(error?.error || error?.message || '').toLowerCase()
    if (!raw) return '登录失败'
    if (raw.includes('merchant not found') || raw.includes('商户不存在')) {
      return '该手机号不是商户账号，请使用商户账号登录'
    }
    if (raw.includes('invalid password') || raw.includes('密码错误')) {
      return '登录密码错误，请重试'
    }
    if (raw.includes('invalid code') || raw.includes('验证码')) {
      return '验证码错误或已过期'
    }
    if (raw.includes('unauthorized') || raw.includes('401')) {
      return '账号或密码错误'
    }
    return error?.error || error?.message || '登录失败'
  }

  async function handleSendCode() {
    if (sendingCode.value || codeCooldown.value > 0) return
    const normalizedPhone = validatePhone()
    if (!normalizedPhone) return

    sendingCode.value = true
    try {
      const response: any = await requestSMSCode(normalizedPhone, 'merchant_login')
      if (response?.success === false) {
        throw new Error(response?.error || response?.message || '验证码发送失败')
      }
      uni.showToast({ title: response?.message || '验证码已发送', icon: 'success' })
      startCooldown()
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '验证码发送失败', icon: 'none' })
    } finally {
      sendingCode.value = false
    }
  }

  async function handleSubmit() {
    if (submitting.value) return
    const normalizedPhone = validatePhone()
    if (!normalizedPhone) return

    const payload: { phone: string; code?: string; password?: string } = {
      phone: normalizedPhone,
    }
    if (loginType.value === 'code') {
      const normalizedCode = String(code.value || '').trim()
      if (!normalizedCode) {
        uni.showToast({ title: '请输入验证码', icon: 'none' })
        return
      }
      payload.code = normalizedCode
    } else {
      const normalizedPassword = String(password.value || '').trim()
      if (!normalizedPassword) {
        uni.showToast({ title: '请输入密码', icon: 'none' })
        return
      }
      payload.password = normalizedPassword
    }

    submitting.value = true
    try {
      const response: any = await merchantLogin(payload)
      if (!response?.success || !response?.token) {
        throw new Error(response?.error || '登录失败')
      }

      persistRoleAuthSessionFromAuthResult({
        uniApp: uni,
        persistRoleAuthSession: persistMerchantAuthSession,
        response,
        profileFallback: { phone: normalizedPhone },
      })
      clearMerchantContext()

      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        uni.switchTab({ url: '/pages/index/index' })
      }, 300)
    } catch (error: any) {
      uni.showToast({ title: formatLoginError(error), icon: 'none' })
    } finally {
      submitting.value = false
    }
  }

  function goResetPassword() {
    uni.navigateTo({ url: '/pages/reset-password/index' })
  }

  onMounted(() => {
    void loadMerchantPortalRuntimeSettings().then((runtime) => {
      Object.assign(portalRuntime, runtime)
    })
  })

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  })

  return {
    loginType,
    phone,
    code,
    password,
    submitting,
    sendingCode,
    codeCooldown,
    portalRuntime,
    handleSendCode,
    handleSubmit,
    goResetPassword,
  }
}

export function useMerchantResetPasswordPage() {
  const phone = ref('')
  const code = ref('')
  const sendingCode = ref(false)
  const submitting = ref(false)
  const codeCooldown = ref(0)

  let timer: any = null

  function validatePhone() {
    const normalizedPhone = String(phone.value || '').trim()
    if (!/^1\d{10}$/.test(normalizedPhone)) {
      uni.showToast({ title: '请输入正确手机号', icon: 'none' })
      return ''
    }
    return normalizedPhone
  }

  function startCooldown() {
    codeCooldown.value = 60
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      codeCooldown.value -= 1
      if (codeCooldown.value <= 0) {
        clearInterval(timer)
        timer = null
      }
    }, 1000)
  }

  async function handleSendCode() {
    if (sendingCode.value || codeCooldown.value > 0) return
    const normalizedPhone = validatePhone()
    if (!normalizedPhone) return

    sendingCode.value = true
    try {
      const response: any = await requestSMSCode(normalizedPhone, 'merchant_reset')
      if (response?.success === false) {
        throw new Error(response?.error || response?.message || '验证码发送失败')
      }
      uni.showToast({ title: response?.message || '验证码已发送', icon: 'success' })
      startCooldown()
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '验证码发送失败', icon: 'none' })
    } finally {
      sendingCode.value = false
    }
  }

  async function handleNext() {
    if (submitting.value) return
    const normalizedPhone = validatePhone()
    if (!normalizedPhone) return

    const normalizedCode = String(code.value || '').trim()
    if (!normalizedCode) {
      uni.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }

    submitting.value = true
    try {
      const response: any = await verifySMSCodeCheck({
        phone: normalizedPhone,
        code: normalizedCode,
        scene: 'merchant_reset',
      })
      if (response?.success === false) {
        throw new Error(response?.error || response?.message || '验证码校验失败')
      }

      uni.setStorageSync('reset_password_data', { phone: normalizedPhone, code: normalizedCode })
      uni.redirectTo({
        url: `/pages/set-password/index?phone=${encodeURIComponent(normalizedPhone)}&code=${encodeURIComponent(normalizedCode)}`,
      })
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '验证码错误', icon: 'none' })
    } finally {
      submitting.value = false
    }
  }

  function goLogin() {
    uni.redirectTo({ url: '/pages/login/index' })
  }

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  })

  return {
    phone,
    code,
    sendingCode,
    submitting,
    codeCooldown,
    handleSendCode,
    handleNext,
    goLogin,
  }
}

export function useMerchantSetPasswordPage() {
  const phone = ref('')
  const code = ref('')
  const password = ref('')
  const confirmPassword = ref('')
  const submitting = ref(false)

  onMounted(() => {
    const pages = getCurrentPages()
    const currentPage: any = pages[pages.length - 1] || {}
    const options = currentPage?.options || {}

    if (options?.phone) phone.value = decodeURIComponent(options.phone)
    if (options?.code) code.value = decodeURIComponent(options.code)

    if (!phone.value || !code.value) {
      const cache = uni.getStorageSync('reset_password_data')
      if (cache) {
        phone.value = cache.phone || ''
        code.value = cache.code || ''
      }
    }

    if (!phone.value || !code.value) {
      uni.showToast({ title: '验证信息已失效，请重新获取验证码', icon: 'none' })
      setTimeout(() => {
        uni.redirectTo({ url: '/pages/reset-password/index' })
      }, 500)
    }
  })

  async function handleSubmit() {
    if (submitting.value) return

    const normalizedPassword = String(password.value || '').trim()
    const normalizedConfirmPassword = String(confirmPassword.value || '').trim()

    if (!normalizedPassword || normalizedPassword.length < 6) {
      uni.showToast({ title: '密码至少 6 位', icon: 'none' })
      return
    }
    if (normalizedPassword !== normalizedConfirmPassword) {
      uni.showToast({ title: '两次输入密码不一致', icon: 'none' })
      return
    }

    submitting.value = true
    try {
      const response: any = await merchantSetNewPassword({
        phone: phone.value,
        code: code.value,
        password: normalizedPassword,
      })
      if (response?.success === false) {
        throw new Error(response?.error || response?.message || '密码重置失败')
      }

      uni.removeStorageSync('reset_password_data')
      uni.showToast({ title: '密码重置成功', icon: 'success' })
      setTimeout(() => {
        uni.redirectTo({ url: '/pages/login/index' })
      }, 500)
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '密码重置失败', icon: 'none' })
    } finally {
      submitting.value = false
    }
  }

  function goLogin() {
    uni.redirectTo({ url: '/pages/login/index' })
  }

  return {
    password,
    confirmPassword,
    submitting,
    handleSubmit,
    goLogin,
  }
}

export function useMerchantAppSettingsPage() {
  const storageKey = 'merchantAppSettings'
  const settings = reactive({
    notification: true,
    sound: true,
    vibrate: true,
  })
  const portalRuntime = reactive(getCachedMerchantPortalRuntimeSettings())
  const appVersionLabel = ref(getAppVersionLabel())
  const cacheSize = ref('0 MB')

  const merchantAuth = readMerchantAuthIdentity({ uniApp: uni })
  const phone = String(merchantAuth.merchantPhone || '')

  const phoneMasked = computed(() => {
    if (/^1\d{10}$/.test(phone)) {
      return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
    }
    return phone || '未绑定'
  })

  function back() {
    uni.navigateBack()
  }

  function loadSettings() {
    const saved: any = uni.getStorageSync(storageKey) || {}
    settings.notification = saved.notification !== false
    settings.sound = saved.sound !== false
    settings.vibrate = saved.vibrate !== false
  }

  function saveSettings() {
    uni.setStorageSync(storageKey, {
      notification: settings.notification,
      sound: settings.sound,
      vibrate: settings.vibrate,
    })
  }

  function toggleSwitch(key: 'notification' | 'sound' | 'vibrate', event: any) {
    settings[key] = !!event?.detail?.value
    saveSettings()
  }

  function showPrivacy() {
    uni.showModal({
      title: '隐私政策',
      content: portalRuntime.privacyPolicy,
      showCancel: false,
    })
  }

  function showAgreement() {
    uni.showModal({
      title: '用户协议',
      content: portalRuntime.serviceAgreement,
      showCancel: false,
    })
  }

  function calcCacheSize() {
    try {
      const info = uni.getStorageInfoSync()
      const sizeKB = Number(info.currentSize || 0)
      if (sizeKB < 1024) {
        cacheSize.value = `${sizeKB.toFixed(0)} KB`
        return
      }
      cacheSize.value = `${(sizeKB / 1024).toFixed(1)} MB`
    } catch (_error) {
      cacheSize.value = '0 MB'
    }
  }

  function clearCache() {
    uni.showModal({
      title: '清除缓存',
      content: '清除后会重新拉取页面缓存数据，是否继续？',
      success: (res: any) => {
        if (!res?.confirm) return

        const session = readMerchantAuthSession({ uniApp: uni })

        uni.clearStorageSync()

        if (session.token) {
          persistMerchantAuthSession({
            uniApp: uni,
            token: session.token,
            refreshToken: session.refreshToken || null,
            tokenExpiresAt: session.tokenExpiresAt || null,
            profile: session.profile,
          })
        }

        saveSettings()
        calcCacheSize()
        uni.showToast({ title: '缓存已清除', icon: 'success' })
      },
    })
  }

  function goResetPassword() {
    uni.navigateTo({ url: '/pages/reset-password/index' })
  }

  loadSettings()
  calcCacheSize()

  onMounted(() => {
    void loadMerchantPortalRuntimeSettings().then((runtime) => {
      Object.assign(portalRuntime, runtime)
    })
  })

  return {
    settings,
    appVersionLabel,
    cacheSize,
    phoneMasked,
    back,
    toggleSwitch,
    showPrivacy,
    showAgreement,
    clearCache,
    goResetPassword,
  }
}

export function useMerchantShopSwitchPage() {
  const shops = ref<any[]>([])
  const currentShopId = ref('')

  async function loadData() {
    const context = await ensureMerchantShops(true)
    shops.value = context.shops || []
    currentShopId.value = String(getCurrentShopId() || context.currentShop?.id || '')
  }

  function goCreateShop() {
    uni.navigateTo({ url: '/pages/store/create' })
  }

  function switchShop(shop: any) {
    if (!shop?.id) return
    setCurrentShopId(shop.id)
    currentShopId.value = String(shop.id)
    uni.showToast({ title: '已切换店铺', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 200)
  }

  function confirmDelete(shop: any) {
    uni.showModal({
      title: '删除店铺',
      content: `确认删除“${shop?.name || `店铺${shop?.id}`}”？`,
      confirmColor: '#d03030',
      success: async (res: any) => {
        if (!res?.confirm) return
        try {
          await deleteShop(shop.id)
          uni.showToast({ title: '删除成功', icon: 'success' })

          const deletingCurrent = String(shop.id) === currentShopId.value
          clearMerchantContext()
          await loadData()

          if (deletingCurrent && shops.value.length > 0) {
            setCurrentShopId(shops.value[0].id)
            currentShopId.value = String(shops.value[0].id)
          }
        } catch (error: any) {
          uni.showToast({
            title: error?.error || error?.message || '删除失败（需近2天无订单）',
            icon: 'none',
          })
        }
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
    shops,
    currentShopId,
    goCreateShop,
    switchShop,
    confirmDelete,
  }
}
