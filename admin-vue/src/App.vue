<template>
  <NetworkStatus />
  <router-view v-if="isPublicRoute" />
  <div v-else class="layout">
    <aside class="sider">
      <div class="logo">
        <img class="logo-img" :src="logoUrl" alt="logo" />
        <div class="logo-text">悦享e食</div>
      </div>
      <nav class="menu">
        <div v-for="group in menuGroups" :key="group.id" class="menu-group">
          <div
            class="menu-group-title"
            :class="{ open: isGroupOpen(group.id) }"
            @click="toggleGroup(group.id)"
          >
            <span>{{ group.name }}</span>
            <span class="menu-group-arrow" :class="{ open: isGroupOpen(group.id) }">▾</span>
          </div>
          <div v-show="isGroupOpen(group.id)" class="menu-group-items">
            <div
              v-for="item in group.children"
              :key="item.path"
              class="menu-item menu-item-child"
              :class="{ active: isMenuActive(item.path) }"
              @click="handleMenuClick(item.path)"
            >
              <span>{{ item.name }}</span>
            </div>
          </div>
        </div>
      </nav>
      <div class="sider-footer">
        <el-button size="small" class="logout-btn" @click="logout">退出登录</el-button>
      </div>
    </aside>

    <div class="main" :class="{ 'welcome-mode': openedTabs.length === 0 && route.path === '/' && !isPublicRoute }">
      <header class="header">
        <div class="header-left">
          <div class="bread">{{ currentName }}</div>
        </div>
      </header>
      <div class="tabs-wrap" v-if="openedTabs.length > 0">
        <el-tabs
          v-model="activeTab"
          type="card"
          class="tabs-nav"
          @tab-change="handleTabChange"
          @tab-remove="handleTabRemove"
        >
          <el-tab-pane
            v-for="tab in openedTabs"
            :key="tab.fullPath"
            :label="tab.title"
            :name="tab.fullPath"
            :closable="tab.closable"
          />
        </el-tabs>
      </div>
      <main class="content">
        <router-view v-if="openedTabs.length > 0" :key="route.path" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NetworkStatus from '@/components/NetworkStatus.vue';
import { MENU_GROUPS } from '@/config/menuGroups';

const router = useRouter();
const route = useRoute();

const logoUrl = new URL('/logo.png', import.meta.url).href;
const OPENED_TABS_STORAGE_KEY = 'admin_opened_tabs_v1';
const ACTIVE_TAB_STORAGE_KEY = 'admin_active_tab_v1';
const OPENED_MENU_GROUPS_KEY = 'admin_opened_menu_groups_v1';

const adminUser = ref(null);
const openedTabs = ref([]);
const activeTab = ref('');
const openedMenuGroups = ref([]);
const retiredPaths = new Set(['/customer-service', '/ai-staff']);
const PUBLIC_ROUTE_EXACT = new Set(['/login', '/download', '/access-denied']);
const PUBLIC_ROUTE_PREFIXES = ['/invite/', '/coupon/'];

function sanitizeTabs(rawTabs) {
  if (!Array.isArray(rawTabs)) return [];
  const dedup = new Set();
  const result = [];
  rawTabs.forEach((tab) => {
    if (!tab || typeof tab !== 'object') return;
    if (typeof tab.fullPath !== 'string' || !tab.fullPath.startsWith('/')) return;
    const tabPath = tab.fullPath.split('?')[0];
    if (tabPath === '/' || isPublicPath(tabPath)) return;
    if (retiredPaths.has(tab.fullPath)) return;
    if (dedup.has(tab.fullPath)) return;
    dedup.add(tab.fullPath);
    result.push({
      fullPath: tab.fullPath,
      title: typeof tab.title === 'string' && tab.title.trim() ? tab.title : tab.fullPath,
      closable: true
    });
  });
  return result;
}

function restoreTabs() {
  try {
    const saved = localStorage.getItem(OPENED_TABS_STORAGE_KEY);
    openedTabs.value = sanitizeTabs(saved ? JSON.parse(saved) : []);
    const savedActive = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) || '';
    activeTab.value = savedActive || openedTabs.value[0]?.fullPath || '';
  } catch (error) {
    openedTabs.value = [];
    activeTab.value = '';
  }
}

function restoreMenuGroups() {
  try {
    const saved = localStorage.getItem(OPENED_MENU_GROUPS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    openedMenuGroups.value = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    openedMenuGroups.value = [];
  }
}

function persistMenuGroups() {
  try {
    localStorage.setItem(OPENED_MENU_GROUPS_KEY, JSON.stringify(openedMenuGroups.value));
  } catch (error) {
    // ignore storage write failures
  }
}

function persistTabs() {
  try {
    localStorage.setItem(OPENED_TABS_STORAGE_KEY, JSON.stringify(openedTabs.value));
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab.value || '');
  } catch (error) {
    // ignore storage write failures
  }
}

restoreTabs();
restoreMenuGroups();

function ensureCurrentRouteTab() {
  if (!route?.path || route.path === '/' || isPublicPath(route.path)) {
    return;
  }
  const fullPath = route.fullPath;
  const currentIndex = openedTabs.value.findIndex((item) => item.fullPath === fullPath);
  if (currentIndex < 0) {
    openedTabs.value.unshift({
      fullPath,
      title: resolveTabTitle(route),
      closable: true
    });
  }
  activeTab.value = fullPath;
  persistTabs();
}

function loadUserInfo() {
  const userStr = localStorage.getItem('admin_user') || sessionStorage.getItem('admin_user');
  if (userStr) {
    try {
      adminUser.value = JSON.parse(userStr);
    } catch (e) {
      console.error('解析用户信息失败:', e);
      adminUser.value = null;
    }
  } else {
    adminUser.value = null;
  }
}

onMounted(() => {
  loadUserInfo();
  ensureCurrentRouteTab();
  window.addEventListener('storage', (e) => {
    if (e.key === 'admin_user') {
      loadUserInfo();
    }
  });
});

watch(() => route.path, () => {
  loadUserInfo();
});

const menuGroups = computed(() => {
  if (!adminUser.value) {
    return [];
  }

  return MENU_GROUPS;
});

const flatMenus = computed(() =>
  menuGroups.value.flatMap((group) => group.children || [])
);

function resolveActiveMenuPath(path = '') {
  if (!path) return '';
  const prefixed = flatMenus.value.find((item) => path === item.path || path.startsWith(`${item.path}/`));
  if (prefixed) return prefixed.path;
  if (path.startsWith('/notifications/')) return '/notifications';
  if (path.startsWith('/merchants/')) return '/merchants';
  return path;
}

const activeMenuPath = computed(() => {
  const menuRoot = route.meta?.menuRoot;
  if (typeof menuRoot === 'string' && menuRoot) {
    return menuRoot;
  }
  return resolveActiveMenuPath(route.path);
});

const activeGroupId = computed(() => {
  const group = menuGroups.value.find((item) =>
    (item.children || []).some((child) => child.path === activeMenuPath.value)
  );
  return group?.id || '';
});

const currentName = computed(() => {
  if (route.meta?.title) {
    return route.meta.title;
  }

  const menuItem = flatMenus.value.find((m) => m.path === activeMenuPath.value);
  if (menuItem) return menuItem.name;

  const nameMap = {
    '/api-management': 'API管理',
    '/system-settings': '系统设置',
    '/data-management': '数据管理',
    '/content-settings': '内容设置',
    '/api-permissions': 'API权限管理',
    '/support-chat': '客服工作台',
    '/after-sales': '售后服务',
    '/monitor-chat': '平台监控',
    '/operations-center': '运营管理',
    '/management-center': '管理中心'
  };
  return nameMap[route.path] || '';
});

function isPublicPath(path = '') {
  if (PUBLIC_ROUTE_EXACT.has(path)) {
    return true;
  }
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

const isPublicRoute = computed(() => isPublicPath(route.path));

function applyPublicScrollLock(locked) {
  if (typeof document === 'undefined') return;
  const htmlEl = document.documentElement;
  const bodyEl = document.body;
  if (!htmlEl || !bodyEl) return;
  htmlEl.classList.toggle('public-no-scroll', locked);
  bodyEl.classList.toggle('public-no-scroll', locked);
}

watch(
  isPublicRoute,
  (locked) => {
    applyPublicScrollLock(Boolean(locked));
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  applyPublicScrollLock(false);
});

function handleMenuClick(path) {
  const group = menuGroups.value.find((item) =>
    (item.children || []).some((child) => child.path === path)
  );
  if (group && !openedMenuGroups.value.includes(group.id)) {
    openedMenuGroups.value.push(group.id);
    persistMenuGroups();
  }
  router.push(path);
}

function isMenuActive(path) {
  return activeMenuPath.value === path;
}

function isGroupOpen(groupId) {
  return openedMenuGroups.value.includes(groupId);
}

function toggleGroup(groupId) {
  const next = [...openedMenuGroups.value];
  const index = next.indexOf(groupId);
  if (index >= 0) {
    next.splice(index, 1);
  } else {
    next.push(groupId);
  }
  openedMenuGroups.value = next;
  persistMenuGroups();
}

watch(
  () => route.fullPath,
  () => {
    syncOpenedTabs(route);
  },
  { immediate: true }
);

function resolveTabTitle(targetRoute) {
  const baseTitle = targetRoute.meta?.title || '';
  if (targetRoute.name === 'merchant-profile' && targetRoute.params?.id) {
    return `${baseTitle || '商户详情'} #${targetRoute.params.id}`;
  }
  if (targetRoute.name === 'shop-manage-detail' && targetRoute.params?.shopId) {
    return `${baseTitle || '店铺详情'} #${targetRoute.params.shopId}`;
  }
  if (baseTitle) {
    return baseTitle;
  }
  const menuItem = flatMenus.value.find((item) => resolveActiveMenuPath(targetRoute.path) === item.path);
  return menuItem ? menuItem.name : targetRoute.path;
}

function syncOpenedTabs(targetRoute) {
  if (!targetRoute?.path || targetRoute.path === '/' || isPublicPath(targetRoute.path)) {
    return;
  }
  const fullPath = targetRoute.fullPath;
  const existing = openedTabs.value.find((item) => item.fullPath === fullPath);
  const title = resolveTabTitle(targetRoute);
  const closable = true;

  if (existing) {
    existing.title = title;
    existing.closable = closable;
  } else {
    openedTabs.value.push({
      fullPath,
      title,
      closable
    });
  }
  activeTab.value = fullPath;
  persistTabs();
}

function handleTabChange(tabFullPath) {
  if (tabFullPath && tabFullPath !== route.fullPath) {
    router.push(tabFullPath);
  }
}

function handleTabRemove(tabFullPath) {
  const currentIndex = openedTabs.value.findIndex((item) => item.fullPath === tabFullPath);
  if (currentIndex < 0) return;

  const isCurrent = tabFullPath === route.fullPath;
  openedTabs.value.splice(currentIndex, 1);

  if (openedTabs.value.length === 0) {
    activeTab.value = '';
    if (isCurrent) {
      router.push('/');
    }
    persistTabs();
    return;
  }

  if (isCurrent) {
    const fallback = openedTabs.value[currentIndex] || openedTabs.value[currentIndex - 1] || openedTabs.value[0];
    if (fallback) {
      router.push(fallback.fullPath);
    }
  }
  persistTabs();
}

function logout() {
  localStorage.removeItem(OPENED_TABS_STORAGE_KEY);
  localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
  localStorage.removeItem(OPENED_MENU_GROUPS_KEY);
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  sessionStorage.removeItem('admin_token');
  sessionStorage.removeItem('admin_user');
  router.push('/login');
}

watch(
  () => menuGroups.value.map((item) => item.id).join(','),
  (groupIds) => {
    if (!groupIds) {
      openedMenuGroups.value = [];
      return;
    }
    const valid = new Set(menuGroups.value.map((item) => item.id));
    openedMenuGroups.value = openedMenuGroups.value.filter((id) => valid.has(id));
    if (openedMenuGroups.value.length === 0 && activeGroupId.value) {
      openedMenuGroups.value = [activeGroupId.value];
    }
    persistMenuGroups();
  },
  { immediate: true }
);

watch(
  () => activeGroupId.value,
  (groupId) => {
    if (!groupId) return;
    if (!openedMenuGroups.value.includes(groupId)) {
      openedMenuGroups.value = [...openedMenuGroups.value, groupId];
      persistMenuGroups();
    }
  },
  { immediate: true }
);

</script>

<style scoped lang="css" src="./App.css"></style>
