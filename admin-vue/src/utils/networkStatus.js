/**
 * 网络状态检测工具
 */

let isOnline = navigator.onLine;
let listeners = [];

// 监听网络状态变化
window.addEventListener('online', () => {
  isOnline = true;
  notifyListeners(true);
});

window.addEventListener('offline', () => {
  isOnline = false;
  notifyListeners(false);
});

function notifyListeners(status) {
  listeners.forEach(listener => {
    try {
      listener(status);
    } catch (error) {
      console.error('网络状态监听器错误:', error);
    }
  });
}

// 订阅网络状态变化
export function onNetworkStatusChange(callback) {
  listeners.push(callback);
  // 立即调用一次，返回当前状态
  callback(isOnline);
  
  // 返回取消订阅函数
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

// 获取当前网络状态
export function getNetworkStatus() {
  return isOnline;
}

// 检测服务器连接（通过 ping 一个轻量级接口）
export async function checkServerConnection(baseURL) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const normalized = baseURL.replace(/\/$/, '');
    const healthURL = normalized.endsWith('/api')
      ? `${normalized.replace(/\/api$/, '')}/health`
      : `${normalized}/health`;

    const response = await fetch(healthURL, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json, text/plain;q=0.9, */*;q=0.8'
      }
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

