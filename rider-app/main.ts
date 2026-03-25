// Vue2 uni-app 入口 - 骑手端
import Vue from 'vue'
import App from './App.vue'
import MessagePopup from './components/message-popup.vue'
import popupManager from './utils/popup-manager'

Vue.config.productionTip = false
;(App as any).mpType = 'app'

// 全局注册消息弹窗组件
Vue.component('message-popup', MessagePopup)

// 初始化弹窗管理器
popupManager.init()

const app = new Vue({
  ...App
})
app.$mount()
