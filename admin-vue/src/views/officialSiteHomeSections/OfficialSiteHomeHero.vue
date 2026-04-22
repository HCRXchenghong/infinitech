<template>
  <section
    class="hero-bg site-home-screen site-screen-center pt-32 pb-24 md:pt-40 md:pb-32 px-6 relative"
    data-site-header-theme="dark"
  >
    <div class="hero-grid"></div>
    <div
      class="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-12"
    >
      <div class="flex-1 text-left text-white">
        <div
          class="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 text-sm font-medium mb-6 backdrop-blur-sm rounded-full"
        >
          <span class="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></span>
          烟台城市科技职业学院官方支持平台
        </div>
        <h1 class="text-4xl md:text-6xl font-bold mb-6 tracking-tight leading-tight">
          构建透明高效的
          <br>
          <span class="text-blue-300">校园生态服务</span>
        </h1>
        <p
          class="text-lg md:text-xl text-blue-100 opacity-90 mb-10 max-w-xl leading-relaxed font-light"
        >
          由燧石创想技术团队驱动，提供校园维权曝光、企业商户入驻、前沿资讯发布的一站式综合管理服务解决方案。
        </p>
        <div class="flex flex-wrap gap-3 mb-8 text-sm text-blue-50/90">
          <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1">校园曝光维权</span>
          <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1">新闻资讯发布</span>
          <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1">商务合作入驻</span>
          <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1">校园生态服务</span>
        </div>
        <div class="flex flex-col sm:flex-row gap-4">
          <el-button
            type="primary"
            size="large"
            class="!h-12 !px-8 !text-base !bg-white !text-[#1976d2] !border-none hover:!bg-blue-50"
            @click="openExposePage"
          >
            曝光维权通道
          </el-button>
          <el-button
            size="large"
            class="!h-12 !px-8 !text-base !bg-transparent !text-white !border-white/40 hover:!bg-white/10"
            @click="openCoopPage"
          >
            申请商务合作
          </el-button>
        </div>
      </div>

      <div class="hidden md:flex flex-1 justify-end relative items-center">
        <div
          :ref="setHeroPhoneElement"
          class="iphone-mockup official-site-home-hero-phone-shell w-[280px] h-[580px] transform -rotate-6 hover:rotate-0 transition duration-700 z-10 overflow-hidden cursor-pointer"
          @mouseenter="activateHeroPhone"
          @mouseleave="deactivateHeroPhone"
          @click="activateHeroPhone"
        >
          <transition name="official-site-home-phone-panel" mode="out-in">
            <div v-if="heroPhoneInteractive" key="cta" class="official-site-home-hero-phone-cta">
              <div class="official-site-home-hero-phone-kicker">YUEXIANG PLATFORM</div>
              <h3 class="official-site-home-hero-phone-title">扫一扫去体验</h3>
              <div class="official-site-home-hero-phone-qr-shell">
                <img
                  v-if="heroPhoneQrImage"
                  :src="heroPhoneQrImage"
                  class="official-site-home-hero-phone-qr"
                  alt="悦享e食小程序二维码"
                >
                <div v-else class="official-site-home-hero-phone-qr-placeholder">
                  请在管理端上传小程序二维码
                </div>
              </div>
              <el-button
                type="primary"
                class="official-site-home-hero-phone-button"
                @click.stop="openDownloadPage"
              >
                点击下载客户端
              </el-button>
            </div>
            <img
              v-else
              key="cover"
              src="/images/official-site/hero-phone-display.jpg"
              class="w-full h-full object-cover"
              alt="悦享e食官方支持平台移动端展示图"
            >
          </transition>
        </div>
        <div
          class="w-96 h-96 rounded-full border border-white/20 absolute -right-10 top-1/2 -translate-y-1/2 animate-[spin_60s_linear_infinite]"
        ></div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  activateHeroPhone: {
    type: Function,
    required: true,
  },
  deactivateHeroPhone: {
    type: Function,
    required: true,
  },
  heroPhoneInteractive: {
    type: Boolean,
    default: false,
  },
  heroPhoneQrImage: {
    type: String,
    default: '',
  },
  openCoopPage: {
    type: Function,
    required: true,
  },
  openDownloadPage: {
    type: Function,
    required: true,
  },
  openExposePage: {
    type: Function,
    required: true,
  },
  setHeroPhoneElement: {
    type: Function,
    required: true,
  },
});
</script>
