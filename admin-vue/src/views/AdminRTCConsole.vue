<template>
  <div class="page rtc-console-page">
    <div class="title-row">
      <div>
        <div class="title">RTC 管理台</div>
        <div class="title-subtitle">
          面向管理端的独立 RTC 工作台。这里可以搜索站内联系人、直接发起语音、查看当前通话状态，并快速回看最近审计记录。
        </div>
      </div>
      <div class="title-actions">
        <el-tag :type="adminRTCState.bridgeConnected ? 'success' : 'warning'" effect="light">
          {{ adminRTCState.bridgeConnected ? 'RTC 信令已连接' : 'RTC 信令未连接' }}
        </el-tag>
        <el-tag :type="adminRTCState.mediaSupported ? 'success' : 'info'" effect="light">
          {{ adminRTCState.mediaSupported ? '支持 WebRTC 音频' : '当前仅支持信令与审计' }}
        </el-tag>
        <el-button @click="goToChatConsole">客服工作台</el-button>
        <el-button type="primary" plain @click="goToAudits">查看审计</el-button>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">最近记录</div>
        <div class="summary-value">{{ auditSummary.total }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">已接通</div>
        <div class="summary-value success">{{ auditSummary.accepted }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">已结束</div>
        <div class="summary-value primary">{{ auditSummary.ended }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">投诉中</div>
        <div class="summary-value warning">{{ auditSummary.complaints }}</div>
      </div>
    </div>

    <div class="console-grid">
      <el-card class="card search-card">
        <template #header>
          <div class="card-header">
            <span>站内联系人搜索</span>
            <el-button size="small" :loading="targetsLoading" @click="searchTargets">搜索</el-button>
          </div>
        </template>

        <div class="search-toolbar">
          <el-input
            v-model.trim="searchForm.keyword"
            clearable
            placeholder="姓名 / 手机号 / Chat ID / Legacy ID"
            @keyup.enter="searchTargets"
          />
          <el-select v-model="searchForm.role" clearable placeholder="角色筛选">
            <el-option label="全部角色" value="" />
            <el-option label="用户" value="user" />
            <el-option label="商户" value="merchant" />
            <el-option label="骑手" value="rider" />
          </el-select>
        </div>

        <PageStateAlert :message="targetsError" />

        <div class="search-results" v-loading="targetsLoading">
          <div v-if="filteredTargets.length === 0" class="empty-state">
            {{ searchForm.keyword ? '没有搜到可用的 RTC 联系人' : '输入关键词后可搜索用户 / 商户 / 骑手' }}
          </div>

          <button
            v-for="target in filteredTargets"
            :key="target.resultKey"
            type="button"
            class="target-item"
            :class="{ active: selectedTarget?.resultKey === target.resultKey }"
            @click="selectTarget(target)"
          >
            <div class="target-top">
              <div class="target-name">{{ target.name || target.phone || target.chatId || '未命名联系人' }}</div>
              <el-tag size="small" effect="light">{{ roleLabel(target.role) }}</el-tag>
            </div>
            <div class="target-meta">
              <span v-if="target.phone">{{ target.phone }}</span>
              <span v-if="target.legacyId">Legacy {{ target.legacyId }}</span>
              <span v-if="target.chatId">Chat {{ target.chatId }}</span>
            </div>
          </button>
        </div>
      </el-card>

      <el-card class="card compose-card">
        <template #header>
          <div class="card-header">
            <span>发起 RTC 呼叫</span>
            <el-tag v-if="selectedTarget" size="small" type="success" effect="light">已选目标</el-tag>
          </div>
        </template>

        <div v-if="selectedTarget" class="selected-target-card">
          <div class="selected-target-name">{{ selectedTarget.name || selectedTarget.phone || selectedTarget.chatId }}</div>
          <div class="selected-target-meta">
            <span>{{ roleLabel(selectedTarget.role) }}</span>
            <span v-if="selectedTarget.phone">{{ selectedTarget.phone }}</span>
            <span v-if="selectedTarget.legacyId">Legacy {{ selectedTarget.legacyId }}</span>
          </div>
        </div>
        <div v-else class="empty-state compact-empty">
          先从左侧搜索并选择一个目标联系人。
        </div>

        <el-form class="compose-form" :model="callForm" label-width="110px" size="small">
          <el-form-item label="会话号">
            <el-input v-model.trim="callForm.conversationId" placeholder="默认带入 Chat ID，可手动调整" />
          </el-form-item>
          <el-form-item label="订单号">
            <el-input v-model.trim="callForm.orderId" placeholder="可选，用于客服 / 履约场景留痕" />
          </el-form-item>
          <el-form-item label="入口标识">
            <el-input v-model.trim="callForm.entryPoint" placeholder="如：admin_rtc_console" />
          </el-form-item>
          <el-form-item label="业务场景">
            <el-input v-model.trim="callForm.scene" placeholder="如：admin_support" />
          </el-form-item>
        </el-form>

        <div class="compose-tip">
          这里发起的呼叫会和聊天工作台、全局 RTC 弹窗共享同一套会话状态，审计会同步写入 RTC 通话审计页。
        </div>

        <div class="compose-actions">
          <el-button
            type="primary"
            :loading="startingCall"
            :disabled="!selectedTarget || !canCallSelected || currentCallActive"
            @click="startCall"
          >
            发起 RTC 语音
          </el-button>
        </div>
      </el-card>

      <el-card class="card status-card">
        <template #header>
          <div class="card-header">
            <span>当前通话状态</span>
            <el-button size="small" :loading="auditsLoading" @click="loadRecentAudits">刷新记录</el-button>
          </div>
        </template>

        <div class="status-hero">
          <div class="status-title">{{ adminRTCState.statusText }}</div>
          <div class="status-hint">{{ adminRTCState.statusHint }}</div>
        </div>

        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">通话 ID</span>
            <span class="status-value">{{ adminRTCState.callId || '--' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">当前模式</span>
            <span class="status-value">{{ adminRTCState.mode === 'incoming' ? '来电' : '呼出' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">目标角色</span>
            <span class="status-value">{{ adminRTCState.targetRole ? roleLabel(adminRTCState.targetRole) : '--' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">目标信息</span>
            <span class="status-value">{{ currentTargetText }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">媒体状态</span>
            <span class="status-value">{{ adminRTCState.mediaStatusText }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">会话 / 订单</span>
            <span class="status-value">{{ currentBizText }}</span>
          </div>
        </div>

        <div v-if="adminRTCState.errorMessage" class="status-error">
          {{ adminRTCState.errorMessage }}
        </div>

        <div class="status-actions">
          <el-button
            v-if="showReject"
            :disabled="adminRTCState.busy"
            @click="handleReject"
          >
            拒绝
          </el-button>
          <el-button
            v-if="showCancel"
            :disabled="adminRTCState.busy"
            @click="handleCancel"
          >
            取消呼叫
          </el-button>
          <el-button
            v-if="showAccept"
            type="primary"
            :loading="adminRTCState.busy"
            @click="handleAccept"
          >
            接听
          </el-button>
          <el-button
            v-if="showEnd"
            type="danger"
            :loading="adminRTCState.busy"
            @click="handleEnd"
          >
            挂断
          </el-button>
          <el-button
            v-if="canCloseCurrentCall"
            @click="handleCloseCall"
          >
            关闭状态
          </el-button>
        </div>
      </el-card>
    </div>

    <el-card class="card history-card">
      <template #header>
        <div class="card-header">
          <span>最近 RTC 通话记录</span>
          <div class="history-actions">
            <el-button size="small" @click="loadRecentAudits" :loading="auditsLoading">刷新</el-button>
            <el-button size="small" type="primary" plain @click="goToAudits">进入通话审计</el-button>
          </div>
        </div>
      </template>

      <PageStateAlert :message="auditsError" />

      <el-table :data="recentAudits" size="small" stripe v-loading="auditsLoading">
        <el-table-column label="创建时间" width="168">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="通话 ID" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.uid || row.id || row.call_id_raw || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="双方" min-width="230">
          <template #default="{ row }">
            <div>{{ roleLabel(row.caller_role) }} {{ row.caller_phone || row.caller_id || '-' }}</div>
            <div class="muted-text">-> {{ roleLabel(row.callee_role) }} {{ row.callee_phone || row.callee_id || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时长" width="110">
          <template #default="{ row }">
            {{ formatDuration(row.duration_seconds) }}
          </template>
        </el-table-column>
        <el-table-column label="会话 / 订单" min-width="180">
          <template #default="{ row }">
            <div>{{ row.conversation_id || '-' }}</div>
            <div class="muted-text">{{ row.order_id || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="投诉" width="96">
          <template #default="{ row }">
            <el-tag size="small" :type="complaintTagType(row.complaint_status)">
              {{ complaintLabel(row.complaint_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="auditsError ? '加载失败，暂无可显示数据' : '暂无 RTC 通话记录'" :image-size="88" />
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import PageStateAlert from '@/components/PageStateAlert.vue'
import request from '@/utils/request'
import { useAdminRTCConsolePage } from './adminRTCConsoleHelpers'

const {
  adminRTCState,
  auditsError,
  auditsLoading,
  auditSummary,
  callForm,
  canCallSelected,
  canCloseCurrentCall,
  complaintLabel,
  complaintTagType,
  currentBizText,
  currentCallActive,
  currentTargetText,
  filteredTargets,
  formatDateTime,
  formatDuration,
  goToAudits,
  goToChatConsole,
  handleAccept,
  handleCancel,
  handleCloseCall,
  handleEnd,
  handleReject,
  loadRecentAudits,
  recentAudits,
  roleLabel,
  searchForm,
  searchTargets,
  selectTarget,
  selectedTarget,
  showAccept,
  showCancel,
  showEnd,
  showReject,
  startCall,
  startingCall,
  statusLabel,
  statusTagType,
  targetsError,
  targetsLoading,
} = useAdminRTCConsolePage({
  request,
  ElMessage,
})
</script>

<style scoped>
.rtc-console-page {
  display: grid;
  gap: 20px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.title-subtitle {
  margin-top: 8px;
  max-width: 820px;
  color: #64748b;
  line-height: 1.7;
}

.title-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  padding: 18px 20px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.05);
}

.summary-label {
  font-size: 13px;
  color: #64748b;
}

.summary-value {
  margin-top: 10px;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
}

.summary-value.success {
  color: #15803d;
}

.summary-value.primary {
  color: #0f766e;
}

.summary-value.warning {
  color: #b45309;
}

.console-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}

.card {
  border-radius: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.search-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 10px;
  margin-bottom: 12px;
}

.search-results {
  display: grid;
  gap: 10px;
  min-height: 280px;
}

.target-item {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid rgba(203, 213, 225, 0.8);
  border-radius: 16px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.target-item:hover,
.target-item.active {
  border-color: #0f766e;
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(15, 118, 110, 0.12);
}

.target-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.target-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.target-meta {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: #64748b;
  font-size: 12px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  padding: 20px;
  border-radius: 16px;
  background: #f8fafc;
  color: #64748b;
  text-align: center;
  line-height: 1.7;
}

.compact-empty {
  min-height: 92px;
  margin-bottom: 14px;
}

.selected-target-card {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, #ecfeff 0%, #f0fdf4 100%);
  border: 1px solid rgba(15, 118, 110, 0.18);
}

.selected-target-name {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.selected-target-meta {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: #475569;
  font-size: 13px;
}

.compose-form {
  margin-top: 12px;
}

.compose-tip {
  margin-top: 6px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
  line-height: 1.7;
}

.compose-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.status-hero {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  border: 1px solid rgba(59, 130, 246, 0.14);
}

.status-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.status-hint {
  margin-top: 8px;
  color: #475569;
  line-height: 1.7;
}

.status-grid {
  margin-top: 16px;
  display: grid;
  gap: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  font-size: 13px;
}

.status-label {
  color: #64748b;
}

.status-value {
  color: #0f172a;
  font-weight: 600;
  text-align: right;
  word-break: break-all;
}

.status-error {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #fef2f2;
  color: #b91c1c;
  line-height: 1.7;
}

.status-actions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.history-actions {
  display: flex;
  gap: 10px;
}

.muted-text {
  color: #64748b;
}

@media (max-width: 1440px) {
  .console-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1120px) {
  .summary-grid,
  .console-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .title-row,
  .card-header {
    flex-direction: column;
    align-items: stretch;
  }

  .search-toolbar {
    grid-template-columns: 1fr;
  }

  .title-actions,
  .history-actions,
  .compose-actions,
  .status-actions {
    justify-content: flex-start;
  }

  .status-item {
    flex-direction: column;
    gap: 6px;
  }

  .status-value {
    text-align: left;
  }
}
</style>
