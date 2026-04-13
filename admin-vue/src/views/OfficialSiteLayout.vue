<template>
  <div class="official-site-app min-h-screen flex flex-col bg-slate-50 text-slate-700">
    <header ref="headerEl" :class="['fixed top-0 left-0 w-full z-50 transition-all duration-300', headerClass]">
      <div class="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between">
        <button class="site-brand flex items-center gap-3 cursor-pointer bg-transparent border-0 p-0 appearance-none" type="button" @click="goTo('/')">
          <span class="site-brand-mark">
            <img class="site-brand-logo" :src="logoUrl" alt="悦享e食 logo">
          </span>
          <span class="flex flex-col items-start leading-none">
            <strong :class="['text-[24px] font-bold tracking-[0.02em] transition-colors duration-300', textClass]">悦享e食</strong>
            <small :class="['mt-1 text-[11px] font-medium tracking-[0.18em] transition-colors duration-300', subTextClass]">INFINITECH</small>
          </span>
        </button>

        <nav class="hidden md:flex items-center space-x-8">
          <button
            v-for="item in navItems"
            :key="item.path"
            type="button"
            :class="['bg-transparent border-0 p-0 appearance-none', getNavLinkClass(item.path)]"
            @click="goTo(item.path)"
          >
            {{ item.label }}
          </button>
        </nav>

        <button class="md:hidden bg-transparent border-0 p-0 appearance-none" type="button" @click="mobileMenuOpen = !mobileMenuOpen">
          <div :class="['w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300', mobileIconClass]">
            <span class="text-xl leading-none">{{ mobileMenuOpen ? '×' : '≡' }}</span>
          </div>
        </button>
      </div>

      <transition name="fade">
        <div v-if="mobileMenuOpen" class="md:hidden bg-white border-t border-slate-100 shadow-lg">
          <div class="px-6 py-4 flex flex-col gap-2">
            <button
              v-for="item in navItems"
              :key="`mobile-${item.path}`"
              type="button"
              class="w-full px-4 py-3 rounded-lg text-left text-sm font-semibold transition-all border-0 appearance-none"
              :class="isActive(item.path) ? 'bg-blue-50 text-[#1976d2]' : 'text-slate-700 hover:bg-slate-50'"
              @click="handleMobileNav(item.path)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </transition>
    </header>

    <main :class="['flex-1 w-full relative z-0', route.path === '/' ? 'pt-0' : 'pt-[72px]']">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="bg-white border-t border-slate-200 pt-8 pb-6 mt-auto relative z-10">
      <div class="max-w-6xl mx-auto px-6 flex flex-col gap-4 items-center justify-center text-xs text-slate-500">
        <div class="text-center md:text-left">
          <p class="font-medium text-slate-800 mb-1">© 2026 烟台英菲尼信息科技有限公司</p>
          <p>联合运营：泓策融鑫科贸（烟台）有限公司 | 技术支持：燧石创想工作室</p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-5 text-[12px]">
          <button type="button" class="site-footer-link" @click="goTo('/privacy-policy')">隐私政策</button>
          <button type="button" class="site-footer-link" @click="goTo('/disclaimer')">免责声明</button>
        </div>
      </div>
    </footer>

    <OfficialSiteCookieBanner />
    <OfficialSiteSupportWidget />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import OfficialSiteCookieBanner from '@/components/OfficialSiteCookieBanner.vue';
import OfficialSiteSupportWidget from '@/components/OfficialSiteSupportWidget.vue';

const HERO_READY_EVENT = 'official-site:hero-ready';
const router = useRouter();
const route = useRoute();
const headerEl = ref(null);
const mobileMenuOpen = ref(false);
const headerTheme = ref('light');
const logoUrl = new URL('/logo.png', import.meta.url).href;
let headerContrastFrame = 0;
let resizeObserver = null;

const navItems = [
  { path: '/', label: '首页' },
  { path: '/news', label: '新闻资讯' },
  { path: '/download', label: '平台下载' },
  { path: '/expose', label: '曝光店铺' },
  { path: '/coop', label: '商务合作' },
  { path: '/about', label: '关于我们' }
];

const useLightHeaderText = computed(() => headerTheme.value === 'dark' && !mobileMenuOpen.value);

const headerClass = computed(() => {
  if (useLightHeaderText.value) {
    return 'bg-transparent border-transparent';
  }
  return 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100';
});

const textClass = computed(() => {
  return useLightHeaderText.value ? 'text-white' : 'text-slate-900';
});

const subTextClass = computed(() => {
  return useLightHeaderText.value ? 'text-blue-100' : 'text-slate-500';
});

const mobileIconClass = computed(() => {
  return useLightHeaderText.value
    ? 'bg-white/10 text-white'
    : 'bg-slate-100 text-slate-900';
});

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false;
  void nextTick(() => {
    bindHeroObservers();
    queueHeaderContrastUpdate();
    requestAnimationFrame(() => {
      bindHeroObservers();
      queueHeaderContrastUpdate();
    });
  });
});

watch(mobileMenuOpen, () => {
  queueHeaderContrastUpdate();
});

function updateHeaderContrast() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const currentHeader = headerEl.value;
  const headerHeight = currentHeader instanceof HTMLElement
    ? Math.ceil(currentHeader.getBoundingClientRect().height || currentHeader.offsetHeight || 72)
    : 72;
  const sampledTheme = resolveThemeBehindHeader(headerHeight);
  headerTheme.value = sampledTheme || 'light';
}

function queueHeaderContrastUpdate() {
  if (typeof window === 'undefined') return;
  if (headerContrastFrame) {
    window.cancelAnimationFrame(headerContrastFrame);
  }
  headerContrastFrame = window.requestAnimationFrame(() => {
    headerContrastFrame = 0;
    updateHeaderContrast();
  });
}

function disconnectHeroObservers() {
  resizeObserver?.disconnect();
  resizeObserver = null;
}

function bindHeroObservers() {
  disconnectHeroObservers();
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof ResizeObserver === 'undefined') return;

  resizeObserver = new ResizeObserver(() => {
    queueHeaderContrastUpdate();
  });

  if (headerEl.value instanceof HTMLElement) {
    resizeObserver.observe(headerEl.value);
  }

  const themeAnchor = document.querySelector('[data-site-header-theme]');
  if (themeAnchor instanceof HTMLElement) {
    resizeObserver.observe(themeAnchor);
  }
}

function resolveThemeBehindHeader(headerHeight) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return '';

  const sampleY = Math.min(
    Math.max(8, Math.round(headerHeight / 2)),
    Math.max(8, window.innerHeight - 8)
  );
  const sampleXs = [0.22, 0.5, 0.78]
    .map((ratio) => Math.round(window.innerWidth * ratio))
    .map((value) => Math.min(Math.max(value, 8), Math.max(8, window.innerWidth - 8)));

  const currentHeader = headerEl.value;
  const previousPointerEvents = currentHeader instanceof HTMLElement ? currentHeader.style.pointerEvents : '';
  if (currentHeader instanceof HTMLElement) {
    currentHeader.style.pointerEvents = 'none';
  }

  try {
    const themes = sampleXs
      .map((x) => resolveThemeAtPoint(x, sampleY))
      .filter((theme) => theme === 'dark' || theme === 'light');

    if (themes.length === 0) {
      return '';
    }

    const darkVotes = themes.filter((theme) => theme === 'dark').length;
    return darkVotes >= Math.ceil(themes.length / 2) ? 'dark' : 'light';
  } finally {
    if (currentHeader instanceof HTMLElement) {
      currentHeader.style.pointerEvents = previousPointerEvents;
    }
  }
}

function resolveThemeAtPoint(x, y) {
  const node = document.elementFromPoint(x, y);
  if (!(node instanceof Element)) {
    return '';
  }

  let current = node;
  while (current) {
    const theme = String(current.getAttribute('data-site-header-theme') || '').trim().toLowerCase();
    if (theme === 'dark' || theme === 'light') {
      return theme;
    }
    current = current.parentElement;
  }

  return '';
}

function isActive(path) {
  if (path === '/news') return route.path === '/news' || route.path.startsWith('/news/');
  if (path === '/download') return route.path === '/download';
  if (path === '/expose') return route.path === '/expose' || route.path === '/exposures' || route.path.startsWith('/expose/') || route.path.startsWith('/exposures/');
  if (path === '/coop') return route.path === '/coop' || route.path === '/cooperation';
  return route.path === path;
}

function getNavLinkClass(path) {
  const active = isActive(path);
  const lightText = useLightHeaderText.value;
  const baseClass = 'pb-1 text-[15px] font-medium transition-all border-b-2 border-transparent';
  if (active) {
    return lightText
      ? `${baseClass} text-white font-semibold border-white`
      : `${baseClass} text-[#1976d2] font-semibold border-[#1976d2]`;
  }
  return lightText
    ? `${baseClass} text-white/85 hover:text-white`
    : `${baseClass} text-slate-600 hover:text-[#1976d2]`;
}

function goTo(path) {
  if (path !== route.path) {
    router.push(path);
  }
}

function handleMobileNav(path) {
  mobileMenuOpen.value = false;
  goTo(path);
}

onMounted(() => {
  bindHeroObservers();
  queueHeaderContrastUpdate();
  window.addEventListener('scroll', queueHeaderContrastUpdate, { passive: true });
  window.addEventListener('resize', queueHeaderContrastUpdate, { passive: true });
  window.addEventListener('load', queueHeaderContrastUpdate, { passive: true });
  window.addEventListener(HERO_READY_EVENT, bindHeroObservers);
  window.addEventListener(HERO_READY_EVENT, queueHeaderContrastUpdate);
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      queueHeaderContrastUpdate();
    }).catch(() => {});
  }
});

onBeforeUnmount(() => {
  disconnectHeroObservers();
  if (headerContrastFrame) {
    window.cancelAnimationFrame(headerContrastFrame);
    headerContrastFrame = 0;
  }
  window.removeEventListener('scroll', queueHeaderContrastUpdate);
  window.removeEventListener('resize', queueHeaderContrastUpdate);
  window.removeEventListener('load', queueHeaderContrastUpdate);
  window.removeEventListener(HERO_READY_EVENT, bindHeroObservers);
  window.removeEventListener(HERO_READY_EVENT, queueHeaderContrastUpdate);
});
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap');

:root {
  --el-color-primary: #1976d2;
  --el-color-primary-light-3: #42a5f5;
  --el-color-primary-light-5: #90caf9;
  --el-color-primary-light-7: #e3f2fd;
  --el-color-primary-light-9: #f0f8ff;
  --el-border-radius-base: 4px;
  --site-header-height: 72px;
}

body {
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  background-color: #f8fafc;
  color: #334155;
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.biz-card {
  background-color: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -1px rgb(0 0 0 / 0.03);
  transition: all 0.3s ease;
}

.biz-card-hover:hover {
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04);
  transform: translateY(-4px);
}

.site-brand {
  min-width: 0;
}

.site-brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.site-brand-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.22);
  transform-origin: center;
  display: block;
}

.site-footer-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: #475569;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s ease;
}

.site-footer-link:hover {
  color: #1976d2;
}

.site-screen-section {
  min-height: calc(100svh - var(--site-header-height));
}

.site-screen-center {
  display: flex;
  align-items: center;
}

.site-home-screen {
  min-height: 100svh;
}

.site-article-hero {
  min-height: calc(100svh - var(--site-header-height) - 4rem);
}

.hero-bg {
  background: linear-gradient(135deg, #1976d2 0%, #1976d2 100%);
  position: relative;
  overflow: hidden;
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 0.05) 1px, transparent 1px);
  background-size: 30px 30px;
}

.iphone-mockup {
  border: 10px solid #111111;
  border-radius: 40px;
  position: relative;
  background-color: #000000;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5);
}

.iphone-mockup::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 25px;
  background-color: #111111;
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
  z-index: 10;
}

.text-truncate-2,
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.official-site-article {
  color: #334155;
}

.official-site-article .p-block {
  margin: 0 0 1rem;
  font-size: 1rem;
  line-height: 1.9;
  color: #475569;
}

.official-site-article .h2-block {
  margin: 2rem 0 1rem;
  font-size: 1.5rem;
  line-height: 1.4;
  font-weight: 700;
  color: #0f172a;
}

.official-site-article .quote-block {
  margin: 1.5rem 0;
  padding: 1rem 1.25rem;
  border-left: 4px solid #1976d2;
  background: #eff6ff;
  border-radius: 0.5rem;
  color: #1e3a8a;
  line-height: 1.8;
}

.official-site-article .ul-block {
  margin: 1rem 0 1.25rem;
  padding-left: 1.25rem;
  color: #475569;
}

.official-site-article .ul-block li {
  margin-bottom: 0.5rem;
  line-height: 1.8;
}

.official-site-article .img-block {
  margin: 1.5rem 0;
}

.official-site-article .img-block img {
  border-radius: 0.75rem;
}

.official-site-article .img-block figcaption {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
  text-align: center;
}

@supports (height: 100dvh) {
  .site-screen-section {
    min-height: calc(100dvh - var(--site-header-height));
  }

  .site-home-screen {
    min-height: 100dvh;
  }

  .site-article-hero {
    min-height: calc(100dvh - var(--site-header-height) - 4rem);
  }
}
</style>
