<template>
  <div class="im-status-row">
    <div class="im-card" :class="{ 'im-online': imStats.online, 'im-offline': !imStats.online }">
      <div class="im-info">
        <div class="im-label">即时通讯服务</div>
        <div class="im-value">{{ imStats.online ? '在线运行' : '离线' }}</div>
        <div class="im-detail">在线连接 {{ imStats.onlineUsers }} · 消息计数 {{ imStats.messageCount }}</div>
        <div class="im-detail">运行时长 {{ formatUptime(imStats.uptime) }}</div>
      </div>
    </div>

    <div class="im-card">
      <div class="im-info">
        <div class="im-label">CPU 负载</div>
        <div class="im-value">{{ imStats.cpuUsage }}%</div>
        <div class="im-progress">
          <div
            class="im-progress-bar"
            :style="{
              width: `${Math.min(100, Math.max(0, imStats.cpuUsage))}%`,
              background: imStats.cpuUsage > 80 ? '#ff4d4f' : '#0097ff',
            }"
          />
        </div>
      </div>
    </div>

    <div class="im-card">
      <div class="im-info">
        <div class="im-label">内存占用</div>
        <div class="im-value">{{ imStats.memoryUsage }}%</div>
        <div class="im-progress">
          <div
            class="im-progress-bar"
            :style="{
              width: `${Math.min(100, Math.max(0, imStats.memoryUsage))}%`,
              background: imStats.memoryUsage > 80 ? '#ff4d4f' : '#52c41a',
            }"
          />
        </div>
      </div>
    </div>

    <div class="im-card">
      <div class="im-info">
        <div class="im-label">服务存储</div>
        <div class="im-value">{{ imStats.dbSizeMB }} MB</div>
        <div class="im-detail">监控时间 {{ statsTimestampLabel }}</div>
        <div class="im-detail">消息事实源默认以 Go 服务为准</div>
      </div>
    </div>

    <div class="im-card">
      <div class="im-info">
        <div class="im-label">广播模式</div>
        <div class="im-value">{{ getRedisModeLabel(imRedis.mode) }}</div>
        <div class="im-detail">
          Redis {{ imRedis.connected ? '已连接' : '未连接' }} · Adapter {{ imRedis.adapterEnabled ? '已启用' : '未启用' }}
        </div>
        <div class="im-detail">{{ getRedisModeHint(imRedis) }}</div>
      </div>
      <div class="im-mode-tags">
        <el-tag size="small" :type="getRedisModeTagType(imRedis.mode)">{{ getRedisModeLabel(imRedis.mode) }}</el-tag>
        <el-tag size="small" effect="plain">{{ imRedis.enabled ? `DB ${imRedis.database}` : '本地模式' }}</el-tag>
      </div>
    </div>

    <div class="im-card">
      <div class="im-info">
        <div class="im-label">发布探针</div>
        <div class="im-value">{{ runtimeHealthStatusLabel }}</div>
        <div class="im-detail">{{ runtimeHealthSummary }}</div>
        <div class="im-detail">{{ pushWorkerSummary }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatUptime } from '../dashboardPageHelpers'

defineProps({
  imStats: {
    type: Object,
    required: true,
  },
  statsTimestampLabel: {
    type: String,
    default: '等待服务上报',
  },
  imRedis: {
    type: Object,
    required: true,
  },
  getRedisModeLabel: {
    type: Function,
    required: true,
  },
  getRedisModeHint: {
    type: Function,
    required: true,
  },
  getRedisModeTagType: {
    type: Function,
    required: true,
  },
  runtimeHealthStatusLabel: {
    type: String,
    default: '--',
  },
  runtimeHealthSummary: {
    type: String,
    default: '--',
  },
  pushWorkerSummary: {
    type: String,
    default: '--',
  },
})
</script>
