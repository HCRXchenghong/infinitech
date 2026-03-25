<template>
  <view class="container">
    <view class="page-padding">
      <!-- 申诉说明 -->
      <view class="intro-card">
        <text class="intro-icon">📝</text>
        <view class="intro-content">
          <text class="intro-title">违规申诉</text>
          <text class="intro-desc">如您对违规处罚有异议，可在此提交申诉</text>
        </view>
      </view>

      <!-- 申诉列表 -->
      <view class="appeals-section">
        <view class="section-header">
          <text class="section-title">我的申诉</text>
          <text class="section-count">{{ appealList.length }}条</text>
        </view>

        <view v-if="appealList.length === 0" class="empty-state">
          <text class="empty-icon">✅</text>
          <text class="empty-text">暂无申诉记录</text>
        </view>

        <view v-else class="appeal-list">
          <view
            v-for="(appeal, index) in appealList"
            :key="index"
            class="appeal-item"
            @click="viewAppeal(appeal)"
          >
            <view class="appeal-header">
              <text class="appeal-title">{{ appeal.title }}</text>
              <view :class="['appeal-status', appeal.status]">
                {{ getStatusText(appeal.status) }}
              </view>
            </view>
            <view class="appeal-meta">
              <text class="appeal-time">{{ appeal.time }}</text>
              <text class="appeal-type">{{ appeal.type }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 发起申诉按钮 -->
      <button class="btn-new-appeal" @click="createAppeal">
        <text class="btn-icon">+</text>
        <text>发起新申诉</text>
      </button>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data() {
    return {
      appealList: [
        {
          id: 1,
          title: '配送超时处罚申诉',
          type: '超时处罚',
          time: '2024-01-18 14:30',
          status: 'pending' // pending | approved | rejected
        },
        {
          id: 2,
          title: '客户投诉申诉',
          type: '服务投诉',
          time: '2024-01-15 10:20',
          status: 'approved'
        }
      ]
    }
  },
  methods: {
    getStatusText(status: string) {
      const map: any = {
        pending: '审核中',
        approved: '已通过',
        rejected: '已拒绝'
      }
      return map[status] || '未知'
    },
    
    viewAppeal(appeal: any) {
      uni.showToast({
        title: '查看申诉详情',
        icon: 'none'
      })
    },
    
    createAppeal() {
      uni.showToast({
        title: '发起新申诉',
        icon: 'none'
      })
    }
  }
})
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f3f4f6;
  padding-top: 88rpx;
}

.page-padding {
  padding: 24rpx;
  padding-bottom: 160rpx;
  box-sizing: border-box;
}

.intro-card {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 32rpx;
  border: 2rpx solid #bfdbfe;
}

.intro-icon {
  font-size: 64rpx;
}

.intro-content {
  flex: 1;
}

.intro-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1e40af;
  display: block;
  margin-bottom: 8rpx;
}

.intro-desc {
  font-size: 24rpx;
  color: #3b82f6;
  display: block;
  line-height: 1.5;
}

.appeals-section {
  margin-bottom: 32rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding: 0 8rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1f2937;
}

.section-count {
  font-size: 24rpx;
  color: #6b7280;
}

.empty-state {
  background: white;
  border-radius: 24rpx;
  padding: 120rpx 32rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.empty-icon {
  font-size: 96rpx;
  display: block;
  margin-bottom: 24rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: #9ca3af;
}

.appeal-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.appeal-item {
  background: white;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.appeal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
  gap: 16rpx;
}

.appeal-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #1f2937;
  flex: 1;
}

.appeal-status {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 24rpx;
  white-space: nowrap;
  
  &.pending {
    background: #fef3c7;
    color: #92400e;
  }
  
  &.approved {
    background: #d1fae5;
    color: #065f46;
  }
  
  &.rejected {
    background: #fee2e2;
    color: #991b1b;
  }
}

.appeal-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.appeal-time {
  font-size: 24rpx;
  color: #9ca3af;
}

.appeal-type {
  font-size: 24rpx;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.btn-new-appeal {
  position: fixed;
  bottom: 48rpx;
  left: 48rpx;
  right: 48rpx;
  background: linear-gradient(135deg, #009bf5 0%, #0284c7 100%);
  color: white;
  padding: 24rpx;
  border-radius: 48rpx;
  font-size: 32rpx;
  font-weight: bold;
  box-shadow: 0 8rpx 24rpx rgba(0, 155, 245, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border: none;
  z-index: 10;
}

.btn-icon {
  font-size: 40rpx;
  line-height: 1;
}
</style>
