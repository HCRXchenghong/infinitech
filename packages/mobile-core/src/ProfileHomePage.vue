<template>
  <view class="page profile-page">
    <view class="user-header" :style="headerStyle">
      <view class="user-info" @tap="goEditProfile">
        <view class="avatar-wrapper">
          <image
            :src="avatarUrl || '/static/images/my-avatar.svg'"
            mode="aspectFill"
            class="avatar-img"
          />
        </view>

        <view class="info-wrapper">
          <view class="name-row">
            <text class="nickname">{{ displayName }}</text>
            <view v-if="isVip" class="vip-badge">
              <image src="/static/icons/crown.svg" mode="aspectFit" class="crown-icon" />
              <text>{{ vipLabel }}</text>
            </view>
          </view>
          <view class="phone-row" @tap.stop="goChangePhone">
            <text class="phone">{{ phoneMasked }}</text>
            <text class="arrow">></text>
          </view>
        </view>
      </view>
    </view>

    <view class="vip-card" @tap="goVip">
      <view class="vip-bg-circle"></view>
      <view class="vip-content">
        <view class="vip-left">
          <view class="vip-title">
            <image src="/static/icons/crown.svg" mode="aspectFit" class="vip-crown" />
            <text>会员中心</text>
          </view>
          <text class="vip-desc">本月已省 {{ savedAmountText }}</text>
        </view>
        <view class="vip-btn">
          <text>查看详情</text>
        </view>
      </view>
    </view>

    <view class="asset-tools-section">
      <view class="asset-item" @tap="goWallet">
        <view class="asset-icon">
          <image src="/static/icons/wallet.svg" mode="aspectFit" />
        </view>
        <text class="asset-label">我的资产</text>
      </view>

      <view
        v-for="item in tools"
        :key="item.label"
        class="tool-item"
        @tap="go(item.path)"
      >
        <view class="tool-icon" :class="item.colorClass">
          <image :src="item.icon" mode="aspectFit" />
        </view>
        <text class="tool-label">{{ item.label }}</text>
      </view>
    </view>

    <view class="menu-section">
      <view
        v-for="item in moreEntries"
        :key="item.label"
        class="line-card"
        @tap="go(item.path)"
      >
        <view class="line-left">
          <view class="line-icon">
            <image :src="item.icon" mode="aspectFit" />
          </view>
          <text class="line-label">{{ item.label }}</text>
        </view>
        <text class="line-arrow">></text>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchUser } from "@/shared-ui/api.js";
import { createProfileHomePage } from "./profile-home.js";

export default createProfileHomePage({
  fetchUser,
});
</script>

<style scoped lang="scss" src="./profile-home-page.scss"></style>
