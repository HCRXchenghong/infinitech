import Vue from 'vue'
import riderOrderStore, { advanceTask, loadRiderData } from '../../shared-ui/riderOrderStore'
import { loadTaskReportReasons } from '../../shared-ui/task-report-reasons'
import {
  callTaskPhone,
  navigateTask,
  openCustomerChat as openCustomerTaskChat,
  openMerchantChat as openMerchantTaskChat,
  submitTaskException
} from '../../shared-ui/taskActions'
import { createRiderTasksPageLogic } from '../../../packages/mobile-core/src/rider-tasks-page.js'

export default Vue.extend(createRiderTasksPageLogic({
  riderOrderStore,
  advanceTask,
  loadRiderData,
  loadTaskReportReasons,
  callTaskPhone,
  navigateTask,
  openCustomerTaskChat,
  openMerchantTaskChat,
  submitTaskException,
  uniApp: uni
}) as any)
