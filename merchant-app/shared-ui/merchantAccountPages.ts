import { onMounted, onUnmounted, reactive, ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  merchantLogin,
  requestSMSCode,
  deleteShop,
  verifySMSCodeCheck,
  merchantSetNewPassword,
} from '@/shared-ui/api'
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
import {
  createRolePasswordResetCooldownController,
  requestRolePasswordResetCode,
  resolveRolePasswordResetTicket,
  buildRolePasswordResetSetPasswordPageUrl,
  submitRolePasswordResetNextPassword,
  verifyRolePasswordResetCode,
} from '../../packages/mobile-core/src/role-password-reset-portal.js'
import {
  createRoleLoginCodeCooldownController,
  pickRoleLoginErrorMessage,
  requestRoleLoginCode,
  validateRoleLoginPhoneInput,
} from '../../packages/mobile-core/src/role-login-portal.js'
import {
  maskRoleSettingsPhone,
  mergeRoleSettings,
  normalizeRoleSettingsSwitchValue,
  readRoleSettingsCacheSizeSync,
} from '../../packages/mobile-core/src/role-settings-portal.js'

export function useMerchantLoginPage() {
  const loginType = ref<'code' | 'password'>('password')
  const phone = ref('')
  const code = ref('')
  const password = ref('')
  const submitting = ref(false)
  const sendingCode = ref(false)
  const codeCooldown = ref(0)
  const portalRuntime = reactive(getCachedMerchantPortalRuntimeSettings())
  const cooldownController = createRoleLoginCodeCooldownController({
    setValue(nextValue) {
      codeCooldown.value = nextValue
    },
  })

  function validatePhone() {
    const result = validateRoleLoginPhoneInput(phone.value)
    if (!result.phone) {
      uni.showToast({ title: result.error, icon: 'none' })
      return ''
    }
    return result.phone
  }

  function formatLoginError(error: any) {
    return pickRoleLoginErrorMessage(error, '登录失败', (rawError: any, fallback: string) => {
      const raw = String(
        rawError?.error || rawError?.message || rawError?.data?.error || rawError?.data?.message || '',
      ).toLowerCase()
      if (!raw) return ''
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
      return ''
    })
  }

  async function handleSendCode() {
    if (sendingCode.value || codeCooldown.value > 0) return

    sendingCode.value = true
    try {
      const result = await requestRoleLoginCode({
        phoneValue: phone.value,
        scene: 'merchant_login',
        requestSMSCode,
        cooldownController,
      })
      if (!result.ok) {
        uni.showToast({ title: result.message, icon: 'none' })
        return
      }

      uni.showToast({ title: result.message, icon: 'success' })
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
    cooldownController.clear()
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
  const portalRuntime = reactive(getCachedMerchantPortalRuntimeSettings())
  const cooldownController = createRolePasswordResetCooldownController({
    setValue(nextValue) {
      codeCooldown.value = nextValue
    },
  })

  async function handleSendCode() {
    if (sendingCode.value || codeCooldown.value > 0) return

    sendingCode.value = true
    try {
      const result = await requestRolePasswordResetCode({
        phoneValue: phone.value,
        scene: 'merchant_reset',
        requestSMSCode,
        cooldownController,
      })
      if (!result.ok) {
        uni.showToast({ title: result.message, icon: 'none' })
        return
      }

      uni.showToast({ title: result.message, icon: 'success' })
    } finally {
      sendingCode.value = false
    }
  }

  async function handleNext() {
    if (submitting.value) return

    submitting.value = true
    try {
      const result = await verifyRolePasswordResetCode({
        phoneValue: phone.value,
        codeValue: code.value,
        scene: 'merchant_reset',
        storage: uni,
        verifySMSCodeCheck,
        buildSetPasswordUrl(phoneValue, codeValue) {
          return buildRolePasswordResetSetPasswordPageUrl(
            '/pages/set-password/index',
            phoneValue,
            codeValue,
          )
        },
      })
      if (!result.ok) {
        uni.showToast({ title: result.message, icon: 'none' })
        return
      }

      uni.redirectTo({ url: result.redirectUrl })
    } finally {
      submitting.value = false
    }
  }

  function goLogin() {
    uni.redirectTo({ url: '/pages/login/index' })
  }

  onMounted(() => {
    void loadMerchantPortalRuntimeSettings().then((runtime) => {
      Object.assign(portalRuntime, runtime)
    })
  })

  onUnmounted(() => {
    cooldownController.clear()
  })

  return {
    phone,
    code,
    sendingCode,
    submitting,
    codeCooldown,
    portalRuntime,
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
  const portalRuntime = reactive(getCachedMerchantPortalRuntimeSettings())

  onMounted(() => {
    void loadMerchantPortalRuntimeSettings().then((runtime) => {
      Object.assign(portalRuntime, runtime)
    })

    const pages = getCurrentPages()
    const currentPage: any = pages[pages.length - 1] || {}
    const options = currentPage?.options || {}
    const resetTicket = resolveRolePasswordResetTicket(
      options,
      uni.getStorageSync('reset_password_data'),
    )
    phone.value = resetTicket.phone
    code.value = resetTicket.code

    if (!phone.value || !code.value) {
      uni.showToast({ title: '验证信息已失效，请重新获取验证码', icon: 'none' })
      setTimeout(() => {
        uni.redirectTo({ url: '/pages/reset-password/index' })
      }, 500)
    }
  })

  async function handleSubmit() {
    if (submitting.value) return

    submitting.value = true
    try {
      const result = await submitRolePasswordResetNextPassword({
        phoneValue: phone.value,
        codeValue: code.value,
        passwordValue: password.value,
        confirmPasswordValue: confirmPassword.value,
        storage: uni,
        resetPasswordUrl: '/pages/reset-password/index',
        loginUrl: '/pages/login/index',
        successMessage: '密码重置成功',
        failureMessage: '密码重置失败',
        missingTicketMessage: '验证信息已失效，请重新获取验证码',
        submitSetNewPassword: merchantSetNewPassword,
        passwordValidation: {
          mismatchPasswordMessage: '两次输入密码不一致',
        },
      })
      if (!result.ok) {
        uni.showToast({ title: result.message, icon: 'none' })
        if (result.reason === 'missing_ticket' && result.redirectUrl) {
          setTimeout(() => {
            uni.redirectTo({ url: result.redirectUrl })
          }, 500)
        }
        return
      }

      uni.showToast({ title: result.message, icon: 'success' })
      setTimeout(() => {
        uni.redirectTo({ url: result.redirectUrl || '/pages/login/index' })
      }, 500)
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
    portalRuntime,
    handleSubmit,
    goLogin,
  }
}

export function useMerchantAppSettingsPage() {
  const storageKey = 'merchantAppSettings'
  const settingsDefaults = {
    notification: true,
    sound: true,
    vibrate: true,
  }
  const settings = reactive({ ...settingsDefaults })
  const portalRuntime = reactive(getCachedMerchantPortalRuntimeSettings())
  const appVersionLabel = ref(getAppVersionLabel())
  const cacheSize = ref('0 MB')

  const merchantAuth = readMerchantAuthIdentity({ uniApp: uni })
  const phone = String(merchantAuth.merchantPhone || '')

  const phoneMasked = computed(() => maskRoleSettingsPhone(phone))

  function back() {
    uni.navigateBack()
  }

  function loadSettings() {
    Object.assign(settings, mergeRoleSettings(uni.getStorageSync(storageKey), settingsDefaults))
  }

  function saveSettings() {
    uni.setStorageSync(storageKey, {
      notification: settings.notification,
      sound: settings.sound,
      vibrate: settings.vibrate,
    })
  }

  function toggleSwitch(key: 'notification' | 'sound' | 'vibrate', event: any) {
    settings[key] = normalizeRoleSettingsSwitchValue(event, settings[key])
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
    cacheSize.value = readRoleSettingsCacheSizeSync(uni, {
      emptyLabel: '0 MB',
      mbDigits: 1,
    })
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
