<template>
  <view class="page errand-home">
    <PageHeader :title="pageTitle" />

    <scroll-view scroll-y class="content">
      <view class="hero-card">
        <text class="hero-title">{{ heroTitle }}</text>
        <text class="hero-desc">{{ heroDesc }}</text>
      </view>

      <view v-if="!featureEnabled" class="empty-card">
        <text class="empty-title">当前服务暂未开放</text>
        <text class="empty-desc">跑腿服务已在后台关闭，请稍后再试</text>
      </view>

      <view v-else class="service-list">
        <view
          v-for="item in services"
          :key="item.id"
          class="service-item"
          @tap="goService(item)"
        >
          <view class="service-icon" :style="{ background: item.color }">
            <text>{{ item.icon }}</text>
          </view>
          <view class="service-info">
            <text class="service-name">{{ item.name }}</text>
            <text class="service-desc">{{ item.desc }}</text>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>

      <view class="recent-section">
        <view class="section-head">
          <text class="section-title">最近订单</text>
          <text v-if="loadingRecent" class="section-meta">加载中...</text>
        </view>

        <view v-if="recentOrders.length === 0" class="empty-card">
          <text class="empty-title">还没有跑腿订单</text>
          <text class="empty-desc">下单后会在这里显示最近记录</text>
        </view>

        <view
          v-for="order in recentOrders"
          :key="order.id"
          class="recent-item"
          @tap="goOrderDetail(order)"
        >
          <view class="recent-main">
            <text class="recent-service">{{ order.serviceName }}</text>
            <text class="recent-item-text">{{ order.item }}</text>
          </view>
          <view class="recent-side">
            <text class="recent-status">{{ order.status }}</text>
            <text class="recent-price">¥{{ formatPrice(order.totalPrice) }}</text>
          </view>
        </view>
      </view>

      <view v-if="featureEnabled && detailTip" class="detail-tip">
        <text>{{ detailTip }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { fetchOrders } from "@/shared-ui/api.js";
import {
  isRuntimeRouteEnabled,
  loadPlatformRuntimeSettings,
} from "@/shared-ui/platform-runtime.js";
import PageHeader from "./PageHeader.vue";
import { createErrandHomePage } from "./consumer-errand-home.js";

export default createErrandHomePage({
  fetchOrders,
  loadPlatformRuntimeSettings,
  isRuntimeRouteEnabled,
  components: { PageHeader },
});
</script>

<style scoped lang="scss" src="./errand-home-page.scss"></style>
