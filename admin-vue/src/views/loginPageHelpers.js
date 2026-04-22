import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  hasStoredAdminAuthToken,
  persistAdminAuthSessionFromAuthResult,
  readStoredAdminLoginType,
  writeStoredAdminLoginType,
} from '@infinitech/admin-core'
import { extractEnvelopeData, extractErrorMessage, extractSMSResult } from '@infinitech/contracts'
import { buildRuntimeUrl, clearAdminSessionStorage, getStoredAdminUser } from '@/utils/runtime'
import {
  createDefaultLoginForm,
  getQrFlowErrorMessage,
  isMissingQrRoute,
  isValidPhone,
} from './loginHelpers'

function createBootstrapFormState() {
  return {
    phone: '',
    name: '',
    newPassword: '',
    confirmPassword: '',
  }
}

export function useLoginPage({ router, request, ElMessage, QRCode }) {
  const loading = ref(false)
  const sendingCode = ref(false)
  const countdown = ref(0)
  const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  const showLogin = ref(false)
  const credentialMode = ref(readStoredAdminLoginType())
  const isQrMode = ref(false)
  const qrLoading = ref(false)
  const qrImage = ref('')
  const qrTicket = ref('')
  const qrStatus = ref('idle')
  const qrRemainSeconds = ref(0)
  const form = ref(createDefaultLoginForm())
  const bootstrapDialogVisible = ref(false)
  const bootstrapSubmitting = ref(false)
  const bootstrapForm = ref(createBootstrapFormState())

  let qrPollTimer = null
  let qrCountdownTimer = null
  let qrRefreshTimer = null
  let qrLastStatusToast = ''

  const QR_REFRESH_INTERVAL_MS = 10000

  const canSendCode = computed(() => countdown.value === 0)

  const qrOverlayText = computed(() => {
    if (qrLoading.value) return '二维码生成中...'
    if (qrStatus.value === 'expired') return '二维码已过期'
    if (qrStatus.value === 'rejected') return '登录授权已取消'
    if (qrStatus.value === 'error') return '二维码加载失败'
    return ''
  })

  function clearQrTimers() {
    if (qrPollTimer) {
      clearInterval(qrPollTimer)
      qrPollTimer = null
    }
    if (qrCountdownTimer) {
      clearInterval(qrCountdownTimer)
      qrCountdownTimer = null
    }
    if (qrRefreshTimer) {
      clearTimeout(qrRefreshTimer)
      qrRefreshTimer = null
    }
  }

  function scheduleQrRefresh(delay = QR_REFRESH_INTERVAL_MS) {
    if (qrRefreshTimer) {
      clearTimeout(qrRefreshTimer)
    }
    qrRefreshTimer = setTimeout(() => {
      void refreshQrCode(false)
    }, delay)
  }

  function updateQrStatus(status) {
    if (!status || qrStatus.value === status) {
      return
    }

    qrStatus.value = status

    if (status === 'scanned' && qrLastStatusToast !== 'scanned') {
      ElMessage.info('已扫码，请在管理端 App 内确认登录')
    }
    if (status === 'rejected' && qrLastStatusToast !== 'rejected') {
      ElMessage.warning('本次扫码登录已取消，系统将自动刷新二维码')
    }
    qrLastStatusToast = status
  }

  function startQrCountdown() {
    if (qrCountdownTimer) {
      clearInterval(qrCountdownTimer)
    }

    qrCountdownTimer = setInterval(() => {
      if (qrRemainSeconds.value > 0) {
        qrRemainSeconds.value -= 1
      }
      if (qrRemainSeconds.value <= 0 && (qrStatus.value === 'pending' || qrStatus.value === 'scanned')) {
        updateQrStatus('expired')
        scheduleQrRefresh()
      }
    }, 1000)
  }

  function startQrPolling() {
    if (qrPollTimer) {
      clearInterval(qrPollTimer)
    }

    qrPollTimer = setInterval(() => {
      void pollQrStatus()
    }, 2000)
    void pollQrStatus()
  }

  function clearLoginSession() {
    clearAdminSessionStorage()
  }

  function openBootstrapDialog(user = {}) {
    bootstrapForm.value.phone = String(user?.phone || '')
    bootstrapForm.value.name = String(user?.name || '')
    bootstrapForm.value.newPassword = ''
    bootstrapForm.value.confirmPassword = ''
    bootstrapDialogVisible.value = true
    showLogin.value = true
    isQrMode.value = false
  }

  function handleBootstrapLogout() {
    bootstrapDialogVisible.value = false
    clearLoginSession()
    form.value = createDefaultLoginForm()
    showLogin.value = true
    isQrMode.value = false
    router.replace('/login')
  }

  function saveLoginSession(payload, mode = credentialMode.value) {
    let persistedResult
    try {
      persistedResult = persistAdminAuthSessionFromAuthResult(payload, {
        loginType: mode,
        source: mode,
        rememberMe: form.value.rememberMe,
        clearSessionStorage: clearLoginSession,
        localStorage,
        sessionStorage,
      })
    } catch (error) {
      ElMessage.error(error?.message || '登录失败，管理员会话无效')
      return null
    }

    if (!persistedResult.persisted) {
      ElMessage.error(persistedResult.message || '登录失败，缺少有效凭证')
      return null
    }

    if (persistedResult.mustChangeBootstrap) {
      openBootstrapDialog(persistedResult.user)
      ElMessage.warning('请先完成首次管理员设置，再进入后台。')
      return persistedResult
    }

    bootstrapDialogVisible.value = false
    router.push('/dashboard')
    return persistedResult
  }

  async function handleCompleteBootstrap() {
    if (bootstrapSubmitting.value) {
      return
    }
    if (!bootstrapForm.value.name) {
      ElMessage.error('请输入真实管理员名称')
      return
    }
    if (!isValidPhone(bootstrapForm.value.phone)) {
      ElMessage.error('请输入正确的管理员手机号')
      return
    }
    if (!bootstrapForm.value.newPassword) {
      ElMessage.error('请输入新的管理员密码')
      return
    }
    if (bootstrapForm.value.newPassword.length < 6) {
      ElMessage.error('新密码至少需要 6 位')
      return
    }
    if (bootstrapForm.value.newPassword !== bootstrapForm.value.confirmPassword) {
      ElMessage.error('两次输入的新密码不一致')
      return
    }

    bootstrapSubmitting.value = true
    try {
      const { data } = await request.post('/api/admins/complete-bootstrap', {
        phone: bootstrapForm.value.phone,
        name: bootstrapForm.value.name,
        newPassword: bootstrapForm.value.newPassword,
        confirmPassword: bootstrapForm.value.confirmPassword,
      })
      const persistedResult = saveLoginSession(data, 'password')
      if (!persistedResult) {
        throw new Error('首次管理员初始化失败，未返回新的登录凭证')
      }

      ElMessage.success('首次管理员初始化已完成，请使用新的管理员信息进入后台。')
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '首次管理员初始化失败'))
    } finally {
      bootstrapSubmitting.value = false
    }
  }

  async function refreshQrCode(showMessage = false) {
    if (!isQrMode.value) {
      return
    }

    clearQrTimers()
    qrLoading.value = true
    qrImage.value = ''
    qrTicket.value = ''
    qrRemainSeconds.value = 0
    qrStatus.value = 'pending'
    qrLastStatusToast = ''

    try {
      const { data } = await request.post('/api/qr-login/session', {
        webOrigin: typeof window !== 'undefined' && window.location ? window.location.origin : '',
        siteOrigin: buildRuntimeUrl('site', '').replace(/\/$/, ''),
      })
      const payload = extractEnvelopeData(data)
      if (!payload?.ticket || !payload?.qrText) {
        throw new Error('二维码初始化失败')
      }

      qrTicket.value = String(payload.ticket)
      qrRemainSeconds.value = Math.max(0, Number(payload.remainSeconds || payload.expiresIn || 120))
      qrImage.value = await QRCode.toDataURL(payload.qrText, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#111827',
          light: '#ffffff',
        },
      })

      startQrCountdown()
      startQrPolling()
      scheduleQrRefresh(QR_REFRESH_INTERVAL_MS)
      if (showMessage) {
        ElMessage.success('二维码已刷新')
      }
    } catch (error) {
      updateQrStatus('error')
      if (!isMissingQrRoute(error)) {
        scheduleQrRefresh(QR_REFRESH_INTERVAL_MS)
      }
      const message = getQrFlowErrorMessage(error)
      if (showMessage || isMissingQrRoute(error)) {
        ElMessage.error(message)
      }
    } finally {
      qrLoading.value = false
    }
  }

  async function pollQrStatus() {
    if (!isQrMode.value || !qrTicket.value || qrLoading.value) {
      return
    }

    try {
      const { data } = await request.get(`/api/qr-login/session/${encodeURIComponent(qrTicket.value)}`)
      const payload = extractEnvelopeData(data) || {}
      if (typeof payload.remainSeconds === 'number') {
        qrRemainSeconds.value = Math.max(0, payload.remainSeconds)
      }

      const status = String(payload.status || 'pending')
      if (status === 'confirmed') {
        clearQrTimers()
        if (!saveLoginSession(payload, 'qr')) {
          updateQrStatus('error')
          scheduleQrRefresh(QR_REFRESH_INTERVAL_MS)
        }
        return
      }

      updateQrStatus(status)
      if (status === 'expired' || status === 'rejected' || status === 'consumed') {
        scheduleQrRefresh(QR_REFRESH_INTERVAL_MS)
      }
    } catch (error) {
      const statusCode = Number(error?.response?.status || 0)
      if (isMissingQrRoute(error)) {
        clearQrTimers()
        updateQrStatus('error')
        ElMessage.error(getQrFlowErrorMessage(error))
        return
      }

      if (statusCode === 404 || statusCode === 409) {
        updateQrStatus('expired')
        scheduleQrRefresh(QR_REFRESH_INTERVAL_MS)
        return
      }

      updateQrStatus('error')
      scheduleQrRefresh(QR_REFRESH_INTERVAL_MS)
    }
  }

  function switchCredentialMode(mode) {
    credentialMode.value = mode === 'code' ? 'code' : 'password'
    writeStoredAdminLoginType(credentialMode.value, {
      localStorage,
      sessionStorage,
    })
  }

  function toggleMode() {
    isQrMode.value = !isQrMode.value
    if (isQrMode.value) {
      void refreshQrCode(false)
      return
    }

    clearQrTimers()
    qrStatus.value = 'idle'
    qrImage.value = ''
    qrTicket.value = ''
    qrRemainSeconds.value = 0
  }

  function enterLogin() {
    showLogin.value = true
  }

  async function sendCode() {
    if (loading.value) {
      return
    }
    if (!form.value.phone) {
      ElMessage.error('请输入管理员手机号')
      return
    }
    if (!isValidPhone(form.value.phone)) {
      ElMessage.error('请输入正确的管理员手机号')
      return
    }
    if (countdown.value > 0) {
      return
    }

    sendingCode.value = true
    try {
      const { data } = await request.post('/api/send-admin-sms-code', {
        phone: form.value.phone,
        scene: 'login',
      })
      const result = extractSMSResult(data)

      if (result.needCaptcha) {
        ElMessage.warning(result.message || '请先完成图形验证码校验')
        return
      }

      if (result.success) {
        countdown.value = 60
        const timer = setInterval(() => {
          countdown.value -= 1
          if (countdown.value <= 0) {
            clearInterval(timer)
            countdown.value = 0
          }
        }, 1000)

        if (data.warning) {
          ElMessage.warning(data.warning)
        } else {
          ElMessage.success(result.message || '验证码已发送，请注意查收')
        }
        return
      }

      ElMessage.error(result.error || result.message || '发送验证码失败')
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '网络异常，请稍后重试'))
    } finally {
      sendingCode.value = false
    }
  }

  async function handleLogin() {
    if (loading.value) {
      return
    }
    if (!form.value.phone) {
      ElMessage.error('请输入管理员手机号')
      return
    }
    if (!isValidPhone(form.value.phone)) {
      ElMessage.error('手机号格式不正确')
      return
    }

    const loginData = {
      phone: form.value.phone,
      loginType: credentialMode.value,
    }

    if (credentialMode.value === 'password') {
      if (!form.value.password) {
        ElMessage.error('请输入登录密码')
        return
      }
      loginData.password = form.value.password
    } else {
      if (!form.value.code) {
        ElMessage.error('请输入短信验证码')
        return
      }
      loginData.code = form.value.code
    }

    loading.value = true
    try {
      const { data } = await request.post('/api/login', loginData)
      saveLoginSession(data, credentialMode.value)
    } catch (error) {
      const errorMessage = extractErrorMessage(error, '登录失败')
      const statusCode = Number(error?.response?.status || 0)
      if ((statusCode === 400 || statusCode === 403) && errorMessage.includes('验证码登录')) {
        ElMessage.warning({
          message: `${errorMessage}，已自动切换到验证码登录`,
          duration: 5000,
          showClose: true,
        })
        switchCredentialMode('code')
        form.value.password = ''
        if (form.value.phone && isValidPhone(form.value.phone)) {
          setTimeout(() => {
            void sendCode()
          }, 500)
        }
        return
      }

      ElMessage.error(errorMessage)
    } finally {
      loading.value = false
    }
  }

  function handleResize() {
    if (typeof window === 'undefined') {
      return
    }

    isMobile.value = window.innerWidth <= 768
    if (!isMobile.value) {
      showLogin.value = false
    }
    if (isMobile.value && !showLogin.value) {
      clearQrTimers()
      isQrMode.value = false
    }
  }

  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
    }
    const storedUser = getStoredAdminUser()
    const hasToken = hasStoredAdminAuthToken({
      localStorage,
      sessionStorage,
    })
    if (hasToken && storedUser?.mustChangeBootstrap) {
      openBootstrapDialog(storedUser)
    }
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize)
    }
    clearQrTimers()
  })

  return {
    bootstrapDialogVisible,
    bootstrapForm,
    bootstrapSubmitting,
    canSendCode,
    countdown,
    credentialMode,
    enterLogin,
    form,
    handleBootstrapLogout,
    handleCompleteBootstrap,
    handleLogin,
    isMobile,
    isQrMode,
    loading,
    qrImage,
    qrLoading,
    qrOverlayText,
    qrStatus,
    refreshQrCode,
    sendCode,
    sendingCode,
    showLogin,
    switchCredentialMode,
    toggleMode,
  }
}
