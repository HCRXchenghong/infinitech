<template>
  <div class="legacy-shell">
    <div class="legacy-blob legacy-blob-a"></div>
    <div class="legacy-blob legacy-blob-b"></div>
    <div class="legacy-blob legacy-blob-c"></div>

    <div class="legacy-frame">
      <section v-if="step === 0" class="legacy-step-0" @click="openInviteEnvelope">
        <div class="legacy-envelope-wrap">
          <el-icon class="legacy-envelope-icon"><Message /></el-icon>
          <span class="legacy-badge">待查收</span>
        </div>
        <h2>悦享e食</h2>
        <p>点击开启您的专属邀请函</p>
      </section>

      <section v-else-if="step === 1" class="legacy-card-view">
        <div class="legacy-thank-wrap">
          <el-icon class="legacy-present"><Present /></el-icon>
          <h3>感谢您对 悦享e食 一直以来的支持！</h3>
          <div class="legacy-loading"></div>
        </div>
      </section>

      <section v-else-if="step === 2" class="legacy-card-view">
        <div class="legacy-letter-head">
          <div class="legacy-letter-icon">
            <el-icon><Message /></el-icon>
          </div>
          <h3>亲爱的老用户，欢迎回家</h3>
          <p>
            全新改版，更多美食，更优体验。<br />
            诚邀您体验升级版悦享e食。
          </p>
          <div class="legacy-meta" v-if="invite?.expires_at">
            <div v-if="invite?.expires_at">有效至：{{ formatDateTime(invite.expires_at) }}</div>
          </div>
        </div>
        <button type="button" class="legacy-primary-btn" @click="step = 3">
          确认接收邀请
          <el-icon><ArrowRight /></el-icon>
        </button>
      </section>

      <section v-else-if="step === 3" class="legacy-card-view">
        <div class="legacy-form-head">
          <h3>回归登记</h3>
          <p>请完善信息完成登记</p>
        </div>

        <form class="legacy-form" @submit.prevent="handleRegister">
          <label class="legacy-field">
            <span class="legacy-field-icon"><el-icon><User /></el-icon></span>
            <input v-model.trim="formData.username" type="text" required placeholder="请输入您的用户名" />
          </label>

          <label class="legacy-field">
            <span class="legacy-field-icon"><el-icon><Phone /></el-icon></span>
            <input v-model.trim="formData.phone" type="tel" required maxlength="11" placeholder="请输入手机号" />
          </label>

          <p class="legacy-tip">请确保此号码可接收短信验证码</p>

          <label class="legacy-field">
            <span class="legacy-field-icon"><el-icon><Lock /></el-icon></span>
            <input v-model="formData.password" type="password" required placeholder="请设置新密码" />
          </label>

          <button type="submit" class="legacy-submit-btn" :disabled="isSubmitting">
            <template v-if="isSubmitting">
              <span class="legacy-loading-inline"></span>
              提交中...
            </template>
            <template v-else>提交登记</template>
          </button>
        </form>
      </section>

      <section v-else class="legacy-card-view">
        <div class="legacy-success-head">
          <h3>注册成功！</h3>
          <p>欢迎继续体验悦享e食</p>
        </div>

        <p class="legacy-divider">请选择体验方式</p>

        <div class="legacy-platform-list">
          <button type="button" class="legacy-platform-btn legacy-platform-mini" @click="handleAppClick('mini')">
            <span class="legacy-platform-icon"><el-icon><ChatDotRound /></el-icon></span>
            <span class="legacy-platform-text">
              <strong>体验微信小程序版</strong>
              <small>免下载，即点即用，便捷轻量</small>
            </span>
            <el-icon><ArrowRight /></el-icon>
          </button>

          <button type="button" class="legacy-platform-btn legacy-platform-app" @click="handleAppClick('app')">
            <span class="legacy-platform-icon"><el-icon><Iphone /></el-icon></span>
            <span class="legacy-platform-text">
              <strong>体验 APP 版本</strong>
              <small>全功能，体验更完整</small>
            </span>
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Message, ArrowRight, User, Phone, Lock, ChatDotRound, Iphone, Present } from '@element-plus/icons-vue';
import request from '@/utils/request';
import { buildRuntimeUrl } from '@/utils/runtime';

const props = defineProps({
  token: {
    type: String,
    default: ''
  },
  invite: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['link-invalid']);

const step = ref(0);
const isSubmitting = ref(false);
const formData = reactive({
  username: '',
  phone: '',
  password: ''
});

let stepTimer = null;

watch(step, (value) => {
  clearStepTimer();
  if (value === 1) {
    stepTimer = window.setTimeout(() => {
      step.value = 2;
    }, 2000);
  }
});

watch(
  () => props.token,
  () => {
    resetFlow();
  }
);

onBeforeUnmount(() => {
  clearStepTimer();
});

function clearStepTimer() {
  if (stepTimer) {
    window.clearTimeout(stepTimer);
    stepTimer = null;
  }
}

function resetFlow() {
  clearStepTimer();
  step.value = 0;
  isSubmitting.value = false;
  formData.username = '';
  formData.phone = '';
  formData.password = '';
}

function openInviteEnvelope() {
  step.value = 1;
}

function validatePhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || ''));
}

async function handleRegister() {
  if (!formData.username) {
    ElMessage.warning('请输入用户名');
    return;
  }
  if (!validatePhone(formData.phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }
  if ((formData.password || '').length < 6) {
    ElMessage.warning('登录密码至少6位');
    return;
  }

  isSubmitting.value = true;
  try {
    await request.post(`/api/onboarding/invites/${props.token}/submit`, {
      name: formData.username,
      phone: formData.phone,
      password: formData.password
    });
    step.value = 4;
    ElMessage.success('提交成功');
  } catch (error) {
    const message = error?.response?.data?.error || '提交失败';
    ElMessage.error(message);
    if (error?.response?.status === 404 || error?.response?.status === 410) {
      emit('link-invalid', message);
    }
  } finally {
    isSubmitting.value = false;
  }
}

function handleAppClick(platform) {
  if (platform === 'app') {
    window.location.href = buildRuntimeUrl('site', '/download');
    return;
  }
  ElMessage.info('请在微信中搜索“悦享e食”小程序');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
</script>

<style scoped lang="css" src="./OldUserInviteFlow.css"></style>
