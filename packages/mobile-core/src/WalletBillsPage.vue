<template>
  <view class="bill-page">
    <view class="top-shell" :style="{ paddingTop: topPadding + 'px' }">
      <view class="top-bar">
        <view class="back-btn" @tap="goBack">‹</view>
        <view class="title-group">
          <text class="top-title">账单</text>
          <text class="top-subtitle">IF-Pay 账户流水</text>
        </view>
        <view class="refresh-btn" @tap="refresh">刷新</view>
      </view>
    </view>

    <view class="filter-shell">
      <view class="time-card">
        <view class="time-mode-row">
          <view
            class="time-mode-chip"
            :class="{ active: rangeMode === 'month' }"
            @tap="changeRangeMode('month')"
          >
            按月筛选
          </view>
          <view
            class="time-mode-chip"
            :class="{ active: rangeMode === 'custom' }"
            @tap="changeRangeMode('custom')"
          >
            时间区间
          </view>
          <view
            class="time-mode-chip"
            :class="{ active: rangeMode === 'all' }"
            @tap="changeRangeMode('all')"
          >
            全部时间
          </view>
        </view>

        <picker
          v-if="rangeMode === 'month'"
          mode="date"
          fields="month"
          :value="monthValue"
          @change="onMonthChange"
        >
          <view class="month-picker-row">
            <text class="month-label">账单月份</text>
            <view class="month-value-wrap">
              <text class="month-value">{{ monthDisplay }}</text>
              <text class="month-arrow">›</text>
            </view>
          </view>
        </picker>

        <view v-else-if="rangeMode === 'custom'" class="custom-range-row">
          <picker mode="date" :value="customStartDate" @change="onCustomDateChange('start', $event)">
            <view class="date-picker-box">
              <text class="date-picker-label">开始</text>
              <text class="date-picker-value">{{ customStartDate }}</text>
            </view>
          </picker>
          <text class="date-divider">至</text>
          <picker mode="date" :value="customEndDate" @change="onCustomDateChange('end', $event)">
            <view class="date-picker-box">
              <text class="date-picker-label">结束</text>
              <text class="date-picker-value">{{ customEndDate }}</text>
            </view>
          </picker>
          <view class="date-search-btn" @tap="applyCustomRange">查询</view>
        </view>

        <view class="summary-row">
          <text class="summary-period">{{ periodLabel }}</text>
          <text class="summary-amount">支出 ¥{{ fen2yuan(expenseAmount) }} 收入 ¥{{ fen2yuan(incomeAmount) }}</text>
        </view>
      </view>

      <view class="type-chip-row">
        <view
          v-for="item in filterOptions"
          :key="item.value || 'all'"
          class="type-chip"
          :class="{ active: filterType === item.value }"
          @tap="changeFilter(item.value)"
        >
          {{ item.label }}
        </view>
      </view>
    </view>

    <view class="list-shell">
      <view v-if="loading" class="state-tips">账单加载中...</view>

      <view v-else-if="errorText" class="error-wrap">
        <text class="error-title">账单加载失败</text>
        <text class="error-desc">{{ errorText }}</text>
        <view class="error-btn" @tap="refresh">点击重试</view>
      </view>

      <view v-else-if="transactions.length === 0" class="state-tips">当前筛选条件下暂无账单记录</view>

      <view v-else class="tx-list">
        <view
          v-for="tx in transactions"
          :key="tx.transaction_id || tx.transactionId || tx.id"
          class="tx-row"
          @tap="openDetail(tx)"
        >
          <view class="tx-left">
            <view class="tx-icon" :class="amountClass(tx)">{{ txTypeIcon(tx.type) }}</view>
            <view class="tx-main">
              <text class="tx-title">{{ txTypeLabel(tx.type) }}</text>
              <text class="tx-desc">{{ txDesc(tx) }}</text>
            </view>
          </view>

          <view class="tx-right">
            <text class="tx-amount" :class="amountClass(tx)">{{ amountText(tx) }}</text>
            <text class="tx-status">{{ statusLabel(tx.status) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="detailVisible" class="modal-mask" @tap.self="detailVisible = false">
      <view class="detail-sheet">
        <view class="sheet-handle"></view>
        <text class="detail-title">账单详情</text>
        <view v-for="row in detailRows" :key="row.label" class="detail-row">
          <text class="detail-label">{{ row.label }}</text>
          <text class="detail-value">{{ row.value }}</text>
        </view>
        <button class="detail-close" @tap="detailVisible = false">关闭</button>
      </view>
    </view>
  </view>
</template>

<script>
import { buildAuthorizationHeader, request } from "@/shared-ui/api.js";
import { createWalletBillsPageLogic } from "./wallet-bills-page.js";

export default createWalletBillsPageLogic({
  request,
  buildAuthorizationHeader,
});
</script>

<style scoped lang="scss" src="./wallet-bills-page.scss"></style>
