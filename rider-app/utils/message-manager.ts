/**
 * Global message manager for the rider app.
 * It centralizes popup notifications, in-app routing, and lightweight listeners.
 */

import notification from './notification'
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from '@/shared-ui/support-runtime'

declare const uni: any

const DEFAULT_AVATAR = '/static/images/logo.png'
const SERVICE_ROUTE = 'pages/service/index'

type SenderRole = 'admin' | 'merchant' | 'user' | 'rider'

export interface MessageData {
  id: string | number
  chatId: string | number
  sender: string
  senderId: string
  senderRole: SenderRole
  content: string
  messageType?: 'text' | 'image' | 'coupon' | 'order' | 'audio' | 'video'
  avatar?: string
  timestamp: number
}

class MessageManager {
  private currentChatId: string | null = null
  private listeners: Array<(message: MessageData) => void> = []

  constructor() {
    void loadSupportRuntimeSettings()
    this.init()
  }

  private init() {
    notification.init()

    uni.$on('onPageShow', () => {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      if (currentPage && currentPage.route === SERVICE_ROUTE) {
        // @ts-ignore
        this.currentChatId = this.normalizeChatId(currentPage.$vm?.chatId)
      }
    })

    uni.$on('onPageHide', () => {
      this.currentChatId = null
    })
  }

  private normalizeChatId(chatId: string | number | null | undefined): string | null {
    if (chatId === undefined || chatId === null) return null
    const normalized = String(chatId).trim()
    return normalized || null
  }

  private notifyListeners(message: MessageData) {
    this.listeners.forEach((callback) => {
      try {
        callback(message)
      } catch (error) {
        console.error('[MessageManager] Listener execution failed:', error)
      }
    })
  }

  setCurrentChatId(chatId: string | number | null) {
    this.currentChatId = this.normalizeChatId(chatId)
  }

  getCurrentChatId(): string | null {
    return this.currentChatId
  }

  addListener(callback: (message: MessageData) => void) {
    this.listeners.push(callback)
  }

  removeListener(callback: (message: MessageData) => void) {
    const index = this.listeners.indexOf(callback)
    if (index >= 0) {
      this.listeners.splice(index, 1)
    }
  }

  handleNewMessage(message: MessageData) {
    const incomingChatId = this.normalizeChatId(message.chatId)
    if (incomingChatId && this.currentChatId === incomingChatId) {
      return
    }

    const riderId = String(uni.getStorageSync('riderId') || '')
    if (String(message.senderId) === riderId) {
      return
    }

    notification.notifyMessage({
      sender: this.formatSenderName(message),
      senderRole: message.senderRole,
      content: this.formatMessageContent(message),
      messageType: message.messageType,
      chatId: incomingChatId || ''
    })

    uni.$emit('show-message-popup', {
      ...message,
      chatId: incomingChatId || ''
    })

    this.notifyListeners(message)
  }

  formatMessageContent(message: MessageData): string {
    if (message.messageType === 'image') return '[图片]'
    if (message.messageType === 'coupon') return '[优惠券]'
    if (message.messageType === 'order') return '[订单]'
    if (message.messageType === 'audio') return '[语音]'
    if (message.messageType === 'video') return '[视频]'

    const content = String(message.content || '').trim()
    if (!content) return '[暂无内容]'
    if (content.length <= 50) return content
    return `${content.slice(0, 50)}...`
  }

  formatSenderName(message: MessageData): string {
    if (message.senderRole === 'admin') {
      return getCachedSupportRuntimeSettings().title || '平台客服'
    }
    if (message.senderRole === 'merchant') {
      return message.sender || '商家'
    }
    if (message.senderRole === 'user') {
      return message.sender || '用户'
    }
    if (message.senderRole === 'rider') {
      return message.sender || '骑手'
    }
    return message.sender || '消息发送方'
  }

  formatTime(timestamp: number): string {
    const safeTimestamp = Number(timestamp)
    if (!Number.isFinite(safeTimestamp) || safeTimestamp <= 0) {
      return '刚刚'
    }

    const diff = Date.now() - safeTimestamp
    if (diff < 60_000) return '刚刚'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`

    const date = new Date(safeTimestamp)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  getSenderAvatar(message: MessageData): string {
    return message.avatar || DEFAULT_AVATAR
  }

  navigateToChat(message: MessageData) {
    const chatId = this.normalizeChatId(message.chatId)
    if (!chatId) {
      uni.showToast({
        title: '会话信息缺失',
        icon: 'none'
      })
      return
    }

    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const role: SenderRole =
      message.senderRole === 'merchant'
        ? 'merchant'
        : message.senderRole === 'user'
          ? 'user'
          : message.senderRole === 'rider'
            ? 'rider'
            : 'admin'

    const name = this.formatSenderName(message)
    const avatar = this.getSenderAvatar(message)

    if (currentPage && currentPage.route === SERVICE_ROUTE) {
      // @ts-ignore
      const vm = currentPage.$vm
      if (vm && typeof vm.switchChat === 'function') {
        vm.switchChat(chatId, { role, name, avatar })
      }
      return
    }

    uni.navigateTo({
      url:
        `/pages/service/index?chatId=${encodeURIComponent(chatId)}` +
        `&role=${encodeURIComponent(role)}` +
        `&name=${encodeURIComponent(name)}` +
        `&avatar=${encodeURIComponent(avatar)}`,
      fail: () => {
        uni.showToast({
          title: '打开聊天失败',
          icon: 'none'
        })
      }
    })

    this.hidePopup()
  }

  hidePopup() {
    uni.$emit('hide-message-popup')
  }
}

const messageManager = new MessageManager()

export default messageManager
