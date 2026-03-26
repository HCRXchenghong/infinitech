/**
 * 全局消息管理器
 * 负责管理来自各个渠道的消息（客服、商家、顾客）
 * 并触发弹窗和原生通知
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

export interface ChatSession {
  chatId: string | number
  sender: string
  senderId: string
  senderRole: string
  avatar: string | null
  lastMessage: string
  timestamp: number
  unreadCount: number
}

class MessageManager {
  private currentChatId: string | number | null = null
  private messageQueue: MessageData[] = []
  private isPopupVisible = false
  private listeners: Array<(message: MessageData) => void> = []

  constructor() {
    void loadSupportRuntimeSettings()
    this.init()
  }

  private init() {
    // 初始化通知管理器
    notification.init()

    // 监听页面显示事件，重置当前聊天状态
    uni.$on('onPageShow', () => {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      if (currentPage && currentPage.route === 'pages/service/index') {
        // 在客服页面，从页面实例获取chatId
        // @ts-ignore
        this.currentChatId = currentPage.$vm?.chatId || null
      }
    })

    // 监听页面隐藏事件
    uni.$on('onPageHide', () => {
      // 页面隐藏时重置
      this.currentChatId = null
    })
  }

  /**
   * 设置当前正在查看的聊天ID
   * 如果正在查看该聊天，则不显示弹窗
   */
  setCurrentChatId(chatId: string | number | null) {
    this.currentChatId = chatId
    if (chatId !== null && chatId !== undefined && chatId !== '') {
      this.clearUnreadMessages(chatId)
    }
  }

  /**
   * 获取当前聊天ID
   */
  getCurrentChatId(): string | number | null {
    return this.currentChatId
  }

  /**
   * 添加消息监听器
   */
  addListener(callback: (message: MessageData) => void) {
    this.listeners.push(callback)
  }

  /**
   * 移除消息监听器
   */
  removeListener(callback: (message: MessageData) => void) {
    const index = this.listeners.indexOf(callback)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(message: MessageData) {
    this.listeners.forEach(callback => {
      try {
        callback(message)
      } catch (e) {
        console.error('消息监听器执行失败:', e)
      }
    })
  }

  /**
   * 处理新消息
   */
  handleNewMessage(message: MessageData) {
    // 检查是否是当前正在查看的聊天
    if (this.currentChatId === message.chatId) {
      return
    }

    // 检查是否是自己发的消息
    const riderId = uni.getStorageSync('riderId')
    if (String(message.senderId) === String(riderId)) {
      return
    }

    // 保存到消息队列
    this.messageQueue.push(message)

    // 限制队列大小
    if (this.messageQueue.length > 10) {
      this.messageQueue.shift()
    }

    // 显示原生通知
    notification.notifyMessage({
      sender: message.sender,
      senderRole: message.senderRole,
      content: message.content,
      messageType: message.messageType,
      chatId: message.chatId
    })

    // 触发弹窗事件
    uni.$emit('show-message-popup', message)

    // 通知所有监听器
    this.notifyListeners(message)
  }

  /**
   * 格式化消息内容
   */
  formatMessageContent(message: MessageData): string {
    if (message.messageType === 'image') {
      return '[图片]'
    } else if (message.messageType === 'coupon') {
      return '[优惠券]'
    } else if (message.messageType === 'order') {
      return '[订单]'
    } else if (message.messageType === 'audio') {
      return '[语音]'
    } else if (message.messageType === 'video') {
      return '[视频]'
    }

    // 文本消息，限制长度
    let content = message.content || ''
    if (content.length > 50) {
      content = content.substring(0, 50) + '...'
    }
    return content
  }

  /**
   * 格式化发送者名称
   */
  formatSenderName(message: MessageData): string {
    if (message.senderRole === 'admin') {
      return getCachedSupportRuntimeSettings().title
    } else if (message.senderRole === 'merchant') {
      return message.sender || '商家'
    } else if (message.senderRole === 'user') {
      return message.sender || '顾客'
    } else if (message.senderRole === 'rider') {
      return message.sender || '骑手'
    }
    return message.sender || '发送者'
  }

  /**
   * 格式化时间
   */
  formatTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) {
      return '刚刚'
    } else if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前'
    } else if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前'
    } else {
      const date = new Date(timestamp)
      return `${date.getMonth() + 1}/${date.getDate()}`
    }
  }

  /**
   * 获取发送者头像
   */
  getSenderAvatar(message: MessageData): string {
    if (message.avatar) {
      return message.avatar
    }

    // 根据角色返回默认头像
    if (message.senderRole === 'admin') {
      return '/static/images/logo.png'
    } else if (message.senderRole === 'merchant') {
      return '/static/images/logo.png'
    } else if (message.senderRole === 'user') {
      return '/static/images/logo.png'
    }

    return '/static/images/logo.png'
  }

  /**
   * 跳转到聊天页面
   */
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

    // 检查当前是否已经在客服页面
    if (currentPage && currentPage.route === 'pages/service/index') {
      // 如果已经在客服页面，通知页面切换聊天
      // @ts-ignore
      const vm = currentPage.$vm
      if (vm && vm.switchChat) {
        vm.switchChat(message.chatId, { role, name, avatar })
      }
      return
    }

    // 跳转到客服页面
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

    // 隐藏弹窗
    this.hidePopup()
  }

  /**
   * 隐藏弹窗
   */
  hidePopup() {
    uni.$emit('hide-message-popup')
  }

  /**
   * 清空消息队列
   */
  clearQueue() {
    this.messageQueue = []
  }

  /**
   * 获取未读消息数量
   */
  getUnreadCount(): number {
    return this.messageQueue.length
  }

  /**
   * 设置弹窗可见状态
   */
  setPopupVisible(visible: boolean) {
    this.isPopupVisible = visible
  }

  /**
   * 获取弹窗可见状态
   */
  isPopupCurrentlyVisible(): boolean {
    return this.isPopupVisible
  }

  /**
   * 保存未读消息到本地存储
   */
  saveUnreadMessage(message: MessageData) {
    try {
      const key = `unread_messages_${message.chatId}`
      let messages: MessageData[] = uni.getStorageSync(key) || []
      messages.push(message)

      // 限制存储数量
      if (messages.length > 50) {
        messages = messages.slice(-50)
      }

      uni.setStorageSync(key, messages)
    } catch (e) {
      console.error('保存未读消息失败:', e)
    }
  }

  /**
   * 清除指定聊天的未读消息
   */
  clearUnreadMessages(chatId: string | number) {
    try {
      const key = `unread_messages_${chatId}`
      uni.removeStorageSync(key)
    } catch (e) {
      console.error('清除未读消息失败:', e)
    }
  }

  /**
   * 获取指定聊天的未读消息
   */
  getUnreadMessages(chatId: string | number): MessageData[] {
    try {
      const key = `unread_messages_${chatId}`
      return uni.getStorageSync(key) || []
    } catch (e) {
      console.error('获取未读消息失败:', e)
      return []
    }
  }
}

// 单例导出
const messageManager = new MessageManager()

export default messageManager
