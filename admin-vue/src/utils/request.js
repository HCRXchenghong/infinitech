import axios from 'axios';
import { saveToCache, getFromCache, STORES } from './cache';
import { getNetworkStatus } from './networkStatus';
import { getToken, isInviteRuntime } from './runtime';
import { hasValidPrimaryKey } from './record';

// 支持通过环境变量配置后台服务地址：
// - 本地开发默认走同源代理（避免 CORS）
// - 生产环境优先使用环境变量 VITE_ADMIN_API_BASE_URL
// - 无配置时按当前页面主机名拼接 :25500，减少 IP 变更导致的断连
const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
function getDefaultProdBaseURL() {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${window.location.hostname}:25500`;
  }
  return 'http://127.0.0.1:25500';
}

let baseURL = isDev ? '' : getDefaultProdBaseURL();

if (!isDev && typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ADMIN_API_BASE_URL) {
  baseURL = import.meta.env.VITE_ADMIN_API_BASE_URL;
}

const instance = axios.create({
  baseURL,
  timeout: 15000
});

function isInviteAllowedAPI(url) {
  const path = String(url || '');
  return path.startsWith('/api/onboarding/invites') ||
    path.startsWith('/api/coupons/link/') ||
    path.startsWith('/api/public/app-download-config') ||
    path === '/api/upload' ||
    path.startsWith('/api/upload?') ||
    path === '/api/health' ||
    path === '/health';
}

const hasValidId = hasValidPrimaryKey;

// 判断是否为读操作（GET请求且是数据查询接口）
function isReadOperation(config) {
  const url = config.url || '';
  const isGet = config.method === 'get' || config.method === 'GET';
  const isDataApi = url.includes('/api/users') || 
                    url.includes('/api/riders') || 
                    url.includes('/api/orders') || 
                    url.includes('/api/merchants');
  // 排除导出接口（导出接口需要实时数据）
  return isGet && isDataApi && !url.includes('/import') && !url.includes('/export') && !url.includes('/health');
}

// 判断是否为写操作（POST/PUT/DELETE）
function isWriteOperation(config) {
  const method = config.method?.toLowerCase() || '';
  return ['post', 'put', 'patch', 'delete'].includes(method);
}

// 获取对应的缓存存储名称
function getCacheStoreName(url) {
  if (url.includes('/api/users')) return STORES.USERS;
  if (url.includes('/api/riders')) return STORES.RIDERS;
  if (url.includes('/api/orders')) return STORES.ORDERS;
  if (url.includes('/api/merchants')) return STORES.MERCHANTS;
  return null;
}

function extractCacheRecords(storeName, payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.filter(hasValidId);
  }

  const listFieldMap = {
    [STORES.USERS]: 'users',
    [STORES.RIDERS]: 'riders',
    [STORES.ORDERS]: 'orders',
    [STORES.MERCHANTS]: 'merchants'
  };
  const listField = listFieldMap[storeName];

  if (typeof payload === 'object') {
    if (listField && Array.isArray(payload[listField])) {
      return payload[listField].filter(hasValidId);
    }
    if (payload.data && typeof payload.data === 'object') {
      if (Array.isArray(payload.data[listField])) {
        return payload.data[listField].filter(hasValidId);
      }
      if (Array.isArray(payload.data)) {
        return payload.data.filter(hasValidId);
      }
    }
    if (hasValidId(payload)) {
      return [payload];
    }
  }

  return [];
}

instance.interceptors.request.use(async (config) => {
  if (isInviteRuntime() && !isInviteAllowedAPI(config.url)) {
    return Promise.reject({
      message: '1788 仅允许邀请页接口访问',
      code: 'INVITE_ONLY_API_BLOCKED',
      isInviteOnlyBlocked: true
    });
  }

  const token = getToken();
  if (token && !isInviteRuntime()) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // 检查网络状态
  const isOnline = getNetworkStatus();
  
  // 如果是写操作且断网，直接拒绝请求
  if (isWriteOperation(config) && !isOnline) {
    return Promise.reject({
      message: '网络连接已断开，无法执行此操作。请检查网络连接后重试。',
      code: 'NETWORK_ERROR',
      isNetworkError: true
    });
  }
  
  // 如果是读操作，先尝试从缓存读取（后台同时请求服务器更新）
  if (isReadOperation(config)) {
    const storeName = getCacheStoreName(config.url);
    if (storeName) {
      // 标记为缓存请求，在响应拦截器中处理
      config._useCache = true;
      config._cacheStore = storeName;
    }
  }

  // 写操作也标记缓存存储，便于成功后清理旧缓存
  if (!config._cacheStore && isWriteOperation(config)) {
    config._cacheStore = getCacheStoreName(config.url || '');
  }
  
  return config;
});

instance.interceptors.response.use(
  async (res) => {
    const config = res.config;
    
    // 如果是读操作，保存到缓存
    if (config._useCache && config._cacheStore) {
      const records = extractCacheRecords(config._cacheStore, res.data);
      await saveToCache(config._cacheStore, records);
    }
    
    // 如果是写操作成功，清空相关缓存（强制下次从服务器获取最新数据）
    if (isWriteOperation(config) && config._cacheStore) {
      await saveToCache(config._cacheStore, []);
    }
    
    return res;
  },
  async (error) => {
    const config = error.config;
    const status = error?.response?.status;
    const url = config?.url || config?.baseURL + config?.url || '';

    if (error?.isInviteOnlyBlocked) {
      return Promise.reject(error);
    }
    
    // 如果是读操作失败，尝试从缓存返回数据
    if (config?._useCache && config?._cacheStore) {
      const cachedData = await getFromCache(config._cacheStore);
      if (cachedData && cachedData.length > 0) {
        // 返回缓存数据，但标记为离线数据
        return {
          data: cachedData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          _fromCache: true,
          _networkError: true
        };
      }
    }
    
    // 如果是登录接口的403错误（密码错误限制），不跳转，让登录页面自己处理
    const isLoginApi = url.includes('/api/login') || url.includes('login');
    const is403 = status === 403;
    const is401 = status === 401;

    // 邀请运行态禁止自动跳登录页，避免 /download <-> /login 闪屏循环
    if (isInviteRuntime()) {
      return Promise.reject(error);
    }
    
    // 只有非登录接口的 401/403 错误才跳转
    if ((is401 || is403) && !isLoginApi) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_user');
      // 如果已经在登录页，不重复跳转
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // 如果是网络错误，添加标记
    if (!error.response && !error.isNetworkError) {
      error.isNetworkError = true;
      error.message = error.message || '网络连接失败，请检查网络连接';
    }
    
    return Promise.reject(error);
  }
);

export { baseURL };

export default instance;

