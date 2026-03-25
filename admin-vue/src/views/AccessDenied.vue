<template>
  <div class="access-page">
    <div class="access-card">
      <el-result
        :title="title"
        :sub-title="subtitle"
        icon="warning"
      >
        <template #extra>
          <div class="action-row">
            <el-button v-if="mode === 'invite-only'" type="primary" @click="openDownloadHome">返回下载首页</el-button>
            <el-button v-if="mode === 'invite-only'" @click="openInviteExample">邀请链接示例</el-button>
            <el-button v-if="mode === 'invite-only'" @click="openCouponExample">领券链接示例</el-button>
            <el-button v-if="mode === 'admin-only'" type="primary" @click="goAdminLogin">前往管理端登录</el-button>
          </div>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const mode = computed(() => route.query.mode === 'invite-only' ? 'invite-only' : 'admin-only');

const host = computed(() => {
  if (typeof window === 'undefined' || !window.location) {
    return '127.0.0.1';
  }
  return window.location.hostname || '127.0.0.1';
});

const title = computed(() => {
  if (mode.value === 'invite-only') {
    return '1788 仅开放邀请/领券页';
  }
  return '8888 不开放邀请页';
});

const subtitle = computed(() => {
  if (mode.value === 'invite-only') {
    return '当前端口仅开放下载首页、/invite/:token 邀请链接和 /coupon/:token 领券链接。';
  }
  return '请使用 1788 打开邀请/领券链接，8888 仅用于管理端。';
});

function openDownloadHome() {
  if (typeof window === 'undefined') return;
  window.open(`http://${host.value}:1788/download`, '_self');
}

function openInviteExample() {
  if (typeof window === 'undefined') return;
  window.open(`http://${host.value}:1788/invite/你的邀请token`, '_self');
}

function openCouponExample() {
  if (typeof window === 'undefined') return;
  window.open(`http://${host.value}:1788/coupon/你的领券token`, '_self');
}

function goAdminLogin() {
  if (typeof window === 'undefined') return;
  window.open(`http://${host.value}:8888/login`, '_self');
}
</script>

<style scoped>
.access-page {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, #f2f8ff 0%, #eef6ff 45%, #f9fcff 100%);
  padding: 24px 24px calc(24px + env(safe-area-inset-bottom));
}

.access-card {
  width: 100%;
  max-width: 620px;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e8eef8;
  box-shadow: 0 12px 36px rgba(30, 58, 138, 0.08);
}

.action-row {
  display: flex;
  justify-content: center;
}
</style>
