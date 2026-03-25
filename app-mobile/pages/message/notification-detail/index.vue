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
          <text>{{ article.title || '通知详情' }}</text>
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
import { fetchNotificationDetail, markNotificationRead } from '@/shared-ui/api.js'

const NOTIFICATION_READ_EVENT = 'official-notification-read'

export default {
  data() {
    return {
      loading: true,
      article: {
        title: '',
        time: '',
        source: '悦享e食',
        cover: '',
        blocks: []
      }
    }
  },
  onLoad(options) {
    const id = options.id
    if (id) {
      this.loadNotification(id)
    } else {
      uni.showToast({ title: '缺少通知ID', icon: 'none' })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  },
  methods: {
    async loadNotification(id) {
      this.loading = true
      try {
        const res = await fetchNotificationDetail(id)
        if (res.success && res.data) {
          const data = res.data
          this.article = {
            title: data.title || '',
            time: data.time || '',
            source: data.source || '悦享e食',
            cover: data.cover || '',
            blocks: this.parseContent(data.content)
          }
          this.markAsRead(id)
        } else {
          uni.showToast({ title: res.error || '获取通知失败', icon: 'none' })
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        }
      } catch (err) {
        console.error('加载通知失败:', err)
        uni.showToast({
          title: err.error || err.message || '加载失败，请检查网络',
          icon: 'none'
        })
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      } finally {
        this.loading = false
      }
    },
    async markAsRead(id) {
      try {
        await markNotificationRead(id)
        uni.$emit(NOTIFICATION_READ_EVENT, { id: String(id) })
      } catch (err) {
        console.error('标记通知已读失败:', err)
      }
    },
    parseContent(content) {
      if (!content) return []

      if (content.blocks && Array.isArray(content.blocks)) {
        return content.blocks
      }

      if (typeof content === 'object') {
        const blocks = []
        if (content.text) {
          blocks.push({ type: 'p', text: content.text })
        }
        return blocks.length > 0 ? blocks : [{ type: 'p', text: '暂无内容' }]
      }

      if (typeof content === 'string') {
        return [{ type: 'p', text: content }]
      }

      return []
    },
    back() {
      uni.navigateBack()
    },
    preview(url) {
      if (url) {
        uni.previewImage({ urls: [url] })
      }
    }
  }
}
</script>

<style scoped lang="scss">
.article-page {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 89px;
  padding-top: 45px;
  display: flex;
  align-items: center;
  background: #fff;
  box-sizing: border-box;
  border-bottom: 1px solid #f2f3f5;
}

.nav-left,
.nav-right {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  width: 22px;
  height: 22px;
  opacity: 0.85;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: #111827;
}

.scroll {
  position: fixed;
  top: 89px;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

.article {
  padding: 0 16px 28px;
  margin: 0;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.5;
  margin-top: 0;
  margin-bottom: 0;
  padding-top: 0;
}

.meta {
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-time {
  color: #9ca3af;
}

.meta-dot {
  color: #d1d5db;
}

.meta-source {
  color: #6b7280;
}

.cover {
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  display: block;
}

.body {
  margin-top: 12px;
}

.p {
  font-size: 15px;
  color: #374151;
  line-height: 1.7;
  margin: 8px 0;
}

.h2 {
  margin-top: 16px;
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.quote {
  margin: 12px 0;
  padding: 10px 12px;
  background: #f9fafb;
  border-left: 3px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
}

.ul {
  margin: 8px 0;
}

.li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 6px 0;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #9ca3af;
  margin-top: 8px;
  flex-shrink: 0;
}

.li-text {
  flex: 1;
  font-size: 15px;
  color: #374151;
  line-height: 1.6;
}

.img {
  margin: 12px 0;
}

.img-el {
  width: 100%;
  display: block;
  border-radius: 6px;
}

.img-cap {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
}

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
}

.loading-text {
  font-size: 14px;
  color: #9ca3af;
}

.empty-content {
  padding: 60px 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}
</style>
