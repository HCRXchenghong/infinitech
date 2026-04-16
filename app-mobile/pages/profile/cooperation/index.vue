<template>
  <view class="page feedback-page">
    <view class="header">
      <view class="back-btn" @tap="goBack"><text>‹</text></view>
      <text class="title">反馈与合作</text>
      <view class="placeholder" />
    </view>

    <view class="content">
      <view class="form-card">
        <view class="form-item">
          <text class="label">类型</text>
          <picker :value="typeIndex" :range="typeOptions" @change="handleTypeChange">
            <view class="picker-value">{{ typeOptions[typeIndex] }}</view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label">主题</text>
          <input v-model="form.subject" class="input" placeholder="如：产品建议 / 品牌合作" />
        </view>

        <view class="form-item">
          <text class="label">联系人</text>
          <input v-model="form.name" class="input" placeholder="请输入联系人姓名" />
        </view>

        <view class="form-item">
          <text class="label">联系电话</text>
          <input v-model="form.phone" class="input" type="number" placeholder="请输入手机号" />
        </view>

        <view class="form-item textarea-item">
          <text class="label">详细内容</text>
          <textarea
            v-model="form.content"
            class="textarea"
            maxlength="500"
            placeholder="请填写具体诉求或合作说明（最多500字）"
          />
          <text class="counter">{{ form.content.length }}/500</text>
        </view>

        <button class="submit-btn" :disabled="submitting" @tap="submitForm">
          {{ submitting ? '提交中...' : '提交' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import { submitCooperation } from '@/shared-ui/api.js'
import { createProfileCooperationPage } from '../../../../shared/mobile-common/profile-outreach-pages.js'

export default createProfileCooperationPage({
  submitCooperation
})
</script>

<style scoped lang="scss">
.feedback-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 44px;
  padding: calc(env(safe-area-inset-top, 0px) + 8px) 12px 8px;
  background: #fff;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #111827;
}

.title {
  font-size: 17px;
  font-weight: 700;
  color: #111827;
}

.placeholder {
  width: 36px;
}

.content {
  padding: calc(env(safe-area-inset-top, 0px) + 68px) 12px 20px;
}

.form-card {
  background: #fff;
  border-radius: 14px;
  padding: 14px;
}

.form-item {
  margin-bottom: 12px;
}

.form-item:last-of-type {
  margin-bottom: 0;
}

.label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.input,
.picker-value {
  height: 40px;
  line-height: 40px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  padding: 0 12px;
  font-size: 14px;
  color: #111827;
  background: #fff;
}

.textarea-item {
  position: relative;
}

.textarea {
  width: 100%;
  min-height: 120px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  padding: 10px 12px;
  box-sizing: border-box;
  font-size: 14px;
  color: #111827;
  background: #fff;
}

.counter {
  position: absolute;
  right: 10px;
  bottom: 8px;
  font-size: 11px;
  color: #9ca3af;
}

.submit-btn {
  margin-top: 16px;
  width: 100%;
  height: 42px;
  line-height: 42px;
  border-radius: 999px;
  background: #0ea5e9;
  color: #fff;
  font-size: 15px;
}

.submit-btn[disabled] {
  opacity: 0.6;
}
</style>
