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
                  <el-option
                    v-for="option in DINING_BUDDY_PARTY_STATUS_OPTIONS"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <el-select v-model="partyFilters.category" clearable placeholder="分类" size="small" style="width: 120px;">
                  <el-option
                    v-for="option in DINING_BUDDY_PARTY_CATEGORY_OPTIONS"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
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
                <el-select v-model="reportFilters.status" clearable placeholder="状态" size="small" style="width: 140px;">
                  <el-option
                    v-for="option in DINING_BUDDY_REPORT_STATUS_OPTIONS"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
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

    <el-dialog v-model="sensitiveDialogVisible" :title="getDiningBuddySensitiveDialogTitle(sensitiveForm)" width="520px">
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

    <el-dialog v-model="restrictionDialogVisible" :title="getDiningBuddyRestrictionDialogTitle(restrictionForm)" width="560px">
      <el-form label-width="110px">
        <el-form-item label="目标用户 ID">
          <el-input v-model="restrictionForm.target_user_id" placeholder="支持数据库 ID / UID / TSID" />
        </el-form-item>
        <el-form-item label="限制类型">
          <el-select v-model="restrictionForm.restriction_type" style="width: 100%;">
            <el-option
              v-for="option in DINING_BUDDY_RESTRICTION_TYPE_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
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
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'
import { useDiningBuddyGovernancePage } from './diningBuddyGovernanceHelpers'

const {
  activePartyForMessages,
  activeTab,
  addQuestion,
  addQuestionOption,
  auditLoading,
  auditLogs,
  changePartyStatus,
  deleteMessage,
  deleteSensitiveWord,
  DINING_BUDDY_PARTY_CATEGORY_OPTIONS,
  DINING_BUDDY_PARTY_STATUS_OPTIONS,
  DINING_BUDDY_REPORT_STATUS_OPTIONS,
  DINING_BUDDY_RESTRICTION_TYPE_OPTIONS,
  getDiningBuddyRestrictionDialogTitle,
  getDiningBuddySensitiveDialogTitle,
  handleReport,
  loadAll,
  loadAuditLogs,
  loadMessages,
  loadParties,
  loadReports,
  loadRestrictions,
  loadSensitiveWords,
  messageDrawerVisible,
  messages,
  messagesLoading,
  openMessageDrawer,
  openPartyDrawer,
  openRestrictionDialog,
  openSensitiveDialog,
  pageError,
  pageLoading,
  parties,
  partiesLoading,
  partyDetail,
  partyDrawerVisible,
  partyFilters,
  removeQuestion,
  removeQuestionOption,
  reportFilters,
  reports,
  reportsLoading,
  restrictionDialogVisible,
  restrictionForm,
  restrictions,
  restrictionsLoading,
  restrictionSaving,
  runtimeForm,
  runtimeLoading,
  runtimeSaving,
  saveRestriction,
  saveRuntimeSettings,
  saveSensitiveWord,
  sensitiveDialogVisible,
  sensitiveForm,
  sensitiveLoading,
  sensitiveSaving,
  sensitiveWords,
  sortedRuntimeCategories,
} = useDiningBuddyGovernancePage({
  request,
  ElMessage,
  ElMessageBox,
})
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
