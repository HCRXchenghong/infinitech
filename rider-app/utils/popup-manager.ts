/**
 * 全局弹窗管理器
 * 使用事件总线协调消息弹窗的显示与隐藏。
 */

declare const uni: any

class PopupManager {
  private isVisible = false
  private hideTimer: number | null = null
  private currentMessage: any = null

  init() {
    this.bindEvents()
  }

  private bindEvents() {
    uni.$on('show-message-popup', (message: any) => {
      this.show(message)
    })

    uni.$on('hide-message-popup', () => {
      this.hide()
    })

    uni.$on('test-popup-event', (message: any) => {
      this.show(message)
    })
  }

  show(message: any) {
    this.currentMessage = message
    this.isVisible = true

    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
    }

    this.hideTimer = setTimeout(() => {
      this.hide()
    }, 5000) as unknown as number

    uni.$emit('popup-state-change', {
      visible: true,
      message
    })
  }

  hide() {
    this.isVisible = false

    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }

    setTimeout(() => {
      this.currentMessage = null
    }, 300)

    uni.$emit('popup-state-change', {
      visible: false,
      message: null
    })
  }

  getState() {
    return {
      visible: this.isVisible,
      message: this.currentMessage
    }
  }

  handleClick() {
    if (this.currentMessage) {
      const messageManager = require('./message-manager').default
      messageManager.navigateToChat(this.currentMessage)
    }

    this.hide()
  }

  handleClose() {
    this.hide()
  }
}

const popupManager = new PopupManager()

export default popupManager
