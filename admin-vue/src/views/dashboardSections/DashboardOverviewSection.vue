<template>
  <div class="grid">
    <div v-if="weatherData.available" class="weather-card">
      <div class="weather-header">
        <div class="weather-icon-wrapper">
          <div class="weather-icon" :class="getWeatherIconClass(weatherData.weather_icon)">
            <span class="weather-temp" style="font-size: 24px; margin: 0;">{{ weatherIconText }}</span>
          </div>
        </div>
        <div class="weather-info">
          <div class="weather-city">{{ weatherData.city_name || '当前城市' }}</div>
          <div class="weather-temp">{{ weatherTemperatureText }}</div>
          <div class="weather-desc">{{ weatherData.weather_main || '天气数据已同步' }}</div>
        </div>
      </div>

      <div class="weather-details">
        <div class="weather-detail-item">
          <span class="detail-label">湿度</span>
          <span class="detail-value">{{ weatherHumidityText }}</span>
        </div>
        <div v-if="weatherData.feels_like !== undefined" class="weather-detail-item">
          <span class="detail-label">体感温度</span>
          <span class="detail-value">{{ weatherData.feels_like }} °C</span>
        </div>
        <div v-if="weatherData.visibility !== undefined" class="weather-detail-item">
          <span class="detail-label">能见度</span>
          <span class="detail-value">{{ weatherData.visibility }} km</span>
        </div>
        <div v-if="weatherData.wind_direct || weatherData.wind_speed" class="weather-detail-item">
          <span class="detail-label">风力</span>
          <span class="detail-value">{{ weatherWindText }}</span>
        </div>
        <div v-if="weatherData.aqi" class="weather-detail-item">
          <span class="detail-label">空气质量</span>
          <span class="detail-value" :class="getAqiClass(weatherData.aqi)">
            {{ getAqiText(weatherData.aqi) }}
          </span>
        </div>
        <div class="weather-detail-item">
          <span class="detail-label">刷新周期</span>
          <span class="detail-value">{{ weatherConfig.refresh_interval_minutes || 10 }} 分钟</span>
        </div>
      </div>

      <div class="weather-meta">
        <div class="weather-update-time">
          <span class="update-label">更新时间</span>
          <span class="update-value">
            {{ weatherData.updated_at ? formatUpdateTime(weatherData.updated_at) : '暂无' }}
          </span>
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
      <div v-for="card in statsCards" :key="card.key" class="holo-card">
        <div class="card-top">
          <div class="label">{{ card.label }}</div>
          <div class="tag">{{ card.tag }}</div>
        </div>
        <div class="number">{{ card.value }}</div>
        <div class="desc">{{ card.desc }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  weatherData: {
    type: Object,
    required: true,
  },
  weatherConfig: {
    type: Object,
    required: true,
  },
  weatherIconText: {
    type: String,
    default: '晴',
  },
  weatherTemperatureText: {
    type: String,
    default: '--',
  },
  weatherHumidityText: {
    type: String,
    default: '--',
  },
  weatherWindText: {
    type: String,
    default: '--',
  },
  forecastList: {
    type: Array,
    default: () => [],
  },
  hourlyList: {
    type: Array,
    default: () => [],
  },
  minutelyList: {
    type: Array,
    default: () => [],
  },
  lifeIndexEntries: {
    type: Array,
    default: () => [],
  },
  getWeatherIconClass: {
    type: Function,
    required: true,
  },
  getAqiClass: {
    type: Function,
    required: true,
  },
  getAqiText: {
    type: Function,
    required: true,
  },
  formatUpdateTime: {
    type: Function,
    required: true,
  },
  statsCards: {
    type: Array,
    default: () => [],
  },
})
</script>
