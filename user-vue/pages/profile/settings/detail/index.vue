<template>
  <view class="page settings-detail-page">
    <view class="page-header">
      <view class="nav-left" @tap="back">
        <image src="/static/icons/arrow-left.svg" mode="aspectFit" class="nav-icon" />
      </view>
      <view class="nav-title">
        <text>更多设置</text>
      </view>
      <view class="nav-right" />
    </view>

    <scroll-view scroll-y class="scroll-content">
      <view class="section">
        <view class="section-title">账号与安全</view>
        <view class="card">
          <view class="row arrow" @tap="goToPage('/pages/profile/edit/index')">
            <view class="row-left">
              <image src="/static/icons/people.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">个人资料管理</text>
            </view>
            <view class="row-right">
              <text class="row-value">{{ nickname }}</text>
              <text class="arrow-icon">></text>
            </view>
          </view>
          <view class="row arrow" @tap="goToPage('/pages/profile/phone-change/index')">
            <view class="row-left">
              <image src="/static/icons/phone.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">手机号换绑</text>
            </view>
            <view class="row-right">
              <text class="row-value">{{ phoneMasked }}</text>
              <text class="arrow-icon">></text>
            </view>
          </view>
          <view class="row arrow" @tap="goToPage('/pages/auth/reset-password/index')">
            <view class="row-left">
              <image src="/static/icons/card.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">登录密码</text>
            </view>
            <view class="row-right">
              <text class="row-value">定期更新更安全</text>
              <text class="arrow-icon">></text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">通知与提醒</view>
        <view class="card">
          <view class="row between">
            <view class="row-left">
              <image src="/static/icons/bell.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">订单通知</text>
            </view>
            <switch :checked="settings.orderNotice" @change="toggleSetting('orderNotice', $event)" color="#0095ff" />
          </view>
          <view class="row between">
            <view class="row-left">
              <image src="/static/icons/gift.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">活动通知</text>
            </view>
            <switch :checked="settings.marketingNotice" @change="toggleSetting('marketingNotice', $event)" color="#0095ff" />
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">隐私与权限</view>
        <view class="card">
          <view class="row between">
            <view class="row-left">
              <image src="/static/icons/map-pin.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">定位服务</text>
            </view>
            <switch :checked="settings.location" @change="toggleSetting('location', $event)" color="#0095ff" />
          </view>
          <view class="row between">
            <view class="row-left">
              <image src="/static/icons/sparkle.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">个性化推荐</text>
            </view>
            <switch :checked="settings.personalized" @change="toggleSetting('personalized', $event)" color="#0095ff" />
          </view>
          <view class="row arrow" @tap="showPrivacy">
            <view class="row-left">
              <image src="/static/icons/shield.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">隐私政策</text>
            </view>
            <view class="row-right">
              <text class="arrow-icon">></text>
            </view>
          </view>
          <view class="row arrow" @tap="showUserAgreement">
            <view class="row-left">
              <image src="/static/icons/book.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">用户协议</text>
            </view>
            <view class="row-right">
              <text class="arrow-icon">></text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">通用</view>
        <view class="card">
          <view class="row arrow" @tap="goToPage('/pages/profile/invite-friends/index')">
            <view class="row-left">
              <image src="/static/icons/gift.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">邀请好友</text>
            </view>
            <view class="row-right">
              <text class="arrow-icon">></text>
            </view>
          </view>
          <view class="row arrow" @tap="clearCache">
            <view class="row-left">
              <image src="/static/icons/trash.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">清理缓存</text>
            </view>
            <view class="row-right">
              <text class="row-value">{{ cacheSize }}</text>
              <text class="arrow-icon">></text>
            </view>
          </view>
          <view class="row arrow" @tap="checkUpdate">
            <view class="row-left">
              <image src="/static/icons/sparkle.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">检查更新</text>
            </view>
            <view class="row-right">
              <text class="row-value">{{ appVersionLabel }}</text>
              <text class="arrow-icon">></text>
            </view>
          </view>
          <view class="row arrow" @tap="showAboutUs">
            <view class="row-left">
              <image src="/static/icons/info.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">关于我们</text>
            </view>
            <view class="row-right">
              <text class="arrow-icon">></text>
            </view>
          </view>
        </view>
      </view>

      <view class="logout-section">
        <button class="logout-btn" @tap="logout">退出登录</button>
      </view>

      <view class="bottom-placeholder"></view>
    </scroll-view>
  </view>
</template>

<script>
import { clearAllCache } from '@/shared-ui/cache-cleaner'
import { forceLogout } from '@/shared-ui/request-interceptor'
import { getCachedLegalRuntimeSettings, loadLegalRuntimeSettings } from '@/shared-ui/legal-runtime.js'
import { getAppVersionLabel } from '@/shared-ui/app-version.js'
import { createProfileSettingsDetailPage } from '../../../../../../shared/mobile-common/profile-settings-pages.js'

export default createProfileSettingsDetailPage({
  clearAllCache,
  forceLogout,
  getCachedLegalRuntimeSettings,
  loadLegalRuntimeSettings,
  getAppVersionLabel
})
</script>

<style scoped lang="scss">
.settings-detail-page {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.page-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 89px;
  padding-top: 45px;
  display: flex;
  align-items: center;
  background: #fff;
  box-sizing: border-box;
  border-bottom: 1px solid #f2f3f5;
}

.nav-left,
.nav-right {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  width: 22px;
  height: 22px;
  opacity: 0.85;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: #111827;
}

.scroll-content {
  position: fixed;
  top: 89px;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  padding: 12px;
  box-sizing: border-box;
}

.section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 13px;
  color: #9ca3af;
  padding: 0 4px 8px;
  font-weight: 500;
}

.card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.row {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f3f4f6;
  min-height: 52px;
  box-sizing: border-box;
}

.row:last-child {
  border-bottom: none;
}

.row.arrow:active {
  background: #f9fafb;
}

.row.between {
  justify-content: space-between;
}

.row-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.row-icon {
  width: 20px;
  height: 20px;
  margin-right: 12px;
  opacity: 0.6;
  flex-shrink: 0;
}

.row-label {
  font-size: 15px;
  color: #1f2937;
  font-weight: 500;
}

.row-right {
  display: flex;
  align-items: center;
  margin-left: 12px;
  flex-shrink: 0;
}

.row-value {
  font-size: 14px;
  color: #9ca3af;
  margin-right: 8px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow-icon {
  font-size: 18px;
  color: #c7c7cc;
}

.logout-section {
  padding: 12px 0 24px;
}

.logout-btn {
  width: 100%;
  height: 50px;
  background: #fff;
  border: 1.5px solid #fecaca;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(239, 68, 68, 0.1);
}

.logout-btn::after {
  border: none;
}

.bottom-placeholder {
  height: 20px;
}
</style>
