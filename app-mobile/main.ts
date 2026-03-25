// Vue2 uni-app 入口
import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false
;(App as any).mpType = 'app'

const app = new Vue({
  ...App
})
app.$mount()

