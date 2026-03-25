<template>
  <view class="container">
    <!-- 消息弹窗组件 -->
    <message-popup />
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" ref="navbar">
      <view :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="navbar-content">
        <text class="navbar-title">我的任务</text>
      </view>
    </view>

    <!-- Tab切换 -->
    <view class="tabs-wrapper" ref="tabs" :style="tabsStyle">
      <view class="tabs">
        <view
          v-for="(tab, index) in tabs"
          :key="index"
          class="tab-item"
          :class="{ active: currentTab === index }"
          @click="currentTab = index"
        >
          <text class="tab-text">{{ tab.label }}</text>
          <text class="tab-count">{{ tab.count }}</text>
          <view v-if="currentTab === index" class="tab-indicator"></view>
        </view>
      </view>
    </view>

    <!-- 任务列表 -->
    <scroll-view class="task-list" scroll-y :style="taskListStyle">
      <!-- 空状态 -->
      <view v-if="filteredTasks.length === 0" class="empty-state">
        <text class="empty-icon">📦</text>
        <text class="empty-title">暂无{{ currentTab === 0 ? '待取货' : '配送中' }}任务</text>
        <button class="btn-go-hall" @click="goToHall">去大厅接单</button>
      </view>

      <!-- 任务卡片 -->
      <view v-else class="tasks-container">
        <view
          v-for="task in filteredTasks"
          :key="task.id"
          class="task-card"
          @click="goToDetail(task)"
        >
          <!-- 订单头部 -->
          <view class="task-header">
            <view class="order-info">
              <view class="order-badge">#{{ task.orderNum }}</view>
              <text class="order-platform">美团外卖</text>
            </view>
            <view class="time-remaining" :class="{ urgent: task.remainingTime < 10 }">
              <text class="time-num">{{ task.remainingTime }}</text>
              <text class="time-unit">分钟内送达</text>
            </view>
          </view>

          <!-- 主要信息 -->
          <view class="task-body">
            <view class="main-info">
              <text class="location-name">{{
                task.status === 'pending' ? task.shopName : task.customerAddress
              }}</text>
              <view class="location-detail">
                <text class="icon-pin">📍</text>
                <text class="address-text">{{
                  task.status === 'pending'
                    ? task.shopAddress
                    : '尾号 ' + task.customerPhoneTail
                }}</text>
              </view>
              <view class="items-box">
                <text class="items-text">{{ task.items }}</text>
              </view>
            </view>

            <!-- 快捷操作按钮 -->
            <view class="quick-actions">
              <button class="action-btn phone" @click.stop="callCustomer(task)">
                <text class="action-icon">📞</text>
              </button>
              <button class="action-btn merchant" @click.stop="openMerchantChat(task)">
                <text class="action-icon">🏪</text>
              </button>
              <button class="action-btn navigation" @click.stop="navigate(task)">
                <text class="action-icon">🧭</text>
              </button>
            </view>
          </view>

          <!-- 底部操作 -->
          <view class="task-footer">
            <button class="btn-report" @click.stop="showReportModal(task)">异常</button>
            <button class="btn-advance" @click.stop="handleAdvanceTask(task)">
              {{ task.status === 'pending' ? '我已到店' : '确认送达' }}
            </button>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 异常上报弹窗 -->
    <view v-if="showReport" class="modal-overlay" @click="showReport = false">
      <view class="report-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">异常上报</text>
        </view>
        <view class="report-reasons">
          <view
            v-for="(reason, index) in reportReasons"
            :key="index"
            class="reason-item"
            @click="handleReport(reason)"
          >
            <text class="reason-text">{{ reason }}</text>
            <text class="reason-arrow">›</text>
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="showReport = false">取消</button>
        </view>
      </view>
    </view>

    <!-- 联系订单相关方弹窗 -->
    <view v-if="showContact" class="modal-overlay" @click="showContact = false">
      <view class="contact-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">联系订单相关方</text>
          <text class="close-btn" @click="showContact = false">✕</text>
        </view>
        <view class="contact-options">
          <button class="contact-btn phone" @click="callCustomerPhone(currentTask)">
            <text class="contact-icon">📞</text>
            <text class="contact-label">电话联系</text>
          </button>
          <button class="contact-btn message" @click="openCustomerChat(currentTask)">
            <text class="contact-icon">💬</text>
            <text class="contact-label">在线消息</text>
          </button>
        </view>
        <view class="contact-tip">
          <text class="tip-icon">ℹ️</text>
          <text class="tip-text">优先使用在线消息，缺少号码时请改用在线沟通</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import pageLogic from './index-logic.ts'

export default pageLogic
</script>

<style scoped lang="scss" src="./index.scss"></style>
