<template>
  <view class="page">
    <scroll-view scroll-y class="content">
      <view class="card">
        <text class="title">基础信息</text>

        <view class="field">
          <text class="label">商品名称 *</text>
          <input v-model="form.name" class="input" placeholder="例如：招牌猪脚饭" />
        </view>

        <view class="field">
          <text class="label">商品分类 *</text>
          <picker :range="categoryNames" @change="onCategoryChange">
            <view class="picker">{{ selectedCategoryName }}</view>
          </picker>
        </view>

        <view class="field row">
          <view class="half">
            <text class="label">售价 *</text>
            <input v-model="form.price" class="input" type="digit" placeholder="0.00" />
          </view>
          <view class="half">
            <text class="label">库存</text>
            <input v-model="form.stock" class="input" type="number" placeholder="999" />
          </view>
        </view>

        <view class="field">
          <text class="label">描述</text>
          <textarea v-model="form.description" class="textarea" maxlength="200" placeholder="描述口味、分量、食材" />
        </view>

        <view class="field">
          <text class="label">商品图片（可选）</text>
          <view class="upload-card" @tap="chooseProductImage">
            <image v-if="form.image" class="upload-image" :src="form.image" mode="aspectFill" />
            <view v-else class="upload-empty">
              <text class="upload-empty-main">{{ uploadingImage ? '上传中...' : '点击上传商品图' }}</text>
              <text class="upload-empty-sub">支持相册和拍照</text>
            </view>
          </view>
          <view class="upload-actions">
            <button class="upload-btn" :disabled="uploadingImage" @tap.stop="chooseProductImage">
              {{ uploadingImage ? '上传中...' : '重新上传' }}
            </button>
            <button v-if="form.image" class="upload-clear-btn" :disabled="uploadingImage" @tap.stop="clearProductImage">
              清空
            </button>
          </view>
        </view>

        <view class="field row middle">
          <text class="label">是否上架</text>
          <switch :checked="form.isActive" color="#009bf5" @change="onStatusChange" />
        </view>
      </view>

      <view class="space" />
    </scroll-view>

    <view class="footer">
      <button class="submit" :disabled="submitting || uploadingImage" @tap="handleSubmit">
        {{ submitting ? '保存中...' : '保存商品' }}
      </button>
    </view>
  </view>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useProductEditorPage } from '@/shared-ui/productEditorPage'

export default defineComponent({
  setup() {
    return useProductEditorPage('create')
  },
})
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  background: #f4f7fb;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  min-height: 0;
  padding: 20rpx;
  box-sizing: border-box;
}

.card {
  background: #fff;
  border: 1rpx solid #e6eef7;
  border-radius: 18rpx;
  padding: 20rpx;
}

.title {
  display: block;
  margin-bottom: 14rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #10304d;
}

.field {
  margin-bottom: 16rpx;
}

.label {
  display: block;
  font-size: 24rpx;
  color: #43607e;
  margin-bottom: 8rpx;
}

.input,
.picker {
  width: 100%;
  height: 82rpx;
  line-height: 82rpx;
  border-radius: 14rpx;
  border: 1rpx solid #dce8f5;
  background: #f7fbff;
  padding: 0 20rpx;
  box-sizing: border-box;
  font-size: 26rpx;
  color: #163553;
}

.textarea {
  width: 100%;
  min-height: 160rpx;
  border-radius: 14rpx;
  border: 1rpx solid #dce8f5;
  background: #f7fbff;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  font-size: 26rpx;
  color: #163553;
}

.upload-card {
  position: relative;
  width: 100%;
  height: 190rpx;
  border: 1rpx dashed #bfd5ea;
  border-radius: 14rpx;
  background: #f7fbff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-image {
  width: 100%;
  height: 100%;
}

.upload-empty {
  text-align: center;
}

.upload-empty-main {
  display: block;
  font-size: 24rpx;
  color: #2c557e;
}

.upload-empty-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 21rpx;
  color: #88a1b9;
}

.upload-actions {
  margin-top: 10rpx;
  display: flex;
  gap: 10rpx;
}

.upload-btn,
.upload-clear-btn {
  flex: 1;
  height: 62rpx;
  line-height: 62rpx;
  border-radius: 10rpx;
  font-size: 23rpx;
  border: 1rpx solid #d8e4f2;
  background: #ffffff;
  color: #345a7f;
}

.upload-clear-btn {
  border-color: #f0d3d3;
  color: #b94b4b;
  background: #fff8f8;
}

.row {
  display: flex;
  gap: 12rpx;
}

.half {
  flex: 1;
}

.middle {
  align-items: center;
  justify-content: space-between;
}

.space {
  height: calc(180rpx + env(safe-area-inset-bottom));
}

.footer {
  padding: 16rpx 20rpx calc(16rpx + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #f4f7fb 70%, transparent);
}

.submit {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 14rpx;
  border: none;
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #009bf5, #0077c2);
}
</style>
