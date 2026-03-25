/**
 * 全局混入
 * 自动为所有页面添加消息弹窗功能
 */

declare const uni: any

export default {
  onShow() {
    // 每次页面显示时，检查是否需要初始化弹窗
    // 这确保了即使弹窗组件被销毁，也能重新显示
  }
}
