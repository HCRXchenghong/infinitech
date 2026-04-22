<template>
  <div class="login-shell">
    <LoginIntroSplash
      v-if="isMobile && !showLogin"
      :logo-url="logoUrl"
      :enter-login="enterLogin"
    />

    <template v-else>
      <LoginHeroPanel v-if="!isMobile" :logo-url="logoUrl" />
      <LoginAccessCard
        :is-mobile="isMobile"
        :is-qr-mode="isQrMode"
        :toggle-mode="toggleMode"
        :credential-mode="credentialMode"
        :switch-credential-mode="switchCredentialMode"
        :form="form"
        :can-send-code="canSendCode"
        :sending-code="sendingCode"
        :loading="loading"
        :countdown="countdown"
        :send-code="sendCode"
        :handle-login="handleLogin"
        :qr-image="qrImage"
        :qr-status="qrStatus"
        :qr-loading="qrLoading"
        :qr-overlay-text="qrOverlayText"
        :refresh-qr-code="refreshQrCode"
      />
    </template>
    <LoginBootstrapDialog
      :bootstrap-dialog-visible="bootstrapDialogVisible"
      :bootstrap-form="bootstrapForm"
      :bootstrap-submitting="bootstrapSubmitting"
      :handle-complete-bootstrap="handleCompleteBootstrap"
      :handle-bootstrap-logout="handleBootstrapLogout"
    />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'
import LoginAccessCard from './loginSections/LoginAccessCard.vue'
import LoginBootstrapDialog from './loginSections/LoginBootstrapDialog.vue'
import LoginHeroPanel from './loginSections/LoginHeroPanel.vue'
import LoginIntroSplash from './loginSections/LoginIntroSplash.vue'
import request from '@/utils/request'
import { useLoginPage } from './loginPageHelpers'

const logoUrl = new URL('/logo.png', import.meta.url).href
const router = useRouter()

const {
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
} = useLoginPage({
  router,
  request,
  ElMessage,
  QRCode,
})
</script>

<style scoped lang="css" src="./Login.css"></style>
