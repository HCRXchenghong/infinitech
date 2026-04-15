<template>
  <view class="page">
    <view class="nav">
      <text class="nav-btn" @tap="goBack">&lt;</text>
      <view class="nav-main">
        <text class="nav-title">{{ chatTitle }}</text>
        <text class="nav-sub">{{ navSubtitle }}</text>
      </view>
      <text class="nav-clear" @tap="clearLocalMessages">清空本地</text>
    </view>

    <scroll-view
      scroll-y
      class="msg-list"
      :scroll-into-view="scrollIntoView"
      :scroll-with-animation="true"
    >
      <view v-if="messages.length === 0" class="empty-tip"
        >暂无消息，开始沟通吧</view
      >

      <view
        v-for="msg in messages"
        :key="msg.mid"
        :id="'msg-' + msg.mid"
        class="msg-row"
        :class="{ self: msg.self }"
      >
        <view class="bubble">
          <view v-if="msg.officialIntervention" class="official-tag">
            {{ msg.interventionLabel || "官方介入" }}
          </view>
          <image
            v-if="msg.type === 'image'"
            :src="msg.text"
            mode="widthFix"
            class="bubble-image"
            @tap="previewImage(msg.text)"
          />
          <text v-else class="bubble-text">{{ displayText(msg) }}</text>
        </view>
        <text class="msg-time">{{ msg.time }}</text>
      </view>
    </scroll-view>

    <view class="composer">
      <view class="tool-btn" @tap="chooseImage">图片</view>
      <input
        v-model="draft"
        class="composer-input"
        placeholder="输入消息..."
        confirm-type="send"
        @confirm="sendText"
      />
      <view class="send-btn" :class="{ active: !!draft.trim() }" @tap="sendText"
        >发送</view
      >
    </view>
  </view>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useMerchantChatPage } from "@/shared-ui/merchantChatPage";

export default defineComponent({
  setup() {
    return useMerchantChatPage();
  },
});
</script>

<style scoped lang="scss" src="./chat.scss"></style>
