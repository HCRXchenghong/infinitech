import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ChatDotRound, Food, ShoppingBag, Van } from '@element-plus/icons-vue';
import {
  extractErrorMessage,
  getPublicAppDownloadConfig,
  listPublicOfficialSiteNews,
} from '@/utils/officialSiteApi';

const HERO_READY_EVENT = 'official-site:hero-ready';

const SERVICE_CARDS = [
  {
    icon: ShoppingBag,
    title: '团购',
    desc:
      '围绕校内热门餐饮与高频消费需求，提供更稳定的团购活动、到店核销与限时优惠，帮用户更省钱地下单。',
  },
  {
    icon: Food,
    title: '外卖',
    desc:
      '整合校内外优质商家与配送能力，支持更清晰的餐品展示、下单履约和配送追踪，提升整体外卖体验。',
  },
  {
    icon: Van,
    title: '跑腿',
    desc:
      '覆盖取送、代拿、代买等即时需求场景，让临时琐事也能快速响应，满足校园内高频的小额即时服务需求。',
  },
  {
    icon: ChatDotRound,
    title: '社交',
    desc:
      '围绕校园关系链与兴趣场景，探索更轻量的互动连接方式，让同学之间在吃饭、活动与日常生活里更容易建立联系。',
  },
];

const NEWS_FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=1200&h=800&fit=crop',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800&h=600&fit=crop',
];

export function useOfficialSiteHomePage({ router, ElMessage }) {
  const loading = ref(false);
  const newsRecords = ref([]);
  const heroPhoneElement = ref(null);
  const heroPhoneInteractive = ref(false);
  const heroPhoneQrImage = ref('');

  const featuredNews = computed(() => newsRecords.value[0] || null);
  const secondaryNews = computed(() => newsRecords.value.slice(1, 4));

  onMounted(() => {
    notifyHeroReady();
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        notifyHeroReady();
      });
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', handleGlobalPointerDown);
    }
    void loadHeroPhoneConfig();
    void loadNews();
  });

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', handleGlobalPointerDown);
    }
  });

  async function loadNews() {
    loading.value = true;
    try {
      const data = await listPublicOfficialSiteNews({ limit: 4, page: 1 });
      newsRecords.value = Array.isArray(data?.records) ? data.records : [];
    } catch (error) {
      newsRecords.value = [];
      ElMessage.error(extractErrorMessage(error, '平台动态加载失败'));
    } finally {
      loading.value = false;
    }
  }

  async function loadHeroPhoneConfig() {
    try {
      const data = await getPublicAppDownloadConfig();
      heroPhoneQrImage.value = String(data?.mini_program_qr_url || '').trim();
    } catch (_error) {
      heroPhoneQrImage.value = '';
    }
  }

  function notifyHeroReady() {
    if (typeof window === 'undefined') {
      return;
    }
    window.dispatchEvent(new CustomEvent(HERO_READY_EVENT));
  }

  function setHeroPhoneElement(element) {
    heroPhoneElement.value =
      typeof Node !== 'undefined' && element instanceof Node ? element : null;
  }

  function activateHeroPhone() {
    heroPhoneInteractive.value = true;
  }

  function deactivateHeroPhone() {
    heroPhoneInteractive.value = false;
  }

  function handleGlobalPointerDown(event) {
    const target = event?.target;
    if (
      heroPhoneElement.value &&
      typeof Node !== 'undefined' &&
      target instanceof Node &&
      !heroPhoneElement.value.contains(target)
    ) {
      heroPhoneInteractive.value = false;
    }
  }

  function formatDate(value) {
    if (!value) {
      return '--';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function resolveNewsCover(item, index) {
    return (
      String(item?.cover || '').trim() ||
      NEWS_FALLBACK_COVERS[index % NEWS_FALLBACK_COVERS.length]
    );
  }

  function openExposePage() {
    router.push('/expose');
  }

  function openCoopPage() {
    router.push('/coop');
  }

  function openNewsListPage() {
    router.push('/news');
  }

  function openNews(item) {
    if (!item?.id) {
      openNewsListPage();
      return;
    }
    router.push(`/news/${item.id}`);
  }

  function openDownloadPage() {
    router.push('/download');
  }

  return {
    activateHeroPhone,
    deactivateHeroPhone,
    featuredNews,
    formatDate,
    heroPhoneInteractive,
    heroPhoneQrImage,
    loading,
    openCoopPage,
    openDownloadPage,
    openExposePage,
    openNews,
    openNewsListPage,
    resolveNewsCover,
    secondaryNews,
    serviceCards: SERVICE_CARDS,
    setHeroPhoneElement,
  };
}
