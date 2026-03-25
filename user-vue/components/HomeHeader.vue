<template>
  <view class="home-header">
    <view class="location-row">
      <view class="location-left" @tap="handleLocation">
        <text class="location-text">{{ address }}</text>
        <text class="location-arrow">▾</text>
      </view>
      <view class="weather-tag" @tap.stop="handleWeather">
        <text>{{ weather }}</text>
      </view>
    </view>
    <view class="search-row" @tap="handleSearch">
      <image class="search-icon" src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%239ca3af%22%3E%3Cpath%20d%3D%22M15.5%2014h-.79l-.28-.27A6.471%206.471%200%200%200%2016%209.5%206.5%206.5%200%201%200%209.5%2016c1.61%200%203.09-.59%204.23-1.57l.27.28v.79l5%204.99L20.49%2019l-4.99-5zm-6%200C7.01%2014%205%2011.99%205%209.5S7.01%205%209.5%205%2014%207.01%2014%209.5%2011.99%2014%209.5%2014z%22%2F%3E%3C%2Fsvg%3E" mode="aspectFit" />
      <text class="search-placeholder">{{ placeholder }}</text>
      <view class="search-btn">
        <text>搜索</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    address: String,
    weather: String,
    placeholder: String
  },
  methods: {
    handleLocation() {
      this.$emit('location')
    },
    handleWeather() {
      this.$emit('weather')
    },
    handleSearch() {
      this.$emit('search')
    }
  }
}
</script>

<style scoped lang="scss">
.home-header {
  position: relative;
  z-index: 100;
  padding-top: calc(env(safe-area-inset-top, 0px) + 40px);
  padding-left: 16px;
  padding-right: 16px;
  padding-bottom: 40px;
  background: linear-gradient(180deg, #009bf5 0%, #0088d9 100%);
  color: #fff;
  border-radius: 0 0 24px 24px;
}

.location-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.location-left {
  display: flex;
  align-items: center;
  max-width: 70%;
}

.location-text {
  max-width: 100%;
  font-weight: 700;
  font-size: 18px;
  margin-right: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.location-arrow {
  font-size: 14px;
  opacity: 0.9;
  margin-right: 8px;
}

.weather-tag {
  display: flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  font-size: 13px;
  font-weight: 600;
}

.search-row {
  padding: 8px 12px;
  border-radius: 20px;
  background: #fff;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 155, 245, 0.1);
}

.search-icon {
  width: 18px;
  height: 18px;
  margin-right: 8px;
  opacity: 0.6;
}

.search-placeholder {
  color: #9ca3af;
  font-size: 14px;
  flex: 1;
}

.search-btn {
  padding: 6px 16px;
  border-radius: 16px;
  background: linear-gradient(90deg, #009bf5, #0081cc);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}
</style>
