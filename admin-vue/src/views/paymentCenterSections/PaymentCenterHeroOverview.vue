<template>
  <div>
    <div class="payment-center-hero">
      <div>
        <p class="payment-center-eyebrow">财务配置中台</p>
        <h1>支付中心</h1>
        <p class="payment-center-subtitle">
          统一维护支付渠道、提现费、分账规则、骑手保证金和银行卡提现时效。这里保留现有管理端骨架，只把原本分散或缺失的能力盘活。
        </p>
      </div>
      <div class="payment-center-hero-actions">
        <el-button :loading="loading" @click="loadAll">刷新</el-button>
        <el-button type="primary" :loading="saving" @click="saveAll">保存全部配置</el-button>
      </div>
    </div>

    <div class="payment-center-summary-grid">
      <el-card class="payment-center-summary-card">
        <span class="payment-center-summary-label">保证金总记录</span>
        <strong>{{ riderDepositOverview.total || 0 }}</strong>
      </el-card>
      <el-card class="payment-center-summary-card">
        <span class="payment-center-summary-label">锁定中</span>
        <strong>{{ riderDepositOverview.paid_locked || 0 }}</strong>
      </el-card>
      <el-card class="payment-center-summary-card">
        <span class="payment-center-summary-label">可提现</span>
        <strong>{{ riderDepositOverview.withdrawable || 0 }}</strong>
      </el-card>
      <el-card class="payment-center-summary-card">
        <span class="payment-center-summary-label">提现处理中</span>
        <strong>{{ riderDepositOverview.withdrawing || 0 }}</strong>
      </el-card>
    </div>

    <div class="payment-center-gateway-grid">
      <el-card class="payment-center-panel payment-center-gateway-card">
        <template #header>支付网关环境</template>
        <div class="payment-center-gateway-state-row">
          <span class="payment-center-gateway-badge" :class="gatewaySummary.mode?.isProd ? 'is-ready' : 'is-warn'">
            {{ gatewaySummary.mode?.isProd ? '生产模式' : '开发/沙箱' }}
          </span>
          <span class="payment-center-gateway-meta">当前支付链路运行环境</span>
        </div>
      </el-card>

      <el-card class="payment-center-panel payment-center-gateway-card">
        <template #header>微信支付就绪度</template>
        <div class="payment-center-gateway-state-row">
          <span class="payment-center-gateway-badge" :class="gatewaySummary.wechat?.ready ? 'is-ready' : 'is-danger'">
            {{ gatewaySummary.wechat?.ready ? '已就绪' : '未完成' }}
          </span>
          <span class="payment-center-gateway-meta">{{ gatewaySummary.wechat?.integrationTarget || 'official-go-sdk' }}</span>
        </div>
        <ul class="payment-center-gateway-list">
          <li>AppID：{{ gatewaySummary.wechat?.appIdConfigured ? '已配置' : '未配置' }}</li>
          <li>商户号：{{ gatewaySummary.wechat?.mchIdConfigured ? '已配置' : '未配置' }}</li>
          <li>API V3 Key：{{ gatewaySummary.wechat?.apiV3KeyConfigured ? '已配置' : '未配置' }}</li>
          <li>证书序列号：{{ gatewaySummary.wechat?.serialNoConfigured ? '已配置' : '未配置' }}</li>
          <li>私钥：{{ gatewaySummary.wechat?.privateKeyConfigured ? '已配置' : '未配置' }}</li>
          <li>支付回调：{{ gatewaySummary.wechat?.notifyUrlConfigured ? '已配置' : '未配置' }}</li>
          <li>退款回调：{{ gatewaySummary.wechat?.refundNotifyConfigured ? '已配置' : '未配置' }}</li>
          <li>出款回调：{{ gatewaySummary.wechat?.payoutNotifyConfigured ? '已配置' : '未配置' }}</li>
          <li>出款场景：{{ gatewaySummary.wechat?.payoutSceneIdConfigured ? '已配置' : '未配置' }}</li>
        </ul>
      </el-card>

      <el-card class="payment-center-panel payment-center-gateway-card">
        <template #header>支付宝就绪度</template>
        <div class="payment-center-gateway-state-row">
          <span class="payment-center-gateway-badge" :class="gatewaySummary.alipay?.ready ? 'is-ready' : 'is-danger'">
            {{ gatewaySummary.alipay?.ready ? '已就绪' : '未完成' }}
          </span>
          <span class="payment-center-gateway-meta">{{ gatewaySummary.alipay?.integrationTarget || 'official-sidecar-sdk' }}</span>
        </div>
        <ul class="payment-center-gateway-list">
          <li>AppID：{{ gatewaySummary.alipay?.appIdConfigured ? '已配置' : '未配置' }}</li>
          <li>私钥：{{ gatewaySummary.alipay?.privateKeyConfigured ? '已配置' : '未配置' }}</li>
          <li>支付宝公钥：{{ gatewaySummary.alipay?.publicKeyConfigured ? '已配置' : '未配置' }}</li>
          <li>支付回调：{{ gatewaySummary.alipay?.notifyUrlConfigured ? '已配置' : '未配置' }}</li>
          <li>出款回调：{{ gatewaySummary.alipay?.payoutNotifyConfigured ? '已配置' : '未配置' }}</li>
          <li>侧车地址：{{ gatewaySummary.alipay?.sidecarUrlConfigured ? '已配置' : '未配置' }}</li>
          <li>环境：{{ gatewaySummary.alipay?.sandbox ? '沙箱' : '生产' }}</li>
          <li>Stub 兜底：{{ gatewaySummary.alipay?.allowStubBlocked ? '已封禁(生产/类生产环境)' : (gatewaySummary.alipay?.allowStub ? '开启' : '关闭') }}</li>
        </ul>
      </el-card>

      <el-card class="payment-center-panel payment-center-gateway-card">
        <template #header>银行卡出款就绪度</template>
        <div class="payment-center-gateway-state-row">
          <span class="payment-center-gateway-badge" :class="gatewaySummary.bankCard?.ready ? 'is-ready' : 'is-danger'">
            {{ gatewaySummary.bankCard?.ready ? '已就绪' : '未完成' }}
          </span>
          <span class="payment-center-gateway-meta">{{ gatewaySummary.bankCard?.integrationTarget || 'bank-payout-sidecar' }}</span>
        </div>
        <ul class="payment-center-gateway-list">
          <li>到账时效：{{ gatewaySummary.bankCard?.arrivalText || '24小时-48小时' }}</li>
          <li>侧车地址：{{ gatewaySummary.bankCard?.sidecarUrlConfigured ? '已配置' : '未配置' }}</li>
          <li>供应商地址：{{ gatewaySummary.bankCard?.providerUrlConfigured ? '已配置' : '未配置' }}</li>
          <li>商户号：{{ gatewaySummary.bankCard?.merchantIdConfigured ? '已配置' : '未配置' }}</li>
          <li>API Key：{{ gatewaySummary.bankCard?.apiKeyConfigured ? '已配置' : '未配置' }}</li>
          <li>回调地址：{{ gatewaySummary.bankCard?.notifyUrlConfigured ? '已配置' : '未配置' }}</li>
          <li>Stub 兜底：{{ gatewaySummary.bankCard?.allowStubBlocked ? '已封禁(生产/类生产环境)' : (gatewaySummary.bankCard?.allowStub ? '开启' : '关闭') }}</li>
        </ul>
      </el-card>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  loadAll: {
    type: Function,
    required: true,
  },
  saveAll: {
    type: Function,
    required: true,
  },
  riderDepositOverview: {
    type: Object,
    required: true,
  },
  gatewaySummary: {
    type: Object,
    required: true,
  },
})
</script>
