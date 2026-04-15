<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h2>同频饭友治理</h2>
        <p>统一管理运行时配置、组局治理、消息举报、敏感词、用户限制与审计日志。</p>
      </div>
      <div class="page-actions">
        <el-button size="small" :loading="pageLoading" @click="loadAll(true)">刷新全部</el-button>
      </div>
    </div>

    <PageStateAlert :message="pageError" />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="运行时配置" name="runtime">
        <el-card shadow="never" v-loading="runtimeLoading">
          <template #header>
            <div class="card-title-row">
              <span>前台运行配置</span>
              <el-button type="primary" :loading="runtimeSaving" @click="saveRuntimeSettings">保存运行配置</el-button>
            </div>
          </template>

          <el-form label-width="140px">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-form-item label="总开关">
                  <el-switch v-model="runtimeForm.enabled" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="日发布上限">
                  <el-input-number v-model="runtimeForm.publish_limit_per_day" :min="1" :max="20" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="分钟发言限流">
                  <el-input-number v-model="runtimeForm.message_rate_limit_per_minute" :min="1" :max="120" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="自动关组时长">
                  <el-input-number v-model="runtimeForm.auto_close_expired_hours" :min="1" :max="168" style="width: 100%;" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="欢迎标题">
                  <el-input v-model="runtimeForm.welcome_title" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="欢迎副标题">
                  <el-input v-model="runtimeForm.welcome_subtitle" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="默认人数上限">
                  <el-input-number v-model="runtimeForm.default_max_people" :min="2" :max="20" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="最大人数上限">
                  <el-input-number v-model="runtimeForm.max_max_people" :min="2" :max="20" style="width: 100%;" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>

          <el-divider>分类配置</el-divider>
          <div v-for="category in sortedRuntimeCategories" :key="category.id" class="runtime-block">
            <el-row :gutter="12">
              <el-col :span="4">
                <el-form-item label="分类 ID">
                  <el-input :model-value="category.id" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="5">
                <el-form-item label="名称">
                  <el-input v-model="category.label" />
                </el-form-item>
              </el-col>
              <el-col :span="5">
                <el-form-item label="图标">
                  <el-input v-model="category.icon" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="颜色">
                  <el-input v-model="category.color" />
                </el-form-item>
              </el-col>
              <el-col :span="3">
                <el-form-item label="排序">
                  <el-input-number v-model="category.sort_order" :min="0" :step="10" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="3">
                <el-form-item label="启用">
                  <el-switch v-model="category.enabled" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <el-divider>欢迎问卷</el-divider>
          <div v-for="(question, index) in runtimeForm.questions" :key="question.localKey" class="runtime-block">
            <div class="block-toolbar">
              <strong>问题 {{ index + 1 }}</strong>
              <el-button size="small" text type="danger" @click="removeQuestion(index)">删除</el-button>
            </div>
            <el-form-item label="题干">
              <el-input v-model="question.question" />
            </el-form-item>
            <div v-for="(option, optionIndex) in question.options" :key="option.localKey" class="option-row">
              <el-input v-model="option.text" placeholder="选项文案" />
              <el-input v-model="option.icon" placeholder="图标/emoji" />
              <el-button text type="danger" @click="removeQuestionOption(index, optionIndex)">删除</el-button>
            </div>
            <el-button size="small" @click="addQuestionOption(index)">新增选项</el-button>
          </div>
          <el-button size="small" @click="addQuestion">新增问卷题目</el-button>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="组局管理" name="parties">
        <el-card shadow="never">
          <template #header>
            <div class="card-title-row">
              <span>组局列表</span>
              <div class="inline-filters">
                <el-select v-model="partyFilters.status" clearable placeholder="状态" size="small" style="width: 120px;">
                  <el-option label="开放中" value="open" />
                  <el-option label="满员" value="full" />
                  <el-option label="已关闭" value="closed" />
                </el-select>
                <el-select v-model="partyFilters.category" clearable placeholder="分类" size="small" style="width: 120px;">
                  <el-option label="聊天" value="chat" />
                  <el-option label="约饭" value="food" />
                  <el-option label="学习" value="study" />
                </el-select>
                <el-input v-model="partyFilters.search" clearable placeholder="搜索标题/发起人" size="small" style="width: 220px;" />
                <el-button size="small" :loading="partiesLoading" @click="loadParties(true)">查询</el-button>
              </div>
            </div>
          </template>

          <el-table :data="parties" v-loading="partiesLoading" size="small" border>
            <el-table-column prop="title" label="组局标题" min-width="180" />
            <el-table-column prop="category" label="分类" width="100" />
            <el-table-column prop="host_name" label="发起人" width="120" />
            <el-table-column label="人数" width="100">
              <template #default="{ row }">{{ row.current_members || row.current || 0 }}/{{ row.max_people || row.max || 0 }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100" />
            <el-table-column prop="created_at" label="创建时间" width="180" />
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button size="small" text @click="openPartyDrawer(row)">详情</el-button>
                <el-button size="small" text @click="openMessageDrawer(row)">消息治理</el-button>
                <el-button v-if="row.status !== 'closed'" size="small" text type="danger" @click="changePartyStatus(row, 'close')">关闭</el-button>
                <el-button v-else size="small" text type="success" @click="changePartyStatus(row, 'reopen')">重开</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty :description="partiesLoading ? '加载中...' : '暂无组局数据'" :image-size="90" />
            </template>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="举报中心" name="reports">
        <el-card shadow="never">
          <template #header>
            <div class="card-title-row">
              <span>举报列表</span>
              <div class="inline-filters">
                <el-select v-model="reportStatus" clearable placeholder="状态" size="small" style="width: 140px;">
                  <el-option label="待处理" value="pending" />
                  <el-option label="已处理" value="resolved" />
                  <el-option label="已驳回" value="rejected" />
                </el-select>
                <el-button size="small" :loading="reportsLoading" @click="loadReports(true)">查询</el-button>
              </div>
            </div>
          </template>

          <el-table :data="reports" v-loading="reportsLoading" size="small" border>
            <el-table-column prop="target_type" label="举报对象" width="110" />
            <el-table-column prop="target_id" label="对象 ID" width="170" />
            <el-table-column prop="reporter_name" label="举报人" width="120" />
            <el-table-column prop="reason" label="举报原因" min-width="180" />
            <el-table-column prop="status" label="状态" width="100" />
            <el-table-column prop="created_at" label="提交时间" width="180" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" text type="success" @click="handleReport(row, 'resolve')">受理</el-button>
                <el-button size="small" text type="danger" @click="handleReport(row, 'reject')">驳回</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="敏感词" name="sensitive-words">
        <el-card shadow="never">
          <template #header>
            <div class="card-title-row">
              <span>敏感词管理</span>
              <div class="inline-filters">
                <el-button size="small" :loading="sensitiveLoading" @click="loadSensitiveWords(true)">刷新</el-button>
                <el-button size="small" type="primary" @click="openSensitiveDialog()">新增敏感词</el-button>
              </div>
            </div>
          </template>

          <el-table :data="sensitiveWords" v-loading="sensitiveLoading" size="small" border>
            <el-table-column prop="word" label="敏感词" min-width="180" />
            <el-table-column prop="description" label="说明" min-width="220" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="row.enabled ? 'danger' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="updated_at" label="更新时间" width="180" />
            <el-table-column label="操作" width="180">
              <template #default="{ row }">
                <el-button size="small" text @click="openSensitiveDialog(row)">编辑</el-button>
                <el-button size="small" text type="danger" @click="deleteSensitiveWord(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="用户限制" name="restrictions">
        <el-card shadow="never">
          <template #header>
            <div class="card-title-row">
              <span>用户限制</span>
              <div class="inline-filters">
                <el-button size="small" :loading="restrictionsLoading" @click="loadRestrictions(true)">刷新</el-button>
                <el-button size="small" type="primary" @click="openRestrictionDialog()">新增限制</el-button>
              </div>
            </div>
          </template>

          <el-table :data="restrictions" v-loading="restrictionsLoading" size="small" border>
            <el-table-column prop="user_name" label="用户" width="140" />
            <el-table-column prop="user_uid" label="用户 UID" width="170" />
            <el-table-column prop="restriction_type" label="限制类型" width="100" />
            <el-table-column prop="reason" label="原因" min-width="180" />
            <el-table-column prop="expires_at" label="到期时间" width="180" />
            <el-table-column prop="updated_at" label="更新时间" width="180" />
            <el-table-column label="操作" width="140">
              <template #default="{ row }">
                <el-button size="small" text @click="openRestrictionDialog(row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="审计日志" name="audit">
        <el-card shadow="never">
          <template #header>
            <div class="card-title-row">
              <span>审计日志</span>
              <el-button size="small" :loading="auditLoading" @click="loadAuditLogs(true)">刷新</el-button>
            </div>
          </template>

          <el-table :data="auditLogs" v-loading="auditLoading" size="small" border>
            <el-table-column prop="action" label="动作" width="180" />
            <el-table-column prop="target_type" label="对象类型" width="120" />
            <el-table-column prop="target_id" label="对象 ID" width="180" />
            <el-table-column prop="operator_name" label="操作人" width="120" />
            <el-table-column prop="summary" label="摘要" min-width="220" />
            <el-table-column prop="created_at" label="操作时间" width="180" />
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-drawer v-model="partyDrawerVisible" title="组局详情" size="40%">
      <el-descriptions v-if="partyDetail" :column="1" border size="small">
        <el-descriptions-item label="标题">{{ partyDetail.title }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ partyDetail.category }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ partyDetail.status }}</el-descriptions-item>
        <el-descriptions-item label="发起人">{{ partyDetail.host_name || partyDetail.hostName }}</el-descriptions-item>
        <el-descriptions-item label="地点">{{ partyDetail.location }}</el-descriptions-item>
        <el-descriptions-item label="时间">{{ partyDetail.time || partyDetail.activity_time }}</el-descriptions-item>
        <el-descriptions-item label="描述">{{ partyDetail.description || '--' }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>

    <el-drawer v-model="messageDrawerVisible" title="消息治理" size="55%">
      <div class="drawer-toolbar">
        <strong>{{ activePartyForMessages?.title || '组局消息' }}</strong>
        <el-button size="small" :loading="messagesLoading" @click="loadMessages(activePartyForMessages?.id, true)">刷新</el-button>
      </div>
      <el-table :data="messages" v-loading="messagesLoading" size="small" border>
        <el-table-column prop="sender_name" label="发送人" width="140" />
        <el-table-column prop="content" label="消息内容" min-width="260" />
        <el-table-column prop="created_at" label="发送时间" width="180" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" text type="danger" @click="deleteMessage(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>

    <el-dialog v-model="sensitiveDialogVisible" :title="sensitiveForm.id ? '编辑敏感词' : '新增敏感词'" width="520px">
      <el-form label-width="90px">
        <el-form-item label="敏感词">
          <el-input v-model="sensitiveForm.word" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="sensitiveForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="sensitiveForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sensitiveDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="sensitiveSaving" @click="saveSensitiveWord">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="restrictionDialogVisible" :title="restrictionForm.id ? '编辑用户限制' : '新增用户限制'" width="560px">
      <el-form label-width="110px">
        <el-form-item label="目标用户 ID">
          <el-input v-model="restrictionForm.target_user_id" placeholder="支持数据库 ID / UID / TSID" />
        </el-form-item>
        <el-form-item label="限制类型">
          <el-select v-model="restrictionForm.restriction_type" style="width: 100%;">
            <el-option label="禁言 mute" value="mute" />
            <el-option label="封禁 ban" value="ban" />
          </el-select>
        </el-form-item>
        <el-form-item label="限制原因">
          <el-input v-model="restrictionForm.reason" />
        </el-form-item>
        <el-form-item label="补充说明">
          <el-input v-model="restrictionForm.note" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="到期时间">
          <el-date-picker
            v-model="restrictionForm.expires_at"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss[Z]"
            placeholder="留空表示长期有效"
            style="width: 100%;"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="restrictionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="restrictionSaving" @click="saveRestriction">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'

const activeTab = ref('runtime')
const pageLoading = ref(false)
const pageError = ref('')

const runtimeLoading = ref(false)
const runtimeSaving = ref(false)
const runtimeForm = reactive(createRuntimeForm())

const partiesLoading = ref(false)
const parties = ref([])
const partyFilters = reactive({
  status: '',
  category: '',
  search: ''
})

const reportsLoading = ref(false)
const reports = ref([])
const reportStatus = ref('')

const sensitiveLoading = ref(false)
const sensitiveWords = ref([])
const sensitiveDialogVisible = ref(false)
const sensitiveSaving = ref(false)
const sensitiveForm = reactive(createSensitiveForm())

const restrictionsLoading = ref(false)
const restrictions = ref([])
const restrictionDialogVisible = ref(false)
const restrictionSaving = ref(false)
const restrictionForm = reactive(createRestrictionForm())

const auditLoading = ref(false)
const auditLogs = ref([])

const partyDrawerVisible = ref(false)
const partyDetail = ref(null)

const messageDrawerVisible = ref(false)
const activePartyForMessages = ref(null)
const messagesLoading = ref(false)
const messages = ref([])

function createRuntimeQuestion(source = {}) {
  return {
    localKey: `question-${Math.random().toString(36).slice(2, 9)}`,
    question: String(source.question || '').trim(),
    options: Array.isArray(source.options)
      ? source.options.map((item) => ({
          localKey: `option-${Math.random().toString(36).slice(2, 9)}`,
          text: String(item?.text || '').trim(),
          icon: String(item?.icon || '').trim()
        }))
      : []
  }
}

function createRuntimeForm(source = {}) {
  return {
    enabled: source.enabled !== false,
    welcome_title: String(source.welcome_title || '').trim(),
    welcome_subtitle: String(source.welcome_subtitle || '').trim(),
    publish_limit_per_day: Number(source.publish_limit_per_day || 5),
    message_rate_limit_per_minute: Number(source.message_rate_limit_per_minute || 20),
    default_max_people: Number(source.default_max_people || 4),
    max_max_people: Number(source.max_max_people || 6),
    auto_close_expired_hours: Number(source.auto_close_expired_hours || 24),
    categories: Array.isArray(source.categories)
      ? source.categories.map((item) => ({
          id: String(item.id || '').trim(),
          label: String(item.label || '').trim(),
          icon: String(item.icon || '').trim(),
          icon_type: String(item.icon_type || 'image').trim(),
          enabled: item.enabled !== false,
          sort_order: Number(item.sort_order || 0),
          color: String(item.color || '').trim()
        }))
      : [],
    questions: Array.isArray(source.questions) ? source.questions.map(createRuntimeQuestion) : []
  }
}

function createSensitiveForm(source = {}) {
  return {
    id: source.id || '',
    word: String(source.word || '').trim(),
    description: String(source.description || '').trim(),
    enabled: source.enabled !== false
  }
}

function createRestrictionForm(source = {}) {
  return {
    id: source.id || '',
    target_user_id: String(source.target_user_id || source.user_uid || source.user_id || '').trim(),
    restriction_type: String(source.restriction_type || 'mute').trim() || 'mute',
    reason: String(source.reason || '').trim(),
    note: String(source.note || '').trim(),
    expires_at: String(source.expires_at || '').trim()
  }
}

const sortedRuntimeCategories = computed(() =>
  [...runtimeForm.categories].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
)

function applyRuntimeSettings(payload = {}) {
  Object.assign(runtimeForm, createRuntimeForm(payload))
}

function addQuestion() {
  runtimeForm.questions.push(createRuntimeQuestion({
    question: '新的问卷题目',
    options: [{ text: '选项一', icon: '✨' }]
  }))
}

function removeQuestion(index) {
  runtimeForm.questions.splice(index, 1)
}

function addQuestionOption(index) {
  runtimeForm.questions[index]?.options?.push({
    localKey: `option-${Math.random().toString(36).slice(2, 9)}`,
    text: '',
    icon: ''
  })
}

function removeQuestionOption(questionIndex, optionIndex) {
  runtimeForm.questions[questionIndex]?.options?.splice(optionIndex, 1)
}

async function loadRuntimeSettings(forceRefresh = false) {
  runtimeLoading.value = true
  try {
    const { data } = await request.get('/api/dining-buddy-settings', {
      params: forceRefresh ? { _t: Date.now() } : undefined
    })
    applyRuntimeSettings(extractEnvelopeData(data) || {})
  } catch (error) {
    pageError.value = extractErrorMessage(error, '加载同频饭友运行配置失败')
  } finally {
    runtimeLoading.value = false
  }
}

async function saveRuntimeSettings() {
  if (!runtimeForm.welcome_title) {
    ElMessage.warning('欢迎标题不能为空')
    return
  }
  try {
    await ElMessageBox.confirm('保存后前台问卷、分类与限流规则会立即生效，确认继续吗？', '确认保存', {
      type: 'warning'
    })
  } catch (_error) {
    return
  }
  runtimeSaving.value = true
  try {
    const payload = {
      enabled: runtimeForm.enabled,
      welcome_title: runtimeForm.welcome_title,
      welcome_subtitle: runtimeForm.welcome_subtitle,
      publish_limit_per_day: runtimeForm.publish_limit_per_day,
      message_rate_limit_per_minute: runtimeForm.message_rate_limit_per_minute,
      default_max_people: runtimeForm.default_max_people,
      max_max_people: runtimeForm.max_max_people,
      auto_close_expired_hours: runtimeForm.auto_close_expired_hours,
      categories: runtimeForm.categories.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        icon_type: item.icon_type,
        enabled: item.enabled,
        sort_order: item.sort_order,
        color: item.color
      })),
      questions: runtimeForm.questions.map((question) => ({
        question: question.question,
        options: (Array.isArray(question.options) ? question.options : [])
          .map((option) => ({
            text: String(option.text || '').trim(),
            icon: String(option.icon || '').trim()
          }))
          .filter((option) => option.text)
      }))
    }
    const { data } = await request.post('/api/dining-buddy-settings', payload)
    applyRuntimeSettings(extractEnvelopeData(data) || payload)
    ElMessage.success('同频饭友运行配置已保存')
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '保存同频饭友运行配置失败'))
  } finally {
    runtimeSaving.value = false
  }
}

async function loadParties(forceRefresh = false) {
  partiesLoading.value = true
  try {
    const { data } = await request.get('/api/admin/dining-buddy/parties', {
      params: {
        ...partyFilters,
        _t: forceRefresh ? Date.now() : undefined
      }
    })
    parties.value = Array.isArray(data?.parties) ? data.parties : []
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '加载组局列表失败'))
  } finally {
    partiesLoading.value = false
  }
}

async function openPartyDrawer(row) {
  partyDrawerVisible.value = true
  try {
    const { data } = await request.get(`/api/admin/dining-buddy/parties/${encodeURIComponent(row.id)}`)
    partyDetail.value = extractEnvelopeData(data) || row
  } catch (error) {
    partyDetail.value = row
    ElMessage.error(extractErrorMessage(error, '加载组局详情失败'))
  }
}

async function openMessageDrawer(row) {
  activePartyForMessages.value = row
  messageDrawerVisible.value = true
  await loadMessages(row.id, true)
}

async function loadMessages(partyId, forceRefresh = false) {
  if (!partyId) return
  messagesLoading.value = true
  try {
    const { data } = await request.get(`/api/admin/dining-buddy/parties/${encodeURIComponent(partyId)}/messages`, {
      params: forceRefresh ? { _t: Date.now() } : undefined
    })
    const payload = extractEnvelopeData(data) || {}
    messages.value = Array.isArray(payload.messages) ? payload.messages : []
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '加载消息列表失败'))
  } finally {
    messagesLoading.value = false
  }
}

async function changePartyStatus(row, action) {
  const actionLabel = action === 'close' ? '关闭' : '重开'
  let reason = ''
  try {
    const promptResult = await ElMessageBox.prompt(`请输入${actionLabel}组局原因`, `${actionLabel}组局`, {
      inputValue: '',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
    reason = promptResult.value || ''
  } catch (_error) {
    return
  }
  try {
    await request.post(`/api/admin/dining-buddy/parties/${encodeURIComponent(row.id)}/${action}`, {
      reason
    })
    ElMessage.success(`组局已${actionLabel}`)
    await Promise.all([loadParties(true), loadAuditLogs(true)])
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, `${actionLabel}组局失败`))
  }
}

async function loadReports(forceRefresh = false) {
  reportsLoading.value = true
  try {
    const { data } = await request.get('/api/admin/dining-buddy/reports', {
      params: {
        status: reportStatus.value,
        _t: forceRefresh ? Date.now() : undefined
      }
    })
    const payload = extractEnvelopeData(data) || {}
    reports.value = Array.isArray(payload.reports) ? payload.reports : []
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '加载举报列表失败'))
  } finally {
    reportsLoading.value = false
  }
}

async function handleReport(row, action) {
  let resolutionNote = ''
  let resolutionAction = row.resolution_action || ''
  try {
    const promptResult = await ElMessageBox.prompt(
      action === 'resolve' ? '请输入处理说明' : '请输入驳回原因',
      action === 'resolve' ? '受理举报' : '驳回举报',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消'
      }
    )
    resolutionNote = promptResult.value || ''
  } catch (_error) {
    return
  }
  if (action === 'resolve') {
    resolutionAction = await pickResolveAction()
    if (!resolutionAction) {
      return
    }
  }
  try {
    await request.post(`/api/admin/dining-buddy/reports/${encodeURIComponent(row.id)}/${action}`, {
      resolution_note: resolutionNote,
      resolution_action: resolutionAction
    })
    ElMessage.success(action === 'resolve' ? '举报已受理' : '举报已驳回')
    await Promise.all([loadReports(true), loadAuditLogs(true)])
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '处理举报失败'))
  }
}

function pickResolveAction() {
  return new Promise((resolve) => {
    ElMessageBox.prompt('请输入处理动作标识，如 close_party / delete_message / mute_user', '处理动作', {
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
      .then((result) => resolve(result.value || 'manual_review'))
      .catch(() => resolve(''))
  })
}

async function loadSensitiveWords(forceRefresh = false) {
  sensitiveLoading.value = true
  try {
    const { data } = await request.get('/api/admin/dining-buddy/sensitive-words', {
      params: forceRefresh ? { _t: Date.now() } : undefined
    })
    const payload = extractEnvelopeData(data) || {}
    sensitiveWords.value = Array.isArray(payload.items) ? payload.items : []
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '加载敏感词失败'))
  } finally {
    sensitiveLoading.value = false
  }
}

function openSensitiveDialog(row = null) {
  Object.assign(sensitiveForm, createSensitiveForm(row || {}))
  sensitiveDialogVisible.value = true
}

async function saveSensitiveWord() {
  if (!sensitiveForm.word) {
    ElMessage.warning('敏感词不能为空')
    return
  }
  sensitiveSaving.value = true
  try {
    if (sensitiveForm.id) {
      await request.put(`/api/admin/dining-buddy/sensitive-words/${encodeURIComponent(sensitiveForm.id)}`, {
        word: sensitiveForm.word,
        description: sensitiveForm.description,
        enabled: sensitiveForm.enabled
      })
    } else {
      await request.post('/api/admin/dining-buddy/sensitive-words', {
        word: sensitiveForm.word,
        description: sensitiveForm.description,
        enabled: sensitiveForm.enabled
      })
    }
    sensitiveDialogVisible.value = false
    ElMessage.success('敏感词已保存')
    await Promise.all([loadSensitiveWords(true), loadAuditLogs(true)])
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '保存敏感词失败'))
  } finally {
    sensitiveSaving.value = false
  }
}

async function deleteSensitiveWord(row) {
  try {
    await ElMessageBox.confirm('删除敏感词会立即影响前台内容校验，确认继续吗？', '确认删除', {
      type: 'warning'
    })
  } catch (_error) {
    return
  }
  try {
    await request.delete(`/api/admin/dining-buddy/sensitive-words/${encodeURIComponent(row.id)}`)
    ElMessage.success('敏感词已删除')
    await Promise.all([loadSensitiveWords(true), loadAuditLogs(true)])
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '删除敏感词失败'))
  }
}

async function loadRestrictions(forceRefresh = false) {
  restrictionsLoading.value = true
  try {
    const { data } = await request.get('/api/admin/dining-buddy/user-restrictions', {
      params: forceRefresh ? { _t: Date.now() } : undefined
    })
    const payload = extractEnvelopeData(data) || {}
    restrictions.value = Array.isArray(payload.items) ? payload.items : []
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '加载用户限制失败'))
  } finally {
    restrictionsLoading.value = false
  }
}

function openRestrictionDialog(row = null) {
  Object.assign(restrictionForm, createRestrictionForm(row || {}))
  restrictionDialogVisible.value = true
}

async function saveRestriction() {
  if (!restrictionForm.target_user_id || !restrictionForm.restriction_type) {
    ElMessage.warning('目标用户和限制类型不能为空')
    return
  }
  restrictionSaving.value = true
  try {
    await request.post('/api/admin/dining-buddy/user-restrictions', {
      target_user_id: restrictionForm.target_user_id,
      restriction_type: restrictionForm.restriction_type,
      reason: restrictionForm.reason,
      note: restrictionForm.note,
      expires_at: restrictionForm.expires_at
    })
    restrictionDialogVisible.value = false
    ElMessage.success('用户限制已保存')
    await Promise.all([loadRestrictions(true), loadAuditLogs(true)])
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '保存用户限制失败'))
  } finally {
    restrictionSaving.value = false
  }
}

async function loadAuditLogs(forceRefresh = false) {
  auditLoading.value = true
  try {
    const { data } = await request.get('/api/admin/dining-buddy/audit-logs', {
      params: forceRefresh ? { _t: Date.now() } : undefined
    })
    const payload = extractEnvelopeData(data) || {}
    auditLogs.value = Array.isArray(payload.items) ? payload.items : []
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '加载审计日志失败'))
  } finally {
    auditLoading.value = false
  }
}

async function deleteMessage(row) {
  let reason = ''
  try {
    const promptResult = await ElMessageBox.prompt('请输入删除消息原因', '删除消息', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消'
    })
    reason = promptResult.value || ''
  } catch (_error) {
    return
  }
  try {
    await request.delete(`/api/admin/dining-buddy/messages/${encodeURIComponent(row.id)}`, {
      data: { reason }
    })
    ElMessage.success('消息已删除')
    await Promise.all([
      loadMessages(activePartyForMessages.value?.id, true),
      loadReports(true),
      loadAuditLogs(true)
    ])
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '删除消息失败'))
  }
}

async function loadAll(forceRefresh = false) {
  pageLoading.value = true
  pageError.value = ''
  try {
    await Promise.all([
      loadRuntimeSettings(forceRefresh),
      loadParties(forceRefresh),
      loadReports(forceRefresh),
      loadSensitiveWords(forceRefresh),
      loadRestrictions(forceRefresh),
      loadAuditLogs(forceRefresh)
    ])
  } catch (error) {
    pageError.value = extractErrorMessage(error, '加载同频饭友治理数据失败')
  } finally {
    pageLoading.value = false
  }
}

void loadAll()
</script>

<style scoped>
.page-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
}

.page-header p {
  margin: 0;
  color: #6b7280;
}

.page-actions,
.inline-filters,
.drawer-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.runtime-block {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
}

.block-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.option-row {
  display: grid;
  grid-template-columns: 1.5fr 120px 70px;
  gap: 8px;
  margin-bottom: 8px;
}

.drawer-toolbar {
  margin-bottom: 12px;
  justify-content: space-between;
}
</style>
