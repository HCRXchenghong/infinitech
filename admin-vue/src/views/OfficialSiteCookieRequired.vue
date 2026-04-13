<template>
  <div class="bg-slate-50 site-screen-section site-screen-center py-16 px-6">
    <div class="max-w-4xl mx-auto">
      <section class="cookie-required-card">
        <div class="cookie-required-kicker">Cookie 说明</div>
        <h1 class="cookie-required-title">当前浏览器尚未允许官网 Cookie 与本地存储</h1>
        <p class="cookie-required-desc">
          当前浏览器不会继续保存官网客服 token、历史会话与相关偏好设置，因此官网互动功能已暂停。
          如果你希望继续使用在线客服、保留同一浏览器下的历史记录，可以重新允许 Cookie。
        </p>

        <div class="cookie-required-actions">
          <el-button type="primary" size="large" class="!px-8 !h-12" @click="acceptAndContinue">
            允许并返回官网
          </el-button>
          <el-button size="large" class="!px-8 !h-12" @click="router.push('/privacy-policy')">
            查看隐私政策
          </el-button>
          <el-button size="large" class="!px-8 !h-12" @click="router.push('/disclaimer')">
            查看免责声明
          </el-button>
        </div>

        <div class="cookie-required-grid">
          <article class="cookie-required-panel">
            <h2>同意后会发生什么</h2>
            <ul>
              <li>官网会将客服会话 token 保存到当前浏览器本地。</li>
              <li>同一浏览器再次打开官网时，可以继续读取历史客服记录。</li>
              <li>Cookie 与本地存储仅用于官网基础安全、客服链路与体验优化。</li>
            </ul>
          </article>

          <article class="cookie-required-panel">
            <h2>拒绝后会发生什么</h2>
            <ul>
              <li>本机会话 token 会立即清空，不再继续持久保存。</li>
              <li>官网客服、历史记录等依赖本地标识的能力不会继续提供。</li>
              <li>你仍可以查看隐私政策、免责声明与本 Cookie 说明页面。</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import { setSiteCookieConsent } from '@/utils/siteCookieConsent';

const route = useRoute();
const router = useRouter();

function acceptAndContinue() {
  setSiteCookieConsent('accepted');
  const redirectPath = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
    ? route.query.redirect
    : '/';
  router.replace(redirectPath);
}
</script>

<style scoped>
.cookie-required-card {
  padding: 38px;
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid #e2e8f0;
  box-shadow: 0 24px 60px rgb(15 23 42 / 0.08);
}

.cookie-required-kicker {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: #eff6ff;
  color: #1976d2;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.cookie-required-title {
  margin: 18px 0 0;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.15;
  font-weight: 800;
  color: #0f172a;
}

.cookie-required-desc {
  margin: 18px 0 0;
  max-width: 780px;
  font-size: 16px;
  line-height: 1.9;
  color: #475569;
}

.cookie-required-actions {
  margin-top: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.cookie-required-grid {
  margin-top: 30px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.cookie-required-panel {
  padding: 24px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

.cookie-required-panel h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.4;
  color: #0f172a;
}

.cookie-required-panel ul {
  margin: 14px 0 0;
  padding-left: 1.2rem;
  color: #475569;
}

.cookie-required-panel li {
  margin-bottom: 10px;
  line-height: 1.8;
}

@media (max-width: 768px) {
  .cookie-required-card {
    padding: 24px 20px;
    border-radius: 20px;
  }

  .cookie-required-grid {
    grid-template-columns: 1fr;
  }
}
</style>
