/**
 * 全局弹窗管理器
 * 使用编程式创建弹窗组件，确保在所有页面都能显示
 */

declare const uni: any
declare const Vue: any

class PopupManager {
  private popupInstance: any = null
  private container: any = null
  private isVisible = false
  private hideTimer: number | null = null
  private currentMessage: any = null

  /**
   * 初始化弹窗管理器
   */
  init() {
    this.createContainer()
    this.bindEvents()
  }

  /**
   * 创建弹窗容器
   */
  private createContainer() {
    // 在 APP-PLUS 环境下，使用 plus.nativeObj.View 或原生 View
    // 但为了兼容性，我们使用事件总线 + 页面级组件的方式
  }

  /**
   * 绑定事件
   */
  private bindEvents() {
    // 监听显示弹窗事件
    uni.$on('show-message-popup', (message: any) => {
      this.show(message)
    })

    // 监听隐藏弹窗事件
    uni.$on('hide-message-popup', () => {
      this.hide()
    })

    // 监听测试事件
    uni.$on('test-popup-event', (message: any) => {
      this.show(message)
    })
  }

  /**
   * 显示弹窗
   */
  show(message: any) {
    this.currentMessage = message
    this.isVisible = true

    // 清除之前的隐藏定时器
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
    }

    // 5秒后自动隐藏
    this.hideTimer = setTimeout(() => {
      this.hide()
    }, 5000) as unknown as number

    // 通知所有页面更新弹窗状态
    uni.$emit('popup-state-change', {
      visible: true,
      message: message
    })
  }

  /**
   * 隐藏弹窗
   */
  hide() {
    this.isVisible = false

    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }

    // 延迟清空消息，等待动画完成
    setTimeout(() => {
      this.currentMessage = null
    }, 300)

    // 通知所有页面更新弹窗状态
    uni.$emit('popup-state-change', {
      visible: false,
      message: null
    })
  }

  /**
   * 获取当前弹窗状态
   */
  getState() {
    return {
      visible: this.isVisible,
      message: this.currentMessage
    }
  }

  /**
   * 点击弹窗内容
   */
  handleClick() {
    if (this.currentMessage) {
      // 跳转到聊天页面
      const messageManager = require('./message-manager').default
      messageManager.navigateToChat(this.currentMessage)
    }

    this.hide()
  }

  /**
   * 点击关闭按钮
   */
  handleClose() {
    this.hide()
  }
}

// 单例
const popupManager = new PopupManager()

export default popupManager
