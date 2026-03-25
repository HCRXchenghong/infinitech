<template>
  <div class="page">
    <div class="grid">
      <!-- 天气卡片 -->
      <div v-if="weatherData.available" class="weather-card">
        <div class="weather-header">
          <div class="weather-icon-wrapper">
            <div class="weather-icon" :class="getWeatherIconClass(weatherData.weather_icon)">
              <svg v-if="weatherData.weather_icon === '00'" viewBox="0 0 64 64" class="icon-svg">
                <circle cx="32" cy="32" r="16" fill="#FFD700" opacity="0.95"/>
                <circle cx="32" cy="32" r="12" fill="#FFA500"/>
              </svg>
              <svg v-else-if="weatherData.weather_icon === '01'" viewBox="0 0 64 64" class="icon-svg">
                <circle cx="28" cy="28" r="10" fill="#FFD700" opacity="0.6"/>
                <ellipse cx="38" cy="30" rx="12" ry="8" fill="#C0C0C0" opacity="0.8"/>
                <ellipse cx="45" cy="28" rx="10" ry="6" fill="#A0A0A0" opacity="0.7"/>
              </svg>
              <svg v-else-if="weatherData.weather_icon === '02'" viewBox="0 0 64 64" class="icon-svg">
                <ellipse cx="25" cy="28" rx="14" ry="9" fill="#B0B0B0" opacity="0.8"/>
                <ellipse cx="35" cy="26" rx="12" ry="7" fill="#909090" opacity="0.9"/>
                <ellipse cx="45" cy="30" rx="10" ry="6" fill="#A0A0A0" opacity="0.7"/>
              </svg>
              <svg v-else-if="weatherData.weather_icon === '03' || weatherData.weather_icon === '04'" viewBox="0 0 64 64" class="icon-svg">
                <ellipse cx="30" cy="25" rx="12" ry="8" fill="#808080" opacity="0.8"/>
                <path d="M22 42 L28 36 L32 40 L40 30 L40 50 L22 50 Z" fill="#4A90E2" opacity="0.7"/>
                <line x1="25" y1="38" x2="25" y2="50" stroke="#4A90E2" stroke-width="2"/>
                <line x1="30" y1="38" x2="30" y2="50" stroke="#4A90E2" stroke-width="2"/>
                <line x1="35" y1="38" x2="35" y2="50" stroke="#4A90E2" stroke-width="2"/>
                <path v-if="weatherData.weather_icon === '04'" d="M38 20 L42 18 L40 22 L44 24 L40 24 L42 28 L38 26 L36 30 L34 26 L30 28 L32 24 L28 24 L32 22 L30 18 L34 20 Z" fill="#FFD700" stroke="#FFA500" stroke-width="1"/>
              </svg>
              <svg v-else-if="['07', '08', '09', '10', '11', '12'].includes(weatherData.weather_icon)" viewBox="0 0 64 64" class="icon-svg">
                <ellipse cx="32" cy="24" rx="14" ry="9" fill="#808080" opacity="0.8"/>
                <path d="M18 45 L26 38 L30 42 L42 30 L42 52 L18 52 Z" fill="#4A90E2" opacity="0.7"/>
                <line x1="22" y1="40" x2="22" y2="52" stroke="#4A90E2" stroke-width="2"/>
                <line x1="28" y1="40" x2="28" y2="52" stroke="#4A90E2" stroke-width="2"/>
                <line x1="34" y1="40" x2="34" y2="52" stroke="#4A90E2" stroke-width="2"/>
                <line x1="38" y1="40" x2="38" y2="52" stroke="#4A90E2" stroke-width="2"/>
              </svg>
              <svg v-else-if="['13', '14', '15', '16', '17'].includes(weatherData.weather_icon)" viewBox="0 0 64 64" class="icon-svg">
                <ellipse cx="32" cy="24" rx="14" ry="9" fill="#C0C0C0" opacity="0.8"/>
                <circle cx="24" cy="42" r="3" fill="#E0E0E0" opacity="0.9"/>
                <circle cx="32" cy="40" r="4" fill="#E0E0E0" opacity="0.9"/>
                <circle cx="40" cy="44" r="3" fill="#E0E0E0" opacity="0.9"/>
                <circle cx="28" cy="48" r="2.5" fill="#E0E0E0" opacity="0.9"/>
                <circle cx="36" cy="50" r="3" fill="#E0E0E0" opacity="0.9"/>
              </svg>
              <svg v-else-if="weatherData.weather_icon === '18'" viewBox="0 0 64 64" class="icon-svg">
                <ellipse cx="32" cy="28" rx="14" ry="9" fill="#D0D0D0" opacity="0.6"/>
                <ellipse cx="25" cy="38" rx="10" ry="4" fill="#E0E0E0" opacity="0.7"/>
                <ellipse cx="40" cy="40" rx="8" ry="3" fill="#E0E0E0" opacity="0.7"/>
                <ellipse cx="30" cy="46" rx="12" ry="4" fill="#E0E0E0" opacity="0.6"/>
              </svg>
              <svg v-else viewBox="0 0 64 64" class="icon-svg">
                <ellipse cx="25" cy="28" rx="14" ry="9" fill="#B0B0B0" opacity="0.8"/>
                <ellipse cx="35" cy="26" rx="12" ry="7" fill="#909090" opacity="0.9"/>
                <ellipse cx="45" cy="30" rx="10" ry="6" fill="#A0A0A0" opacity="0.7"/>
              </svg>
            </div>
          </div>
          <div class="weather-info">
            <div class="weather-city">{{ weatherData.city_name }}</div>
            <div class="weather-temp">{{ weatherData.temperature }}°C</div>
            <div class="weather-desc">{{ weatherData.weather_main }}</div>
          </div>
        </div>
        <div class="weather-details">
          <div class="weather-detail-item">
            <span class="detail-label">湿度</span>
            <span class="detail-value">{{ weatherData.humidity }}%</span>
          </div>
          <div class="weather-detail-item" v-if="weatherData.feels_like !== undefined">
            <span class="detail-label">体感温度</span>
            <span class="detail-value">{{ weatherData.feels_like }}°C</span>
          </div>
          <div class="weather-detail-item" v-if="weatherData.visibility !== undefined">
            <span class="detail-label">能见度</span>
            <span class="detail-value">{{ weatherData.visibility }}km</span>
          </div>
          <div class="weather-detail-item" v-if="weatherData.wind_direct || weatherData.wind_speed">
            <span class="detail-label">风力</span>
            <span class="detail-value">{{ weatherData.wind_direct || '' }}{{ weatherData.wind_speed ? weatherData.wind_speed + '级' : '' }}</span>
          </div>
          <div class="weather-detail-item" v-if="weatherData.aqi">
            <span class="detail-label">空气质量</span>
            <span class="detail-value" :class="getAqiClass(weatherData.aqi)">{{ getAqiText(weatherData.aqi) }}</span>
          </div>
        </div>
        <div class="weather-meta">
          <div class="weather-update-time" v-if="weatherData.updated_at">
            <span class="update-label">更新时间</span>
            <span class="update-value">{{ formatUpdateTime(weatherData.updated_at) }}</span>
          </div>
          <div class="weather-update-time">
            <span class="update-label">刷新周期</span>
            <span class="update-value">{{ weatherConfig.refresh_interval_minutes || 10 }} 分钟</span>
          </div>
          <div class="weather-extended">
            <div class="weather-extended-item">预报天数：{{ forecastList.length }}</div>
            <div class="weather-extended-item">逐小时：{{ hourlyList.length }}</div>
            <div class="weather-extended-item">分钟降水：{{ minutelyList.length }}</div>
            <div class="weather-extended-item">生活指数：{{ lifeIndexEntries.length }}</div>
          </div>
        </div>
      </div>

      <div class="stats-row">
        <div class="holo-card" v-for="card in statsCards" :key="card.label">
          <div class="card-top">
            <div class="label">{{ card.label }}</div>
            <div class="tag">{{ card.tag }}</div>
          </div>
          <div class="number">{{ card.value }}</div>
          <div class="desc">{{ card.desc }}</div>
        </div>
      </div>
    </div>
    <PageStateAlert :message="loadError" />

    <!-- 即时通讯状态 -->
    <div class="im-status-row">
      <div class="im-card" :class="{ 'im-online': imStats.online, 'im-offline': !imStats.online }">
        <div class="im-info">
          <div class="im-label">即时通讯服务</div>
          <div class="im-value">{{ imStats.online ? '在线运行' : '离线' }}</div>
          <div class="im-detail">在线用户 {{ imStats.onlineUsers }} 人 · 消息 {{ imStats.messageCount }} 条</div>
        </div>
      </div>
      <div class="im-card">
        <div class="im-info">
          <div class="im-label">服务器负载</div>
          <div class="im-value">CPU {{ imStats.cpuUsage }}%</div>
          <div class="im-progress">
            <div class="im-progress-bar" :style="{ width: imStats.cpuUsage + '%', background: imStats.cpuUsage > 80 ? '#ff4d4f' : '#0097ff' }"></div>
          </div>
        </div>
      </div>
      <div class="im-card">
        <div class="im-info">
          <div class="im-label">内存占用</div>
          <div class="im-value">{{ imStats.memoryUsage }}%</div>
          <div class="im-progress">
            <div class="im-progress-bar" :style="{ width: imStats.memoryUsage + '%', background: imStats.memoryUsage > 80 ? '#ff4d4f' : '#52c41a' }"></div>
          </div>
        </div>
      </div>
      <div class="im-card">
        <div class="im-info">
          <div class="im-label">数据库</div>
          <div class="im-value">{{ imStats.dbSizeMB }} MB</div>
          <div class="im-detail">运行 {{ formatUptime(imStats.uptime) }}</div>
        </div>
      </div>
    </div>

    <div class="rank-row">
      <div class="panel rank-panel">
        <div class="panel-title">
          <span>用户消费排名</span>
          <div class="panel-actions">
            <el-radio-group v-model="userTab" size="small" @change="loadOrders">
              <el-radio-button value="week">周榜</el-radio-button>
              <el-radio-button value="month">月榜</el-radio-button>
            </el-radio-group>
            <el-button size="small" @click="refreshData" :loading="loading">刷新</el-button>
          </div>
        </div>
        <el-table :data="userRanks[userTab]" size="small" stripe>
          <el-table-column type="index" label="排名" width="70" />
          <el-table-column prop="name" label="用户" />
          <el-table-column prop="value" :label="userRankType === 'amount' ? '消费金额' : '下单次数'" width="120" align="right">
            <template #default="{ row }">
              <span v-if="userRankType === 'amount'">¥{{ row.value }}</span>
              <span v-else>{{ row.value }}</span>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="rankError ? '加载失败，暂无可显示数据' : '暂无用户排名数据'" :image-size="90" />
          </template>
        </el-table>
      </div>

      <div class="panel rank-panel">
        <div class="panel-title">
          <span>骑手送单排名</span>
          <div class="panel-actions">
            <el-radio-group v-model="riderTab" size="small" @change="loadOrders">
              <el-radio-button value="week">周榜</el-radio-button>
              <el-radio-button value="month">月榜</el-radio-button>
            </el-radio-group>
            <el-button size="small" @click="refreshData" :loading="loading">刷新</el-button>
          </div>
        </div>
        <el-table :data="displayedRiderRanks" size="small" stripe>
          <el-table-column type="index" label="排名" width="70" />
          <el-table-column prop="name" label="骑手" />
          <el-table-column prop="level" label="段位" width="120">
            <template #default="{ row }">
              <el-tag :type="getRankType(row.level)" size="small">{{ getRankName(row.level) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="value" label="送单次数" width="120" />
          <template #empty>
            <el-empty :description="rankError ? '加载失败，暂无可显示数据' : '暂无骑手排名数据'" :image-size="90" />
          </template>
        </el-table>
        <div v-if="allRiderRanks[riderTab] && allRiderRanks[riderTab].length > 10" class="panel-footer">
          <el-button type="primary" link @click="viewAllRiders">查看全部（{{ allRiderRanks[riderTab].length }}）</el-button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import request from '@/utils/request';
import socketService, { SOCKET_HTTP_BASE } from '@/utils/socket';
import PageStateAlert from '@/components/PageStateAlert.vue';
import {
  createDefaultImStats,
  createDefaultStatsCards,
  extractErrorMessage,
  normalizeRefreshMinutes,
  formatUptime,
  getWeatherIconClass,
  getAqiClass,
  getAqiText,
  formatUpdateTime,
  formatNumber,
  getRankName,
  getRankType
} from './dashboardHelpers';

const router = useRouter();

const imStats = ref(createDefaultImStats());

let imSocket = null;

const statsCards = ref(createDefaultStatsCards());

const userTab = ref('week');
const riderTab = ref('week');
const userRankType = ref('amount');
const userRanks = ref({ week: [], month: [] });
const allRiderRanks = ref({ week: [], month: [] });
const loading = ref(false);
const weatherData = ref({ available: false });
const weatherConfig = ref({ refresh_interval_minutes: 10 });
const weatherError = ref('');
const statsError = ref('');
const rankError = ref('');
const loadError = computed(() => rankError.value || statsError.value || weatherError.value || '');

const statsCache = ref(null);
const ranksCache = ref(new Map());
const weatherCache = ref(null);
const cacheTimestamp = ref({ stats: 0, weather: 0 });
const STATS_CACHE_DURATION = 30000;
const weatherCacheDurationMs = ref(10 * 60 * 1000);
let weatherTimer = null;

const displayedRiderRanks = computed(() => {
  const ranks = allRiderRanks.value[riderTab.value] || [];
  return ranks.slice(0, 10);
});
const lifeIndexEntries = computed(() => Object.entries(weatherData.value?.life_indices || {}));
const forecastList = computed(() => Array.isArray(weatherData.value?.forecast) ? weatherData.value.forecast : []);
const hourlyList = computed(() => Array.isArray(weatherData.value?.hourly_forecast) ? weatherData.value.hourly_forecast : []);
const minutelyList = computed(() => Array.isArray(weatherData.value?.minutely_precip?.data) ? weatherData.value.minutely_precip.data : []);

function resetWeatherTimer() {
  if (weatherTimer) {
    clearInterval(weatherTimer);
    weatherTimer = null;
  }
  weatherTimer = setInterval(() => {
    loadWeather(true);
  }, weatherCacheDurationMs.value);
}

async function loadWeatherConfig() {
  try {
    const { data } = await request.get('/api/weather-config');
    const refreshMinutes = normalizeRefreshMinutes(data?.refresh_interval_minutes);
    weatherConfig.value = { ...(data || {}), refresh_interval_minutes: refreshMinutes };
    weatherCacheDurationMs.value = refreshMinutes * 60 * 1000;
    resetWeatherTimer();
  } catch (e) {
    weatherConfig.value.refresh_interval_minutes = 10;
    weatherCacheDurationMs.value = 10 * 60 * 1000;
    resetWeatherTimer();
  }
}

function viewAllRiders() {
  router.push({
    path: '/rider-ranks',
    query: { period: riderTab.value }
  });
}

async function connectImStats() {
  try {
    imSocket = await socketService.connect('/monitor');
    imSocket.emit('join_monitor', { userId: 'admin' });
    imSocket.on('server_stats', (data) => {
      imStats.value = { ...imStats.value, ...data };
    });
    // 初始加载一次
    const res = await fetch(`${SOCKET_HTTP_BASE}/api/stats`);
    const data = await res.json();
    imStats.value = { ...imStats.value, ...data };
  } catch (e) {
    imStats.value.online = false;
  }
}

onMounted(async () => {
  await loadWeatherConfig();
  await refreshData();
  connectImStats();
});

onUnmounted(() => {
  if (imSocket) {
    imSocket.off('server_stats');
  }
  if (weatherTimer) {
    clearInterval(weatherTimer);
    weatherTimer = null;
  }
});

async function refreshData() {
  await loadWeatherConfig();
  weatherError.value = '';
  statsError.value = '';
  rankError.value = '';
  statsCache.value = null;
  weatherCache.value = null;
  ranksCache.value.clear();
  cacheTimestamp.value = { stats: 0, weather: 0 };
  await Promise.all([loadStats(true), loadOrders(true), loadWeather(true)]);
}

async function loadWeather(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && weatherCache.value && (now - cacheTimestamp.value.weather) < weatherCacheDurationMs.value) {
    weatherError.value = '';
    weatherData.value = weatherCache.value;
    return;
  }

  try {
    weatherError.value = '';
    const { data } = await request.get('/api/weather');
    weatherData.value = data || { available: false };
    weatherCache.value = weatherData.value;
    cacheTimestamp.value.weather = now;
  } catch (e) {
    weatherError.value = extractErrorMessage(e, '加载天气数据失败，请稍后重试');
    weatherData.value = { available: false };
  }
}

async function loadStats(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && statsCache.value && (now - cacheTimestamp.value.stats) < STATS_CACHE_DURATION) {
    statsError.value = '';
    statsCards.value = statsCache.value;
    return;
  }

  try {
    statsError.value = '';
    const { data: stats } = await request.get('/api/stats');
    if (stats) {
      const cards = [...statsCards.value];
      const customerCard = cards.find(c => c.label === '注册客户');
      const totalOrdersCard = cards.find(c => c.label === '总订单数');
      const todayOrdersCard = cards.find(c => c.label === '今日订单');
      const riderCard = cards.find(c => c.label === '员工总数');
      const onlineRiderCard = cards.find(c => c.label === '在线骑手');
      const pendingCard = cards.find(c => c.label === '待接单');

      if (customerCard) customerCard.value = formatNumber(stats.customerCount || 0);
      if (totalOrdersCard) totalOrdersCard.value = formatNumber(stats.totalOrders || 0);
      if (todayOrdersCard) todayOrdersCard.value = formatNumber(stats.todayOrders || 0);
      if (riderCard) riderCard.value = formatNumber(stats.riderCount || 0);
      if (onlineRiderCard) onlineRiderCard.value = formatNumber(stats.onlineRiderCount || 0);
      if (pendingCard) pendingCard.value = formatNumber(stats.pendingOrdersCount || 0);

      statsCards.value = cards;
      statsCache.value = cards;
      cacheTimestamp.value.stats = now;
    }
  } catch (e) {
    statsError.value = extractErrorMessage(e, '加载统计数据失败，请稍后重试');
  }
}

async function loadOrders(forceRefresh = false) {
  const cacheKey = `${userTab.value}-${riderTab.value}`;

  if (!forceRefresh && ranksCache.value.has(cacheKey)) {
    rankError.value = '';
    const cached = ranksCache.value.get(cacheKey);
    userRanks.value = cached.userRanks;
    allRiderRanks.value = cached.allRiderRanks;
    return;
  }

  rankError.value = '';
  loading.value = true;
  try {
    const [weekUserRes, monthUserRes, weekRiderRes, monthRiderRes] = await Promise.allSettled([
      request.get('/api/user-ranks?period=week&type=amount'),
      request.get('/api/user-ranks?period=month&type=amount'),
      request.get('/api/rider-ranks?period=week'),
      request.get('/api/rider-ranks?period=month')
    ]);

    const hasFailure = [weekUserRes, monthUserRes, weekRiderRes, monthRiderRes].some((item) => item.status === 'rejected');
    if (hasFailure) {
      rankError.value = '部分排名数据加载失败，请稍后重试';
    }

    userRanks.value = {
      week: weekUserRes.status === 'fulfilled' && Array.isArray(weekUserRes.value?.data) ? weekUserRes.value.data : [],
      month: monthUserRes.status === 'fulfilled' && Array.isArray(monthUserRes.value?.data) ? monthUserRes.value.data : []
    };
    allRiderRanks.value = {
      week: weekRiderRes.status === 'fulfilled' && Array.isArray(weekRiderRes.value?.data) ? weekRiderRes.value.data : [],
      month: monthRiderRes.status === 'fulfilled' && Array.isArray(monthRiderRes.value?.data) ? monthRiderRes.value.data : []
    };

    ranksCache.value.set(cacheKey, {
      userRanks: { ...userRanks.value },
      allRiderRanks: { ...allRiderRanks.value }
    });

    if (ranksCache.value.size > 10) {
      const firstKey = ranksCache.value.keys().next().value;
      ranksCache.value.delete(firstKey);
    }
  } catch (e) {
    rankError.value = extractErrorMessage(e, '加载排名数据失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

</script>

<style scoped lang="css" src="./Dashboard.css"></style>
