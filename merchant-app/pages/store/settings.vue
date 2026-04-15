<template>
    <view class="page">
    <view class="header">
      <view class="shop-area" @tap="selectShop">
        <text class="shop-name">{{ currentShopName }}</text>
        <text class="shop-hint">切换店铺</text>
      </view>
      <text class="header-title">店铺基础设置</text>
    </view>

    <scroll-view scroll-y class="content">
      <view class="section">
        <text class="section-title">品牌展示</text>

        <view class="form-item">
          <text class="form-label">店铺 Logo</text>
          <view class="upload-card" @tap="chooseAndUpload('logo')">
            <image v-if="form.logo" class="upload-image" :src="form.logo" mode="aspectFill" />
            <view v-else class="upload-empty">
              <text class="upload-empty-main">{{ uploadingLogo ? '上传中...' : '点击上传 Logo' }}</text>
              <text class="upload-empty-sub">支持相册和拍照</text>
            </view>
          </view>
          <view class="upload-actions">
            <button class="upload-btn" :disabled="uploadingLogo" @tap.stop="chooseAndUpload('logo')">
              {{ uploadingLogo ? '上传中...' : '重新上传' }}
            </button>
            <button
              v-if="form.logo"
              class="upload-clear-btn"
              :disabled="uploadingLogo"
              @tap.stop="clearImage('logo')"
            >
              清空
            </button>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">门头图</text>
          <view class="upload-card" @tap="chooseAndUpload('coverImage')">
            <image v-if="form.coverImage" class="upload-image" :src="form.coverImage" mode="aspectFill" />
            <view v-else class="upload-empty">
              <text class="upload-empty-main">{{ uploadingCover ? '上传中...' : '点击上传门头图' }}</text>
              <text class="upload-empty-sub">建议横图，展示效果更好</text>
            </view>
          </view>
          <view class="upload-actions">
            <button class="upload-btn" :disabled="uploadingCover" @tap.stop="chooseAndUpload('coverImage')">
              {{ uploadingCover ? '上传中...' : '重新上传' }}
            </button>
            <button
              v-if="form.coverImage"
              class="upload-clear-btn"
              :disabled="uploadingCover"
              @tap.stop="clearImage('coverImage')"
            >
              清空
            </button>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">基础信息</text>

        <view class="form-item">
          <text class="form-label required">店铺名称</text>
          <input v-model="form.name" class="input" placeholder="请输入店铺名称" />
        </view>

        <view class="form-item">
          <text class="form-label">主营类目</text>
          <picker :range="categoryOptions" :value="categoryIndex" @change="onCategoryChange">
            <view class="picker">{{ form.businessCategory || categoryOptions[0] || '美食' }}</view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">店铺公告</text>
          <textarea
            v-model="form.announcement"
            class="textarea"
            maxlength="120"
            placeholder="请输入公告内容"
          />
          <text class="count">{{ form.announcement.length }}/120</text>
        </view>
      </view>

      <view class="section">
        <text class="section-title">联系与配送</text>

        <view class="form-item">
          <text class="form-label">联系电话</text>
          <input v-model="form.phone" class="input" type="number" placeholder="请输入联系电话" />
        </view>

        <view class="form-item">
          <text class="form-label">店铺地址</text>
          <input v-model="form.address" class="input" placeholder="请输入店铺地址" />
        </view>

        <view class="split-row">
          <view class="half-item">
            <text class="form-label">起送价(元)</text>
            <input v-model="form.minPrice" class="input" type="digit" placeholder="0" />
          </view>
          <view class="half-item">
            <text class="form-label">配送费(元)</text>
            <input v-model="form.deliveryPrice" class="input" type="digit" placeholder="0" />
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">配送时效</text>
          <input v-model="form.deliveryTime" class="input" placeholder="例如：30分钟" />
        </view>
      </view>

      <view class="section">
        <text class="section-title">营业设置</text>

        <view class="switch-row">
          <view>
            <text class="switch-title">营业状态</text>
            <text class="switch-desc">关闭后用户端无法下单</text>
          </view>
          <switch :checked="form.isActive" color="#009bf5" @change="onStatusChange" />
        </view>

        <view class="split-row">
          <view class="half-item">
            <text class="form-label">开门时间</text>
            <picker mode="time" :value="form.openTime" @change="onTimeChange('openTime', $event)">
              <view class="picker">{{ form.openTime || '09:00' }}</view>
            </picker>
          </view>
          <view class="half-item">
            <text class="form-label">打烊时间</text>
            <picker mode="time" :value="form.closeTime" @change="onTimeChange('closeTime', $event)">
              <view class="picker">{{ form.closeTime || '22:00' }}</view>
            </picker>
          </view>
        </view>
      </view>

      <view class="bottom-gap" />
    </scroll-view>

    <view class="footer">
      <button class="save-btn" :disabled="saving || !currentShop || uploadingAny" @tap="saveSettings">
        {{ saving ? '保存中...' : '保存并生效' }}
      </button>
    </view>
  </view>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useMerchantStoreSettingsPage } from '@/shared-ui/storeFormPage'

export default defineComponent({
  setup() {
    return useMerchantStoreSettingsPage()
  },
})
</script>

<style scoped lang="scss" src="./settings.scss"></style>
