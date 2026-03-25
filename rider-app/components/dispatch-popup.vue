<template>
  <view v-if="showModal && currentOrder" class="dispatch-overlay">
    <view class="dispatch-card" @click.stop>
      <view class="dispatch-header">
        <text class="dispatch-title">系统派单</text>
        <text class="dispatch-subtitle">{{ countdown }} 秒后自动接单</text>
      </view>

      <view class="dispatch-body">
        <view class="dispatch-price-row">
          <text class="dispatch-price">¥{{ currentOrder.price || '-' }}</text>
          <text class="dispatch-time">{{ currentOrder.timeLeft || '--' }} 分钟送达</text>
        </view>

        <view class="dispatch-line-item">
          <text class="dispatch-dot pickup">取</text>
          <view class="dispatch-line-info">
            <text class="dispatch-name">{{ currentOrder.shopName || '-' }}</text>
            <text class="dispatch-addr">{{ currentOrder.shopAddress || '-' }}</text>
          </view>
        </view>

        <view class="dispatch-line-item">
          <text class="dispatch-dot delivery">送</text>
          <view class="dispatch-line-info">
            <text class="dispatch-name">{{ currentOrder.customerAddress || '-' }}</text>
            <text class="dispatch-addr">尾号 {{ currentOrder.customerPhoneTail || '--' }}</text>
          </view>
        </view>

        <view class="dispatch-total">全程 {{ getDispatchDistanceText(currentOrder) }}</view>
        <view class="dispatch-reject-tip">今日无责拒绝剩余 {{ rejectRemaining }} 次</view>

        <view class="dispatch-actions">
          <button
            class="btn-dispatch-secondary"
            :disabled="rejectLimitReached || isAccepting"
            @click="handleReject"
          >
            {{ rejectButtonText }}
          </button>
          <button
            class="btn-dispatch-primary"
            :disabled="isAccepting"
            @click="handleAccept('manual')"
          >
            {{ isAccepting ? '接单中...' : '立即接单' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import pageLogic from './dispatch-popup-logic.ts'

export default pageLogic
</script>

<style scoped lang="scss" src="./dispatch-popup.scss"></style>
