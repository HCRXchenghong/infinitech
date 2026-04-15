<template>
  <div class="pb-16 bg-white">
    <section class="hero-bg site-home-screen site-screen-center pt-32 pb-24 md:pt-40 md:pb-32 px-6 relative" data-site-header-theme="dark">
      <div class="hero-grid"></div>
      <div class="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
        <div class="flex-1 text-left text-white">
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 text-sm font-medium mb-6 backdrop-blur-sm rounded-full">
            <span class="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></span>
            烟台城市科技职业学院官方支持平台
          </div>
          <h1 class="text-4xl md:text-6xl font-bold mb-6 tracking-tight leading-tight">
            构建透明高效的
            <br />
            <span class="text-blue-300">校园生态服务</span>
          </h1>
          <p class="text-lg md:text-xl text-blue-100 opacity-90 mb-10 max-w-xl leading-relaxed font-light">
            由燧石创想技术团队驱动，提供校园维权曝光、企业商户入驻、前沿资讯发布的一站式综合管理服务解决方案。
          </p>
          <div class="flex flex-wrap gap-3 mb-8 text-sm text-blue-50/90">
            <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1">校园曝光维权</span>
            <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1">新闻资讯发布</span>
            <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1">商务合作入驻</span>
            <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1">校园生态服务</span>
          </div>
          <div class="flex flex-col sm:flex-row gap-4">
            <el-button
              type="primary"
              size="large"
              class="!h-12 !px-8 !text-base !bg-white !text-[#1976d2] !border-none hover:!bg-blue-50"
              @click="router.push('/expose')"
            >
              曝光维权通道
            </el-button>
            <el-button
              size="large"
              class="!h-12 !px-8 !text-base !bg-transparent !text-white !border-white/40 hover:!bg-white/10"
              @click="router.push('/coop')"
            >
              申请商务合作
            </el-button>
          </div>
        </div>

        <div class="hidden md:flex flex-1 justify-end relative items-center">
          <div
            ref="heroPhoneRef"
            class="iphone-mockup hero-phone-shell w-[280px] h-[580px] transform -rotate-6 hover:rotate-0 transition duration-700 z-10 overflow-hidden cursor-pointer"
            @mouseenter="activateHeroPhone"
            @mouseleave="deactivateHeroPhone"
            @click="activateHeroPhone"
          >
            <transition name="site-phone-panel" mode="out-in">
              <div v-if="heroPhoneInteractive" key="cta" class="hero-phone-cta">
                <div class="hero-phone-kicker">YUEXIANG PLATFORM</div>
                <h3 class="hero-phone-title">扫一扫去体验</h3>
                <div class="hero-phone-qr-shell">
                  <img
                    v-if="heroPhoneQrImage"
                    :src="heroPhoneQrImage"
                    class="hero-phone-qr"
                    alt="悦享e食小程序二维码"
                  >
                  <div v-else class="hero-phone-qr-placeholder">请在管理端上传小程序二维码</div>
                </div>
                <el-button
                  type="primary"
                  class="hero-phone-button"
                  @click.stop="openDownloadPage"
                >
                  点击下载客户端
                </el-button>
              </div>
              <img
                v-else
                key="cover"
                src="/images/official-site/hero-phone-display.jpg"
                class="w-full h-full object-cover"
                alt="悦享e食官方支持平台移动端展示图"
              >
            </transition>
          </div>
          <div class="w-96 h-96 rounded-full border border-white/20 absolute -right-10 top-1/2 -translate-y-1/2 animate-[spin_60s_linear_infinite]"></div>
        </div>
      </div>
    </section>

    <section class="py-20 bg-slate-50 border-b border-slate-100">
      <div class="max-w-6xl mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-bold text-slate-900">平台核心服务</h2>
          <p class="text-slate-500 mt-4 text-lg">围绕校园高频生活场景，覆盖优惠下单、即时配送、代办代取与兴趣连接四条核心服务线</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <article
            v-for="item in serviceCards"
            :key="item.title"
            class="bg-white p-8 rounded-lg shadow-sm border border-slate-100 hover:shadow-lg transition-shadow"
          >
            <div class="w-14 h-14 bg-blue-50 text-[#1976d2] flex items-center justify-center rounded-2xl mb-6 border border-blue-100">
              <el-icon :size="24">
                <component :is="item.icon" />
              </el-icon>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-3">{{ item.title }}</h3>
            <p class="text-slate-500 text-sm leading-relaxed">{{ item.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="py-20 max-w-6xl mx-auto px-6">
      <div class="flex justify-between items-end mb-10 border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 class="text-3xl font-bold text-slate-900">平台动态</h2>
          <p class="text-slate-500 mt-2">Latest News</p>
        </div>
        <el-button link class="!text-[#1976d2] text-base" @click="router.push('/news')">查看更多新闻</el-button>
      </div>

      <div v-loading="loading" class="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div
          v-if="featuredNews"
          class="group cursor-pointer"
          @click="openNews(featuredNews)"
        >
          <div class="overflow-hidden rounded-lg mb-6">
            <img :src="resolveNewsCover(featuredNews, 0)" class="w-full h-72 object-cover transform group-hover:scale-105 transition duration-500" alt="news cover">
          </div>
          <div class="flex items-center gap-3 mb-3">
            <span class="text-xs font-bold text-[#1976d2] uppercase tracking-wider">{{ featuredNews.source || '官方公告' }}</span>
            <span class="text-sm text-slate-400">{{ formatDate(featuredNews.created_at) }}</span>
          </div>
          <h3 class="text-2xl font-bold text-slate-900 mb-3 group-hover:text-[#1976d2] transition">{{ featuredNews.title }}</h3>
          <p class="text-slate-500 leading-relaxed">{{ featuredNews.summary || '暂无摘要' }}</p>
        </div>

        <div v-else class="biz-card p-8 flex items-center justify-center text-slate-400">
          暂无已发布平台动态
        </div>

        <div class="flex flex-col justify-between">
          <div
            v-for="(item, index) in secondaryNews"
            :key="item.id"
            class="flex gap-6 pb-6 mb-6 border-b border-slate-100 last:border-0 last:pb-0 last:mb-0 cursor-pointer group"
            @click="openNews(item)"
          >
            <div class="w-40 h-28 flex-shrink-0 overflow-hidden rounded">
              <img :src="resolveNewsCover(item, index + 1)" class="w-full h-full object-cover transform group-hover:scale-105 transition duration-500" alt="news cover">
            </div>
            <div class="flex flex-col justify-center">
              <div class="text-xs font-bold text-[#1976d2] mb-1">{{ item.source || '官方公告' }}</div>
              <h4 class="text-lg font-bold text-slate-800 mb-2 group-hover:text-[#1976d2] transition line-clamp-2">{{ item.title }}</h4>
              <span class="text-sm text-slate-400">{{ formatDate(item.created_at) }}</span>
            </div>
          </div>

          <div v-if="!loading && secondaryNews.length === 0 && featuredNews" class="biz-card p-8 text-slate-400">
            更多平台动态正在整理中
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ChatDotRound, Food, ShoppingBag, Van } from '@element-plus/icons-vue';
import { extractErrorMessage, getPublicAppDownloadConfig, listPublicOfficialSiteNews } from '@/utils/officialSiteApi';

const HERO_READY_EVENT = 'official-site:hero-ready';
const router = useRouter();
const loading = ref(false);
const newsRecords = ref([]);
const heroPhoneRef = ref(null);
const heroPhoneInteractive = ref(false);
const heroPhoneQrImage = ref('');

const serviceCards = [
  {
    icon: ShoppingBag,
    title: '团购',
    desc: '围绕校内热门餐饮与高频消费需求，提供更稳定的团购活动、到店核销与限时优惠，帮用户更省钱地下单。'
  },
  {
    icon: Food,
    title: '外卖',
    desc: '整合校内外优质商家与配送能力，支持更清晰的餐品展示、下单履约和配送追踪，提升整体外卖体验。'
  },
  {
    icon: Van,
    title: '跑腿',
    desc: '覆盖取送、代拿、代买等即时需求场景，让临时琐事也能快速响应，满足校园内高频的小额即时服务需求。'
  },
  {
    icon: ChatDotRound,
    title: '社交',
    desc: '围绕校园关系链与兴趣场景，探索更轻量的互动连接方式，让同学之间在吃饭、活动与日常生活里更容易建立联系。'
  }
];

const newsFallbackCovers = [
  'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=1200&h=800&fit=crop',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800&h=600&fit=crop'
];

const featuredNews = computed(() => newsRecords.value[0] || null);
const secondaryNews = computed(() => newsRecords.value.slice(1, 4));

onMounted(() => {
  notifyHeroReady();
  requestAnimationFrame(() => {
    notifyHeroReady();
  });
  void loadHeroPhoneConfig();
  void loadNews();
  window.addEventListener('pointerdown', handleGlobalPointerDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handleGlobalPointerDown);
});

async function loadNews() {
  loading.value = true;
  try {
    const data = await listPublicOfficialSiteNews({ limit: 4, page: 1 });
    newsRecords.value = data.records;
  } catch (error) {
    newsRecords.value = [];
    ElMessage.error(extractErrorMessage(error, '平台动态加载失败'));
  } finally {
    loading.value = false;
  }
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveNewsCover(item, index) {
  return String(item?.cover || '').trim() || newsFallbackCovers[index % newsFallbackCovers.length];
}

function openNews(item) {
  if (!item?.id) {
    router.push('/news');
    return;
  }
  router.push(`/news/${item.id}`);
}

function notifyHeroReady() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(HERO_READY_EVENT));
}

async function loadHeroPhoneConfig() {
  try {
    const data = await getPublicAppDownloadConfig();
    heroPhoneQrImage.value = String(data?.mini_program_qr_url || '').trim();
  } catch (_error) {
    heroPhoneQrImage.value = '';
  }
}

function activateHeroPhone() {
  heroPhoneInteractive.value = true;
}

function deactivateHeroPhone() {
  heroPhoneInteractive.value = false;
}

function handleGlobalPointerDown(event) {
  const target = event?.target;
  if (heroPhoneRef.value && target instanceof Node && !heroPhoneRef.value.contains(target)) {
    heroPhoneInteractive.value = false;
  }
}

function openDownloadPage() {
  router.push('/download');
}
</script>

<style scoped>
.hero-phone-shell {
  background: #000000;
}

.hero-phone-cta {
  width: 100%;
  height: 100%;
  padding: 62px 24px 28px;
  background:
    radial-gradient(circle at top, rgba(96, 165, 250, 0.22), transparent 34%),
    linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.hero-phone-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: #1976d2;
}

.hero-phone-title {
  margin: 12px 0 0;
  font-size: 28px;
  line-height: 1.2;
  font-weight: 800;
  color: #0f172a;
}

.hero-phone-desc {
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.8;
  color: #475569;
}

.hero-phone-qr-shell {
  margin-top: 24px;
  width: 188px;
  height: 188px;
  padding: 10px;
  border-radius: 28px;
  background: #ffffff;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-phone-qr {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.hero-phone-qr-placeholder {
  font-size: 12px;
  color: #64748b;
}

.hero-phone-button {
  margin-top: 24px;
  width: 100%;
  height: 48px;
  border-radius: 16px;
  font-weight: 700;
}

.site-phone-panel-enter-active,
.site-phone-panel-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.site-phone-panel-enter-from,
.site-phone-panel-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
