<template>
  <view class="page welcome">
    <view class="hero">
      <!-- Logo和文字容器 -->
      <view class="content-wrap" :class="{ 'content-initial': showInitialContent, 'content-final': showFinalContent }">
        <!-- 初始大logo -->
        <view class="logo-wrap">
          <image class="logo" src="/static/images/logo.png" mode="aspectFit" />
        </view>
        
        <!-- 标题文字（打字机效果）- 大logo时只显示"悦享e食"，小logo时显示完整标题 -->
        <view class="title-wrap" :class="{ 'title-visible': showTitle }">
          <text class="title-line" v-if="showInitialContent">
            <text class="title-text">{{ displayedTitleLine2 }}</text>
          </text>
          <text class="title-single" v-if="!showInitialContent">{{ displayedTitle }}</text>
        </view>
        
        <!-- 副标题 -->
        <text class="subtitle" :class="{ 'subtitle-visible': showSubtitle }">附近美食，一键下单，准时送达</text>
      </view>
    </view>

    <!-- 底部卡片（渐入效果） -->
    <view class="card" :class="{ 'card-visible': showCard }">
      <button class="btn primary" @tap="goLogin">登录 / 注册</button>
      <button class="btn ghost" @tap="goGuest">游客访问</button>
      <view class="tip">
        <text class="tip-text">登录后可同步订单、消息与优惠券</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      showInitialContent: true,
      showFinalContent: false,
      showTitle: false,
      showSubtitle: false,
      showCard: false,
      displayedTitle: '',
      displayedTitleLine2: '',
      fullTitle: '欢迎来到悦享e食',
      titleLine2: '悦享e食',
      typewriterIndex: 0,
      typewriterTimer: null
    }
  },
  onLoad() {
    // 已登录直接跳过欢迎动画
    if (this.isUserLoggedIn()) {
      uni.switchTab({ url: '/pages/index/index' })
      return
    }
    // 未登录才播放动画
    this.startAnimation()
  },
  onUnload() {
    // 清理定时器
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer)
    }
  },
  methods: {
    isUserLoggedIn() {
      const authMode = uni.getStorageSync('authMode')
      const token = uni.getStorageSync('token')
      const refreshToken = uni.getStorageSync('refreshToken')
      return authMode === 'user' && !!token && !!refreshToken
    },
    startAnimation() {
      // 1. 初始logo和文字放大显示（已通过CSS实现）
      
      // 2. 1秒后开始打字机效果
      setTimeout(() => {
        this.startTypewriter()
      }, 1000)
      
      // 3. 打字完成后，logo和文字一起过渡到最终位置
      // 打字机大约需要 1.2秒（4个字符 * 150ms）
      // 加上一点延迟让用户看清楚
      setTimeout(() => {
        // 确保标题完整显示
        this.displayedTitle = this.fullTitle
        this.showInitialContent = false
        this.showFinalContent = true
        this.showSubtitle = true
      }, 2500) // 1秒延迟 + 1.2秒打字 + 0.3秒缓冲
      
      // 4. 内容过渡完成后，显示底部卡片
      setTimeout(() => {
        this.showCard = true
        
        // 5. 如果用户已登录，动画播放完成后自动跳转到首页
        // 延迟一点让用户看到完整的动画效果
        setTimeout(() => {
          if (uni.getStorageSync('authMode') === 'user') {
            uni.switchTab({ url: '/pages/index/index' })
          }
        }, 1000) // 再等1秒让用户看到完整效果
      }, 3700) // 过渡动画1.2秒
    },
    
    startTypewriter() {
      this.showTitle = true
      this.typewriterIndex = 0
      this.displayedTitle = ''
      this.displayedTitleLine2 = ''
      
      // 大logo时，只打"悦享e食"
      this.typewriterTimer = setInterval(() => {
        if (this.typewriterIndex < this.titleLine2.length) {
          // 打"悦享e食"
          this.displayedTitleLine2 += this.titleLine2[this.typewriterIndex]
          this.typewriterIndex++
        } else {
          // 打字完成，准备完整标题（用于小logo时显示）
          this.displayedTitle = this.fullTitle
          clearInterval(this.typewriterTimer)
          this.typewriterTimer = null
        }
      }, 150) // 每个字符150ms
    },
    
    goLogin() {
      uni.navigateTo({ url: '/pages/auth/login/index' })
    },
    goGuest() {
      uni.setStorageSync('authMode', 'guest')
      uni.switchTab({ url: '/pages/index/index' })
    }
  }
}
</script>

<style scoped lang="scss">
.page.welcome {
  min-height: 100vh;
  background-color: #eef2f6;
  background: linear-gradient(180deg, #009bf5 0%, #0088d9 38%, #eef2f6 100%);
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.hero {
  padding-top: calc(env(safe-area-inset-top, 0px) + 56px);
  padding-left: 24px;
  padding-right: 24px;
  padding-bottom: 28px;
  text-align: center;
  color: #fff;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* 内容容器：控制整体缩放和位置 */
.content-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 初始状态：整体放大，往下移更多 */
.content-wrap.content-initial {
  transform: scale(1.8);
  margin-top: 35%; /* 继续往下移 */
}

/* 最终状态：正常大小和位置 */
.content-wrap.content-final {
  transform: scale(1);
  margin-top: 0;
}

.logo-wrap {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  width: 92px;
  height: 92px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(6px);
  margin: 0 auto 14px;
  animation: logoPulse 1s ease-out;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: inherit;
    pointer-events: none;
  }
}

@keyframes logoPulse {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.logo {
  width: 100%;
  height: 100%;
  display: block;
  transform: scale(1.06);
}

.title-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  opacity: 0;
  min-height: 36px; /* 防止布局跳动 */
  transition: opacity 0.3s ease;
}

.title-wrap.title-visible {
  opacity: 1;
}

.title-line {
  display: block;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.6px;
  line-height: 1.2;
}

.title-text {
  display: inline-block;
}

/* 单行显示（小logo时） */
.title-single {
  display: block;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.6px;
  line-height: 1.2;
}

.subtitle {
  display: block;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.4s ease 0.2s;
}

.subtitle.subtitle-visible {
  opacity: 0.92;
}

.card {
  margin: 0 12px;
  padding: 18px 16px 14px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
  margin-top: auto;
  margin-bottom: 40px; /* 卡片往上移一点 */
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.8s ease, transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.card.card-visible {
  opacity: 1;
  transform: translateY(0);
}

.btn {
  width: 100%;
  height: 46px;
  line-height: 46px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;

  &::after {
    border: none;
  }
}

.btn.primary {
  background: linear-gradient(90deg, #009bf5, #0081cc);
  color: #fff;
}

.btn.primary:active {
  opacity: 0.9;
  transform: scale(0.99);
}

.btn.ghost {
  background: #fff;
  color: #0095ff;
  border: 1px solid rgba(0, 149, 255, 0.25);
  font-weight: 600;
}

.btn.ghost:active {
  background: #f3f8ff;
}

.tip {
  padding-top: 2px;
  text-align: center;
}

.tip-text {
  font-size: 12px;
  color: #9ca3af;
}
</style>
