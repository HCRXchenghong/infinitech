import Vue from 'vue'
import riderOrderStore, { advanceTask } from '../../shared-ui/riderOrderStore'
import { loadTaskReportReasons } from '../../shared-ui/task-report-reasons'
import { callTaskPhone, navigateTask, openTaskChat, submitTaskException } from '../../shared-ui/taskActions'
import { createRiderTaskDetailPageLogic } from '../../../packages/mobile-core/src/rider-task-detail-page.js'

export default Vue.extend(createRiderTaskDetailPageLogic({
  riderOrderStore,
  advanceTask,
  loadTaskReportReasons,
  callTaskPhone,
  navigateTask,
  openTaskChat,
  submitTaskException,
  uniApp: uni
}) as any)
