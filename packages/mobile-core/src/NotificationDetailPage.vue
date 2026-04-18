<template>
  <view class="page article-page">
    <view class="nav">
      <view class="nav-left" @tap="back">
        <image src="/static/icons/arrow-left.svg" mode="aspectFit" class="nav-icon" />
      </view>
      <view class="nav-title">
        <text>通知详情</text>
      </view>
      <view class="nav-right" />
    </view>

    <scroll-view scroll-y class="scroll">
      <view v-if="loading" class="loading-wrapper">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="article">
        <view class="title">
          <text>{{ articleTitle() }}</text>
        </view>
        <view class="meta" v-if="article.time || article.source">
          <text v-if="article.time" class="meta-time">{{ article.time }}</text>
          <text v-if="article.time && article.source" class="meta-dot">·</text>
          <text v-if="article.source" class="meta-source">{{ article.source }}</text>
        </view>

        <view v-if="article.cover" class="cover">
          <image :src="article.cover" mode="widthFix" class="cover-img" @tap="preview(article.cover)" />
        </view>

        <view class="body" v-if="article.blocks.length > 0">
          <view v-for="(block, idx) in article.blocks" :key="idx">
            <view v-if="block.type === 'p'" class="p">
              <text>{{ block.text }}</text>
            </view>

            <view v-else-if="block.type === 'h2'" class="h2">
              <text>{{ block.text }}</text>
            </view>

            <view v-else-if="block.type === 'quote'" class="quote">
              <text>{{ block.text }}</text>
            </view>

            <view v-else-if="block.type === 'ul'" class="ul">
              <view v-for="(it, i) in block.items" :key="i" class="li">
                <view class="dot" />
                <text class="li-text">{{ it }}</text>
              </view>
            </view>

            <view v-else-if="block.type === 'img'" class="img">
              <image :src="block.url" mode="widthFix" class="img-el" @tap="preview(block.url)" />
              <text v-if="block.caption" class="img-cap">{{ block.caption }}</text>
            </view>
          </view>
        </view>

        <view v-else class="empty-content">
          <text>暂无内容</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import {
  ackPushMessage,
  fetchNotificationDetail,
  markNotificationRead,
} from "@/shared-ui/api.js";
import { parseNotificationDisplayBlocks } from "../../domain-core/src/notification-content.js";
import { createNotificationDetailPage } from "./notification-detail.js";

export default createNotificationDetailPage({
  fetchNotificationDetail,
  markNotificationRead,
  ackPushMessage,
  parseNotificationDisplayBlocks,
});
</script>

<style scoped lang="scss" src="./notification-detail-page.scss"></style>
