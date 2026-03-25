export function getToken() {
  return localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
}

export function getCurrentPort() {
  if (typeof window === 'undefined' || !window.location) {
    return '';
  }
  const port = window.location.port;
  if (port) {
    return port;
  }
  return window.location.protocol === 'https:' ? '443' : '80';
}

export function isInviteRuntime() {
  const envInviteOnly = typeof import.meta !== 'undefined'
    && import.meta.env
    && import.meta.env.VITE_INVITE_ONLY === 'true';
  if (envInviteOnly) {
    return true;
  }
  return getCurrentPort() === '1788';
}
