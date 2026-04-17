/**
 * 原生通知管理工具
 * 支持系统通知、声音提醒、震动提醒
 */

import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from '@/shared-ui/support-runtime'
import {
  classifyNotificationEnvelopeKind,
  createUniNotificationAudioManager,
} from '../../packages/client-sdk/src/notification-audio.js'
import config from '@/shared-ui/config'

declare const uni: any
declare const plus: any

export interface NotificationOptions {
  title: string
  content: string
  sound?: boolean
  vibrate?: boolean
  kind?: 'message' | 'order'
}

export interface NotificationSettings {
  messageNotice: boolean
  orderNotice: boolean
  vibrateNotice: boolean
}

const STORAGE_KEY = 'notification_settings'

const defaultSettings: NotificationSettings = {
  messageNotice: true,
  vibrateNotice: false,
  orderNotice: true
}

class NotificationManager {
  private settings: NotificationSettings = { ...defaultSettings }
  private isReady = false
  private platform: string = ''
  private soundManager = createUniNotificationAudioManager({
    defaultMessageSrc: '/static/audio/chat.mp3',
    defaultOrderSrc: '/static/audio/come.mp3',
    resolveRuntimeSettings: () => getCachedSupportRuntimeSettings(),
    resolveSettings: () => this.getSettings(),
    resolveRelativeUrl: (raw: string) => {
      const baseUrl = String(config.API_BASE_URL || '').replace(/\/+$/, '')
      return baseUrl ? `${baseUrl}${raw}` : raw
    },
    isEnabled: (kind: string, settings: NotificationSettings) =>
      kind === 'order' ? settings.orderNotice !== false : settings.messageNotice !== false,
    isVibrateEnabled: (_kind: string, settings: NotificationSettings) => settings.vibrateNotice === true,
  })
  private bridgeBound = false

  constructor() {
    void loadSupportRuntimeSettings()
    this.loadSettings()
    this.detectPlatform()
  }

  detectPlatform() {
    try {
      const systemInfo = uni.getSystemInfoSync()
      this.platform = systemInfo.platform || ''
    } catch (e) {}
  }

  loadSettings() {
    try {
      const saved = uni.getStorageSync(STORAGE_KEY)
      if (saved) {
        this.settings = { ...defaultSettings, ...saved }
      }
    } catch (e) {}
  }

  saveSettings() {
    try {
      uni.setStorageSync(STORAGE_KEY, this.settings)
    } catch (e) {}
  }

  getSettings(): NotificationSettings {
    return { ...this.settings }
  }

  updateSettings(key: keyof NotificationSettings, value: boolean) {
    this.settings[key] = value
    this.saveSettings()
  }

  async init() {
    this.bindSoundBridge()

    // #ifdef APP-PLUS
    // 等待 plus 就绪
    await new Promise<void>((resolve) => {
      if (typeof plus !== 'undefined') {
        resolve()
      } else {
        document.addEventListener('plusready', () => resolve(), false)
      }
    })

    try {
      if (typeof plus !== 'undefined' && this.platform === 'android') {
        const main = plus.android.runtimeMainActivity()
        if (main) {
          // 导入必要的类
          const NotificationManager = plus.android.importClass('android.app.NotificationManager')
          const NotificationChannel = plus.android.importClass('android.app.NotificationChannel')
          const Context = plus.android.importClass('android.content.Context')
          const Build = plus.android.importClass('android.os.Build')

          // 获取 NotificationManager
          const nm = main.getSystemService(Context.NOTIFICATION_SERVICE)

          // Android 8.0+ 需要创建通知渠道
          if (Build.VERSION.SDK_INT >= 26) {
            const channelId = 'rider_msg_001'
            const channelName = '骑手消息'
            const importance = 4 // NotificationManager.IMPORTANCE_HIGH

            // 使用 newObject 创建 NotificationChannel
            const channel = plus.android.newObject(
              'android.app.NotificationChannel',
              channelId,
              channelName,
              importance
            )

            // 设置渠道属性
            channel.setDescription('接收商家和顾客的消息通知')
            channel.enableLights(true)
            channel.enableVibration(true)

            // 创建通知渠道
            nm.createNotificationChannel(channel)
          }

          // Android 13+ 需要请求通知权限
          if (Build.VERSION.SDK_INT >= 33) {
            const Permission = plus.android.importClass('android.Manifest$permission')
            const PackageManager = plus.android.importClass('android.content.pm.PackageManager')

            const hasPermission = main.checkSelfPermission(Permission.POST_NOTIFICATIONS)
            if (hasPermission !== PackageManager.PERMISSION_GRANTED) {
              main.requestPermissions([Permission.POST_NOTIFICATIONS], 1001)
            }
          }
        }
      }
    } catch (e) {
      // Android init failure is non-fatal
    }
    // #endif

    this.isReady = true
  }

  /**
   * 显示本地通知
   */
  showLocalNotification(options: NotificationOptions) {
    const { title, content, sound, vibrate, kind = 'message' } = options
    const noticeEnabled = kind === 'order' ? this.settings.orderNotice : this.settings.messageNotice

    // 检查是否开启了消息通知
    if (!noticeEnabled) {
      if (vibrate && this.settings.vibrateNotice) {
        this.vibrate()
      }
      return
    }

    // 震动
    if (vibrate && this.settings.vibrateNotice) {
      this.vibrate()
    }

    // 声音
    if (sound) {
      this.playSound(kind)
    }

    // #ifdef APP-PLUS
    // 直接使用 plus.push.createMessage - 这是最可靠的方式
    try {
      if (typeof plus !== 'undefined' && plus.push) {
        plus.push.createMessage(content, title, {
          cover: true,
          when: new Date(),
          title: title
        })
        return
      }
    } catch (e) {
      // plus.push failure; fall through to fallback
    }

    // 降级方案
    try {
      if (typeof plus !== 'undefined' && plus.runtime) {
        plus.runtime.setBadgeNumber(1)
      }
    } catch (e) {}
    // #endif
  }

  /**
   * 震动
   */
  vibrate() {
    // #ifdef APP-PLUS
    try {
      if (typeof plus !== 'undefined' && plus.device) {
        plus.device.vibrate(200)
      }
    } catch (e) {}
    // #endif

    // #ifdef MP
    try {
      uni.vibrateShort({ type: 'heavy' })
    } catch (e) {}
    // #endif
  }

  /**
   * 播放自定义提示音
   */
  playSound(kind: 'message' | 'order' = 'message') {
    if (kind === 'order') {
      this.soundManager.playOrder()
      return
    }
    this.soundManager.playMessage()
  }

  /**
   * 清除所有通知
   */
  clearAll() {
    // #ifdef APP-PLUS
    try {
      if (typeof plus !== 'undefined' && plus.push) {
        plus.push.clear()
      }
    } catch (e) {}
    // #endif
  }

  /**
   * 发送消息通知（供外部调用）
   */
  notifyMessage(data: {
    sender: string
    senderRole: string
    content: string
    messageType?: string
    chatId?: string | number
  }) {
    let content = data.content

    if (data.messageType === 'image') content = '[图片]'
    else if (data.messageType === 'coupon') content = '[优惠券]'
    else if (data.messageType === 'order') content = '[订单]'
    else if (data.messageType === 'audio') content = '[语音]'
    else if (data.messageType === 'video') content = '[视频]'

    if (content.length > 50) {
      content = content.substring(0, 50) + '...'
    }

    let senderName = data.sender
    if (data.senderRole === 'admin') senderName = getCachedSupportRuntimeSettings().title
    else if (data.senderRole === 'merchant') senderName = '商家'
    else if (data.senderRole === 'user') senderName = '顾客'

    this.showLocalNotification({
      title: `${senderName}发来新消息`,
      content,
      sound: true,
      vibrate: true,
      kind: 'message'
    })
  }

  notifyOrder(data: {
    orderId?: string | number
    orderNo?: string | number
    amount?: string | number
    title?: string
    content?: string
  } = {}) {
    const orderNo = String(data.orderNo || data.orderId || '').trim()
    const amount = Number(data.amount || 0)
    const content = String(
      data.content ||
      (orderNo
        ? `订单号 #${orderNo}${amount > 0 ? `，金额 ¥${amount.toFixed(2)}` : ''}`
        : '有新的配送订单待处理')
    ).trim()

    this.showLocalNotification({
      title: String(data.title || '新订单来了').trim() || '新订单来了',
      content,
      sound: true,
      vibrate: true,
      kind: 'order'
    })
  }

  playMessageCue(extra: { vibrate?: boolean } = {}) {
    this.soundManager.playMessage(extra)
  }

  playOrderCue(extra: { vibrate?: boolean } = {}) {
    this.soundManager.playOrder(extra)
  }

  handleBusinessEnvelope(envelope: Record<string, any>) {
    const kind = classifyNotificationEnvelopeKind(envelope)
    if (kind === 'order') {
      this.playOrderCue()
      return
    }
    this.playMessageCue()
  }

  bindSoundBridge() {
    if (this.bridgeBound || typeof uni === 'undefined' || typeof uni.$on !== 'function') {
      return
    }
    this.bridgeBound = true
    const handler = (payload: Record<string, any>) => {
      this.handleBusinessEnvelope(payload)
    }
    uni.$off('realtime:notification', handler)
    uni.$off('push:received', handler)
    uni.$on('realtime:notification', handler)
    uni.$on('push:received', handler)
  }
}

const notificationManager = new NotificationManager()

export default notificationManager
