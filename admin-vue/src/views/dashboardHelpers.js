export function createDefaultImStats() {
  return {
    online: false,
    onlineUsers: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    dbSizeMB: 0,
    messageCount: 0,
    uptime: 0
  };
}

export function createDefaultStatsCards() {
  return [
    { label: '注册客户', value: '--', tag: '用户', desc: '平台总用户数' },
    { label: '总订单数', value: '--', tag: '订单', desc: '历史订单总量' },
    { label: '今日订单', value: '--', tag: '实时', desc: '今日累计' },
    { label: '员工总数', value: '--', tag: '员工', desc: '配送团队规模' },
    { label: '在线骑手', value: '--', tag: '在线', desc: '当前在线人数' },
    { label: '待接单', value: '--', tag: '待办', desc: '待接单' }
  ];
}

export function extractErrorMessage(error, fallback) {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;
}

export function normalizeRefreshMinutes(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 10;
  return Math.min(1440, Math.max(1, Math.floor(value)));
}

export function formatUptime(seconds) {
  if (!seconds) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}小时${m}分`;
  return `${m}分钟`;
}

export function getWeatherIconClass(icon) {
  if (!icon) return 'default';
  const iconMap = {
    '00': 'sunny',
    '01': 'sunny',
    '02': 'partly-cloudy',
    '03': 'cloudy',
    '04': 'cloudy',
    '07': 'rain',
    '08': 'rain',
    '09': 'rain',
    '10': 'rain-sun',
    '18': 'snow'
  };
  return iconMap[icon] || 'default';
}

export function getAqiClass(aqi) {
  const aqiNum = parseInt(aqi, 10);
  if (aqiNum <= 50) return 'aqi-excellent';
  if (aqiNum <= 100) return 'aqi-good';
  if (aqiNum <= 150) return 'aqi-moderate';
  if (aqiNum <= 200) return 'aqi-unhealthy';
  return 'aqi-very-unhealthy';
}

export function getAqiText(aqi) {
  const aqiNum = parseInt(aqi, 10);
  if (aqiNum <= 50) return '优';
  if (aqiNum <= 100) return '良';
  if (aqiNum <= 150) return '轻度污染';
  if (aqiNum <= 200) return '中度污染';
  return '重度污染';
}

export function formatUpdateTime(timeStr) {
  if (!timeStr) return '';
  try {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);

    if (diff < 1) return '刚刚更新';
    if (diff < 60) return `${diff}分钟前`;

    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours}小时前`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours2 = String(date.getHours()).padStart(2, '0');
    const minutes2 = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours2}:${minutes2}`;
  } catch (error) {
    return timeStr;
  }
}

export function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
}

export function getRankName(level) {
  const ranks = {
    1: '青铜骑士',
    2: '白银骑士',
    3: '黄金骑士',
    4: '钻石骑士',
    5: '王者骑士',
    6: '传奇大佬'
  };
  return ranks[level] || '青铜骑士';
}

export function getRankType(level) {
  if (level >= 6) return 'danger';
  if (level >= 5) return 'warning';
  if (level >= 4) return 'success';
  if (level >= 3) return 'primary';
  return 'info';
}
