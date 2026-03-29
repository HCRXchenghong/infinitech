import Vue from 'vue'
import riderOrderStore, { advanceTask } from '../../shared-ui/riderOrderStore'
import { DEFAULT_REPORT_REASONS, loadTaskReportReasons } from '../../shared-ui/task-report-reasons'
import { callTaskPhone, navigateTask, openTaskChat, submitTaskException } from '../../shared-ui/taskActions'

export default Vue.extend({
  data() {
    return {
      taskId: '',
      showReport: false,
      reportReasons: [...DEFAULT_REPORT_REASONS],
    }
  },
  computed: {
    task() {
      return riderOrderStore.myOrders.find((o: any) => o.id === this.taskId)
    },
  },
  onLoad(options: any) {
    this.taskId = String((options && options.id) || '').trim()
    this.loadReportReasons()
  },
  methods: {
    async loadReportReasons() {
      this.reportReasons = await loadTaskReportReasons()
    },
    formatTaskDistance(task: any) {
      if (!task) return '--'
      if (task.status === 'pending') {
        if (task.shopDistance === '' || task.shopDistance === '--' || task.shopDistance === null || task.shopDistance === undefined) {
          return '--'
        }
        return `${task.shopDistance}m`
      }
      if (
        task.customerDistance === '' ||
        task.customerDistance === '--' ||
        task.customerDistance === null ||
        task.customerDistance === undefined
      ) {
        return '--'
      }
      return `${task.customerDistance}km`
    },

    callPhone() {
      if (!this.task) {
        uni.showToast({ title: '订单信息异常', icon: 'none' })
        return
      }
      callTaskPhone(this.task)
    },

    sendMessage() {
      if (!this.task) {
        uni.showToast({ title: '订单信息异常', icon: 'none' })
        return
      }
      openTaskChat(this.task)
    },

    navigate(task: any) {
      if (!task) {
        uni.showToast({ title: '订单信息异常', icon: 'none' })
        return
      }
      navigateTask(task)
    },

    completeTask() {
      if (!this.task) return

      const previousStatus = this.task.status
      const actionText = previousStatus === 'pending' ? '已到店' : '送达'

      uni.showModal({
        title: '确认操作',
        content: `确认${actionText}吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await advanceTask(this.taskId)

              if (previousStatus === 'delivering') {
                uni.showToast({
                  title: '订单已完成！',
                  icon: 'success',
                })
                setTimeout(() => {
                  uni.navigateBack()
                }, 1500)
              } else {
                uni.showToast({
                  title: '开始配送！',
                  icon: 'success',
                })
              }
            } catch (_err) {
              uni.showToast({
                title: '操作失败',
                icon: 'none',
              })
            }
          }
        },
      })
    },

    async handleReport(reason: string) {
      if (!this.task) {
        uni.showToast({ title: '订单信息异常', icon: 'none' })
        return
      }

      uni.showLoading({ title: '提交中...' })

      try {
        await submitTaskException(this.task, reason)
        this.showReport = false
        uni.showToast({
          title: '上报成功',
          icon: 'success',
        })
      } catch (err: any) {
        uni.showToast({
          title: err?.error || err?.message || '上报失败',
          icon: 'none',
        })
      } finally {
        uni.hideLoading()
      }
    },
  },
})
