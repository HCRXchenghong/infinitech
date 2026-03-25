<template>
  <view class="page chat-page">
    <view class="chat-header">
      <view class="header-left" @tap="back">
        <image src="/static/icons/arrow-left.svg" mode="aspectFit" class="back-icon" />
      </view>
      <view class="header-center">
        <text class="chat-title">{{ title }}</text>
        <view v-if="role === 'rider'" class="chat-subtitle">
          <view class="online-indicator"></view>
          <text>配送中，预计 12:40 送达</text>
        </view>
      </view>
      <view class="header-right" @tap="showMore">
        <image src="/static/icons/more.svg" mode="aspectFit" class="more-icon" />
      </view>
    </view>

    <scroll-view
      ref="messageBox"
      scroll-y
      class="message-area"
      :scroll-into-view="scrollInto"
      :scroll-with-animation="true"
      @tap="closePanel"
    >
      <view class="message-list">
        <view
          v-for="m in messages"
          :key="m.mid"
          :id="'m-' + m.mid"
          class="message-item"
        >
          <view v-if="m.showTime" class="time-divider">
            <text>{{ m.time }}</text>
          </view>

          <view class="bubble-row" :class="{ 'is-self': m.from === 'me' }">
            <image
              v-if="m.from !== 'me'"
              :src="otherAvatar"
              mode="aspectFill"
              class="avatar"
            />

            <view v-if="m.from === 'me' && m.status === 'sending'" class="sending-indicator">
              <view class="loading-spinner"></view>
            </view>

            <view class="bubble" :class="m.from === 'me' ? 'bubble-self' : 'bubble-other'">
              <view v-if="m.officialIntervention" class="official-intervention">
                <text>{{ m.interventionLabel || '官方介入' }}</text>
              </view>
              <text v-if="m.type === 'text'" class="bubble-text">{{ m.text }}</text>
              <image
                v-else-if="m.type === 'image'"
                :src="m.text"
                mode="widthFix"
                class="bubble-image"
                @tap="previewImage(m.text)"
              />
              <view
                v-else-if="m.type === 'location'"
                class="bubble-location"
                @tap="openLocation(m)"
              >
                <view class="location-header">
                  <text class="location-title">位置消息</text>
                  <text class="location-action">点击查看</text>
                </view>
                <text class="location-address">{{ m.text }}</text>
              </view>
              <view
                v-else-if="m.type === 'audio'"
                class="bubble-audio"
                :class="{ playing: playingAudioId === m.mid }"
                @tap="playAudio(m)"
              >
                <text class="audio-label">{{ playingAudioId === m.mid ? '停止播放' : '播放语音' }}</text>
                <text class="audio-duration">{{ (m.meta && m.meta.durationLabel) || '1"' }}</text>
              </view>
              <text v-else class="bubble-text">{{ m.text }}</text>
            </view>

            <image
              v-if="m.from === 'me'"
              :src="userAvatar || '/static/images/my-avatar.svg'"
              mode="aspectFill"
              class="avatar"
            />
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="composer">
      <view class="composer-row">
        <view class="action-btn" :class="{ recording: isRecordingVoice }" @tap="toggleVoice">
          <image src="/static/icons/mic.svg" mode="aspectFit" class="action-icon" />
        </view>

        <view class="input-wrapper">
          <input
            v-model="draft"
            class="input-field"
            placeholder="发消息..."
            confirm-type="send"
            @confirm="send"
            @focus="closePanel"
          />
        </view>

        <view
          class="action-btn"
          :class="{ active: panelType === 'emoji' }"
          @tap="togglePanel('emoji')"
        >
          <image src="/static/icons/emoji.svg" mode="aspectFit" class="action-icon" />
        </view>

        <view
          v-if="!draft.trim()"
          class="action-btn"
          :class="{ active: panelType === 'plus' }"
          @tap="togglePanel('plus')"
        >
          <image src="/static/icons/plus-circle.svg" mode="aspectFit" class="action-icon" />
        </view>
        <view v-else class="send-btn" @tap="send">
          <text>发送</text>
        </view>
      </view>

      <view v-if="panelType" class="expand-panel">
        <view v-if="panelType === 'plus'" class="plus-panel">
          <view class="panel-item" @tap="chooseImage">
            <view class="panel-icon">
              <image src="/static/icons/image.svg" mode="aspectFit" />
            </view>
            <text>相册</text>
          </view>
          <view class="panel-item" @tap="takePhoto">
            <view class="panel-icon">
              <image src="/static/icons/camera.svg" mode="aspectFit" />
            </view>
            <text>拍照</text>
          </view>
          <view class="panel-item" @tap="sendLocation">
            <view class="panel-icon">
              <image src="/static/icons/location.svg" mode="aspectFit" />
            </view>
            <text>位置</text>
          </view>
        </view>

        <view v-if="panelType === 'emoji'" class="emoji-panel">
          <view class="emoji-grid">
            <text
              v-for="(emoji, idx) in emojis"
              :key="idx"
              class="emoji-item"
              @tap="insertEmoji(emoji)"
            >{{ emoji }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import pageLogic from './page-logic.js'

export default pageLogic
</script>

<style scoped lang="scss" src="./index.scss"></style>
