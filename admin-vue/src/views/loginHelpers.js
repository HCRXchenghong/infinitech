const PHONE_REGEX = /^1[3-9]\d{9}$/;

export function createDefaultLoginForm() {
  const stored = localStorage.getItem('admin_remember_me') || sessionStorage.getItem('admin_remember_me');
  const rememberMe = stored === null ? true : stored === 'true';

  return {
    phone: '',
    password: '',
    code: '',
    rememberMe
  };
}

export function isValidPhone(phone) {
  return PHONE_REGEX.test(String(phone || ''));
}

export function getErrorText(error) {
  const responseData = error?.response?.data;
  if (responseData && typeof responseData === 'object' && responseData.error) {
    return String(responseData.error);
  }
  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData.trim();
  }
  return String(error?.message || '');
}

export function isMissingQrRoute(error) {
  const statusCode = Number(error?.response?.status || 0);
  if (statusCode !== 404) {
    return false;
  }

  const text = getErrorText(error).toLowerCase();
  return text.includes('cannot post /api/qr-login/session')
    || text.includes('cannot get /api/qr-login/session')
    || text.includes('cannot get /api/verify-token');
}

export function getQrFlowErrorMessage(error) {
  if (isMissingQrRoute(error)) {
    return '扫码登录接口不存在（404），请重启 BFF 服务并确认已部署最新代码';
  }
  const text = getErrorText(error);
  return text || '二维码加载失败';
}
