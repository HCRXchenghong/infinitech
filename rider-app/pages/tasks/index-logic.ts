import Vue from 'vue'
import riderOrderStore, { advanceTask, loadRiderData } from '../../shared-ui/riderOrderStore'
import { DEFAULT_REPORT_REASONS, loadTaskReportReasons } from '../../shared-ui/task-report-reasons'
import {
  callTaskPhone,
  navigateTask,
  openCustomerChat as openCustomerTaskChat,
  openMerchantChat as openMerchantTaskChat,
  submitTaskException
} from '../../shared-ui/taskActions'

export default Vue.extend({
  data() {
    return {
      statusBarHeight: 44,
      navbarHeight: 0,
      tabsHeight: 0,
      layoutReady: false,
      currentTab: 0,
      showReport: false,
      showContact: false,
      currentTask: null as any,
      reportReasons: [...DEFAULT_REPORT_REASONS],
      isNavigating: false
    }
  },
  computed: {
    tabs() {
      return [
        {
          label: '待取货',
          count: riderOrderStore.myOrders.filter((o: any) => o.status === 'pending')
            .length
        },
        {
          label: '配送中',
          count: riderOrderStore.myOrders.filter((o: any) => o.status === 'delivering')
            .length
        }
      ]
    },
    filteredTasks() {
      const status = this.currentTab === 0 ? 'pending' : 'delivering'
      return riderOrderStore.myOrders.filter((o: any) => o.status === status)
    },
    tabsStyle() {
      if (!this.layoutReady) return {}
      return {
        top: `${this.navbarHeight}px`
      }
    },
    taskListStyle() {
      if (!this.layoutReady) return {}
      const topOffset = this.navbarHeight + this.tabsHeight
      return {
        marginTop: `${topOffset}px`,
        height: `calc(100vh - ${topOffset}px)`
      }
    }
  },
  onLoad() {
    const systemInfo = uni.getSystemInfoSync()
    this.statusBarHeight = systemInfo.statusBarHeight || 44
    this.loadReportReasons()
  },
  onReady() {
    this.measureLayout()
  },
  async onShow() {
    await loadRiderData()
  },
  methods: {
    async loadReportReasons() {
      this.reportReasons = await loadTaskReportReasons()
    },
    measureLayout() {
      this.$nextTick(() => {
        const query = uni.createSelectorQuery().in(this)
        query.select('.custom-navbar').boundingClientRect()
        query.select('.tabs-wrapper').boundingClientRect()
        query.exec((res) => {
          const navbarRect = res && res[0] ? res[0] : null
          const tabsRect = res && res[1] ? res[1] : null
          const navbarHeight = navbarRect && navbarRect.height ? navbarRect.height : 0
          const tabsHeight = tabsRect && tabsRect.height ? tabsRect.height : 0
          if (navbarHeight) this.navbarHeight = navbarHeight
          if (tabsHeight) this.tabsHeight = tabsHeight
          this.layoutReady = navbarHeight > 0 && tabsHeight > 0
        })
      })
    },
    goToHall() {
      if (this.isNavigating) return
      
      this.isNavigating = true
      uni.switchTab({
        url: '/pages/hall/index'
      })
      setTimeout(() => {
        this.isNavigating = false
      }, 300)
    },
    
    goToDetail(task: any) {
      if (this.isNavigating) return
      
      this.isNavigating = true
      uni.navigateTo({
        url: `/pages/tasks/detail?id=${task.id}`
      })
      setTimeout(() => {
        this.isNavigating = false
      }, 300)
    },

    async handleAdvanceTask(task: any) {
      const actionText = task.status === 'pending' ? '已到店' : '送达'

      uni.showModal({
        title: '确认操作',
        content: `确认${actionText}吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              const previousStatus = task.status
              await advanceTask(task.id)

              if (previousStatus === 'delivering') {
                uni.showToast({ title: '订单已完成！', icon: 'success' })
              } else {
                uni.showToast({ title: '开始配送！', icon: 'success' })
                this.currentTab = 1
              }
            } catch (err) {
              uni.showToast({ title: '操作失败', icon: 'error' })
            }
          }
        }
      })
    },

    callCustomer(task: any) {
      this.currentTask = task
      this.showContact = true
    },

    openCustomerChat(task: any) {
      this.showContact = false
      openCustomerTaskChat(task)
    },

    openMerchantChat(task: any) {
      this.showContact = false
      openMerchantTaskChat(task)
    },

    callCustomerPhone(task: any) {
      this.showContact = false
      callTaskPhone(task)
    },

    navigate(task: any) {
      navigateTask(task)
    },

    showReportModal(task: any) {
      this.currentTask = task
      this.showReport = true
    },

    async handleReport(reason: string) {
      if (!this.currentTask) {
        uni.showToast({ title: '订单信息异常', icon: 'none' })
        return
      }

      uni.showLoading({ title: '提交中...' })
      try {
        await submitTaskException(this.currentTask, reason)
        this.showReport = false
        uni.showToast({
          title: '上报成功',
          icon: 'success'
        })
      } catch (err: any) {
        uni.showToast({
          title: err?.error || err?.message || '上报失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    }
  }
})
