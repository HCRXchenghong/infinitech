<template>
  <view class="app-root">
    <slot />
  </view>
</template>

<script lang="ts">
import Vue from "vue";
import {
  bootstrapUserApp,
  handleUserAppShow,
} from "@/shared-ui/app-core/bootstrap";
import { bindNotificationSoundBridge } from "@/shared-ui/notification-sound.js";
import { createConsumerAppRootLifecycle } from "../packages/mobile-core/src/consumer-app-shell.js";

export default Vue.extend(
  createConsumerAppRootLifecycle({
    bindNotificationSoundBridge,
    bootstrapConsumerApp: bootstrapUserApp,
    handleConsumerAppShow: handleUserAppShow,
  }),
);
</script>

<style lang="scss">
.app-root {
  min-height: 100vh;
  background-color: #f4f4f4;
  color: #333;
  font-family:
    -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI",
    "Helvetica Neue", Arial, "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

/* 全局：由于 pages.json 使用 navigationStyle=custom，页面内容需要避开系统状态栏 */
/* 标准导航栏高度：状态栏(20-44px) + 导航栏(44px) = 64-88px，我们统一使用 88px 确保安全 */
.page {
  box-sizing: border-box;
}

/* 普通页面（没有自定义 header 的）统一添加顶部间距 */
.page:not(.home):not(.shop-detail):not(.profile):not(.search):not(.welcome):not(
    .auth
  ) {
  padding-top: 88px;
}

/* 有自定义 header 的页面，header 会延伸到状态栏下方，不需要额外 padding */
</style>
