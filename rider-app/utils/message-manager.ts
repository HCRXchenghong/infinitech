/**
 * 全局消息管理器
 * 负责管理来自客服、商家、顾客和骑手的消息，
 * 并触发弹窗和原生通知。
 */

import notification from './notification'
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from '@/shared-ui/support-runtime'

declare const uni: any

export interface MessageData {
  id: string | number
  chatId: string | number
  sender: string
  senderId: string
  senderRole: 'admin' | 'merchant' | 'user' | 'rider'
  content: string
  messageType?: 'text' | 'image' | 'coupon' | 'order' | 'audio' | 'video'
  avatar?: string
  timestamp: number
}

class MessageManager {
  private currentChatId: string | number | null = null
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
      if (currentPage && currentPage.route === 'pages/service/index') {
        // @ts-ignore
        this.currentChatId = currentPage.$vm?.chatId || null
      }
    })

    uni.$on('onPageHide', () => {
      this.currentChatId = null
    })
  }

  setCurrentChatId(chatId: string | number | null) {
    this.currentChatId = chatId
  }

  getCurrentChatId(): string | number | null {
    return this.currentChatId
  }

  addListener(callback: (message: MessageData) => void) {
    this.listeners.push(callback)
  }

  removeListener(callback: (message: MessageData) => void) {
    const index = this.listeners.indexOf(callback)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  private notifyListeners(message: MessageData) {
    this.listeners.forEach((callback) => {
      try {
        callback(message)
      } catch (e) {
        console.error('消息监听器执行失败:', e)
      }
    })
  }

  handleNewMessage(message: MessageData) {
    if (this.currentChatId === message.chatId) {
      return
    }

    const riderId = uni.getStorageSync('riderId')
    if (String(message.senderId) === String(riderId)) {
      return
    }

    notification.notifyMessage({
      sender: message.sender,
      senderRole: message.senderRole,
      content: message.content,
      messageType: message.messageType,
      chatId: message.chatId
    })

    uni.$emit('show-message-popup', message)
    this.notifyListeners(message)
  }

  formatMessageContent(message: MessageData): string {
    if (message.messageType === 'image') return '[图片]'
    if (message.messageType === 'coupon') return '[优惠券]'
    if (message.messageType === 'order') return '[订单]'
    if (message.messageType === 'audio') return '[语音]'
    if (message.messageType === 'video') return '[视频]'

    let content = message.content || ''
    if (content.length > 50) {
      content = content.substring(0, 50) + '...'
    }
    return content
  }

  formatSenderName(message: MessageData): string {
    if (message.senderRole === 'admin') {
      return getCachedSupportRuntimeSettings().title
    }
    if (message.senderRole === 'merchant') {
      return message.sender || '商家'
    }
    if (message.senderRole === 'user') {
      return message.sender || '顾客'
    }
    if (message.senderRole === 'rider') {
      return message.sender || '骑手'
    }
    return message.sender || '发送者'
  }

  formatTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) {
      return '刚刚'
    }
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`
    }
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`
    }

    const date = new Date(timestamp)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  getSenderAvatar(message: MessageData): string {
    if (message.avatar) {
      return message.avatar
    }
    return '/static/images/logo.png'
  }

  navigateToChat(message: MessageData) {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const role =
      message.senderRole === 'merchant'
        ? 'merchant'
        : message.senderRole === 'user'
          ? 'user'
          : message.senderRole === 'rider'
            ? 'rider'
            : 'admin'
    const name = this.formatSenderName(message)
    const avatar = this.getSenderAvatar(message)

    if (currentPage && currentPage.route === 'pages/service/index') {
      // @ts-ignore
      const vm = currentPage.$vm
      if (vm && vm.switchChat) {
        vm.switchChat(message.chatId, { role, name, avatar })
      }
      return
    }

    uni.navigateTo({
      url:
        `/pages/service/index?chatId=${encodeURIComponent(String(message.chatId || ''))}` +
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
