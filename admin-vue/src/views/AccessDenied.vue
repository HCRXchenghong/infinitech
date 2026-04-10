<template>
  <div class="access-page">
    <div class="access-card">
      <el-result :title="title" :sub-title="subtitle" icon="warning">
        <template #extra>
          <div class="action-row">
            <el-button
              v-if="mode === 'invite-only' || mode === 'admin-only'"
              type="primary"
              @click="openDownloadHome"
            >
              前往下载页
            </el-button>
            <el-button
              v-if="mode === 'download-only' || mode === 'admin-only'"
              @click="openInviteExample"
            >
              邀请链接示例
            </el-button>
            <el-button
              v-if="mode === 'download-only' || mode === 'admin-only'"
              @click="openCouponExample"
            >
              领券链接示例
            </el-button>
            <el-button
              v-if="mode === 'invite-only' || mode === 'download-only'"
              @click="goAdminLogin"
            >
              前往管理端
            </el-button>
            <el-button
              v-if="mode === 'admin-only'"
              @click="goAdminLogin"
            >
              管理端登录
            </el-button>
          </div>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { buildRuntimeUrl } from '@/utils/runtime';

const route = useRoute();

const mode = computed(() => {
  const currentMode = String(route.query.mode || '').trim();
  if (currentMode === 'invite-only' || currentMode === 'download-only') {
    return currentMode;
  }
  return 'admin-only';
});

const title = computed(() => {
  if (mode.value === 'invite-only') {
    return '1788 仅开放邀请 / 领券页';
  }
  if (mode.value === 'download-only') {
    return '1798 仅开放下载页';
  }
  return '8888 仅用于管理端';
});

const subtitle = computed(() => {
  if (mode.value === 'invite-only') {
    return '当前端口仅开放 /invite/:token 邀请链接和 /coupon/:token 领券链接；下载页请使用 1798。';
  }
  if (mode.value === 'download-only') {
    return '当前端口仅开放 /download 下载页；邀请 / 领券请使用 1788。';
  }
  return '当前端口只用于管理端登录和后台操作；邀请 / 领券请使用 1788，下载页请使用 1798。';
});

function openDownloadHome() {
  if (typeof window === 'undefined') return;
  window.open(buildRuntimeUrl('download', '/download'), '_self');
}

function openInviteExample() {
  if (typeof window === 'undefined') return;
  window.open(buildRuntimeUrl('invite', '/invite/你的邀请token'), '_self');
}

function openCouponExample() {
  if (typeof window === 'undefined') return;
  window.open(buildRuntimeUrl('invite', '/coupon/你的领券token'), '_self');
}

function goAdminLogin() {
  if (typeof window === 'undefined') return;
  window.open(buildRuntimeUrl('admin', '/login'), '_self');
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
  gap: 12px;
  flex-wrap: wrap;
}
</style>
