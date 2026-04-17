<template>
  <div class="payment-center-page">
    <div class="hero">
      <div>
        <p class="eyebrow">财务配置中台</p>
        <h1>支付中心</h1>
        <p class="subtitle">
          统一维护支付渠道、提现费、分账规则、骑手保证金和银行卡提现时效。这里保留现有管理端骨架，只把原本分散或缺失的能力盘活。
        </p>
      </div>
      <div class="hero-actions">
        <el-button :loading="loading" @click="loadAll">刷新</el-button>
        <el-button type="primary" :loading="saving" @click="saveAll">保存全部配置</el-button>
      </div>
    </div>

    <PageStateAlert :message="pageError" />

    <div class="summary-grid">
      <el-card class="summary-card">
        <span class="summary-label">保证金总记录</span>
        <strong>{{ riderDepositOverview.total || 0 }}</strong>
      </el-card>
      <el-card class="summary-card">
        <span class="summary-label">锁定中</span>
        <strong>{{ riderDepositOverview.paid_locked || 0 }}</strong>
      </el-card>
      <el-card class="summary-card">
        <span class="summary-label">可提现</span>
        <strong>{{ riderDepositOverview.withdrawable || 0 }}</strong>
      </el-card>
      <el-card class="summary-card">
        <span class="summary-label">提现处理中</span>
        <strong>{{ riderDepositOverview.withdrawing || 0 }}</strong>
      </el-card>
    </div>

    <div class="gateway-grid">
      <el-card class="panel gateway-card">
        <template #header>支付网关环境</template>
        <div class="gateway-state-row">
          <span class="gateway-badge" :class="gatewaySummary.mode?.isProd ? 'is-ready' : 'is-warn'">
            {{ gatewaySummary.mode?.isProd ? '生产模式' : '开发/沙箱' }}
          </span>
          <span class="gateway-meta">当前支付链路运行环境</span>
        </div>
      </el-card>

      <el-card class="panel gateway-card">
        <template #header>微信支付就绪度</template>
        <div class="gateway-state-row">
          <span class="gateway-badge" :class="gatewaySummary.wechat?.ready ? 'is-ready' : 'is-danger'">
            {{ gatewaySummary.wechat?.ready ? '已就绪' : '未完成' }}
          </span>
          <span class="gateway-meta">{{ gatewaySummary.wechat?.integrationTarget || 'official-go-sdk' }}</span>
        </div>
        <ul class="gateway-list">
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

      <el-card class="panel gateway-card">
        <template #header>支付宝就绪度</template>
        <div class="gateway-state-row">
          <span class="gateway-badge" :class="gatewaySummary.alipay?.ready ? 'is-ready' : 'is-danger'">
            {{ gatewaySummary.alipay?.ready ? '已就绪' : '未完成' }}
          </span>
          <span class="gateway-meta">{{ gatewaySummary.alipay?.integrationTarget || 'official-sidecar-sdk' }}</span>
        </div>
        <ul class="gateway-list">
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

      <el-card class="panel gateway-card">
        <template #header>银行卡出款就绪度</template>
        <div class="gateway-state-row">
          <span class="gateway-badge" :class="gatewaySummary.bankCard?.ready ? 'is-ready' : 'is-danger'">
            {{ gatewaySummary.bankCard?.ready ? '已就绪' : '未完成' }}
          </span>
          <span class="gateway-meta">{{ gatewaySummary.bankCard?.integrationTarget || 'bank-payout-sidecar' }}</span>
        </div>
        <ul class="gateway-list">
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

    <el-tabs v-model="activeTab" class="tabs">
      <el-tab-pane label="支付基础" name="basic">
        <div class="two-col">
          <el-card class="panel">
            <template #header>运行环境</template>
            <el-form label-width="120px">
              <el-form-item label="生产模式">
                <el-switch v-model="state.pay_mode.isProd" />
              </el-form-item>
            </el-form>
          </el-card>

          <el-card class="panel">
            <template #header>银行卡提现</template>
            <el-form label-width="120px">
              <el-form-item label="到账时效">
                <el-input v-model="state.bank_card_config.arrival_text" placeholder="24小时-48小时" />
              </el-form-item>
              <el-form-item label="侧车地址">
                <el-input v-model="state.bank_card_config.sidecar_url" placeholder="http://bank-payout-sidecar:10302" />
              </el-form-item>
              <el-form-item label="供应商地址">
                <el-input v-model="state.bank_card_config.provider_url" placeholder="https://bank-provider.example.com" />
              </el-form-item>
              <el-form-item label="商户号">
                <el-input v-model="state.bank_card_config.merchant_id" />
              </el-form-item>
              <el-form-item label="API Key">
                <el-input v-model="state.bank_card_config.api_key" show-password />
              </el-form-item>
              <el-form-item label="回调地址">
                <el-input v-model="state.bank_card_config.notify_url" />
              </el-form-item>
              <el-form-item label="允许 Stub">
                <el-switch v-model="state.bank_card_config.allow_stub" />
              </el-form-item>
              <div class="hint">仅商户端和骑手端开放银行卡提现，用户端不展示该选项。</div>
              <div class="hint">未配置真实供应商时，可暂时打开 Stub 兜底，保留 24-48 小时异步出款业务态。</div>
              <div class="hint">推荐银行卡回调地址：`/api/payment/callback/bank-card/payout`，第三方出款回调与后台补单统一走这条链路。</div>
              <div class="hint">如果暂时无法直连真实出款渠道，可先配置管理端人工打款流程；一旦侧车和供应商打通，再切回自动异步通知。</div>
            </el-form>
          </el-card>
        </div>

        <div class="two-col">
          <el-card class="panel">
            <template #header>微信支付配置</template>
            <el-form label-width="120px">
              <el-form-item label="AppID">
                <el-input v-model="state.wxpay_config.appId" />
              </el-form-item>
              <el-form-item label="商户号">
                <el-input v-model="state.wxpay_config.mchId" />
              </el-form-item>
              <el-form-item label="API Key">
                <el-input v-model="state.wxpay_config.apiKey" />
              </el-form-item>
              <el-form-item label="API V3 Key">
                <el-input v-model="state.wxpay_config.apiV3Key" />
              </el-form-item>
              <el-form-item label="证书序列号">
                <el-input v-model="state.wxpay_config.serialNo" />
              </el-form-item>
              <el-form-item label="回调地址">
                <el-input v-model="state.wxpay_config.notifyUrl" />
              </el-form-item>
              <el-form-item label="退款回调">
                <el-input v-model="state.wxpay_config.refundNotifyUrl" />
              </el-form-item>
              <el-form-item label="出款回调">
                <el-input v-model="state.wxpay_config.payoutNotifyUrl" />
              </el-form-item>
              <el-form-item label="出款场景 ID">
                <el-input v-model="state.wxpay_config.payoutSceneId" placeholder="留空则使用商户默认场景" />
              </el-form-item>
            </el-form>
          </el-card>

          <el-card class="panel">
            <template #header>支付宝配置</template>
            <el-form label-width="120px">
              <el-form-item label="AppID">
                <el-input v-model="state.alipay_config.appId" />
              </el-form-item>
              <el-form-item label="私钥">
                <el-input v-model="state.alipay_config.privateKey" type="textarea" :rows="4" />
              </el-form-item>
              <el-form-item label="支付宝公钥">
                <el-input v-model="state.alipay_config.alipayPublicKey" type="textarea" :rows="4" />
              </el-form-item>
              <el-form-item label="回调地址">
                <el-input v-model="state.alipay_config.notifyUrl" />
              </el-form-item>
              <el-form-item label="出款回调">
                <el-input v-model="state.alipay_config.payoutNotifyUrl" />
              </el-form-item>
              <el-form-item label="侧车地址">
                <el-input v-model="state.alipay_config.sidecarUrl" />
              </el-form-item>
              <el-form-item label="沙箱模式">
                <el-switch v-model="state.alipay_config.sandbox" />
              </el-form-item>
            </el-form>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="渠道矩阵" name="channels">
        <el-card class="panel">
          <template #header>
            <div class="header-row">
              <span>分端分场景渠道开关</span>
              <el-button size="small" @click="addChannelRow">新增渠道</el-button>
            </div>
          </template>
          <el-table :data="state.channel_matrix" size="small" stripe>
            <el-table-column label="适用端" width="140">
              <template #default="{ row }">
                <el-select v-model="row.user_type" placeholder="端">
                  <el-option label="用户" value="customer" />
                  <el-option label="骑手" value="rider" />
                  <el-option label="商户" value="merchant" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="平台" width="140">
              <template #default="{ row }">
                <el-select v-model="row.platform">
                  <el-option label="App" value="app" />
                  <el-option label="小程序" value="mini_program" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="场景" width="180">
              <template #default="{ row }">
                <el-select v-model="row.scene">
                  <el-option label="订单支付" value="order_payment" />
                  <el-option label="钱包充值" value="wallet_recharge" />
                  <el-option label="钱包提现" value="wallet_withdraw" />
                  <el-option label="骑手保证金" value="rider_deposit" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="渠道" width="150">
              <template #default="{ row }">
                <el-select v-model="row.channel">
                  <el-option label="IF-Pay" value="ifpay" />
                  <el-option label="微信" value="wechat" />
                  <el-option label="支付宝" value="alipay" />
                  <el-option label="银行卡" value="bank_card" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="显示名称" min-width="140">
              <template #default="{ row }">
                <el-input v-model="row.label" />
              </template>
            </el-table-column>
            <el-table-column label="描述" min-width="180">
              <template #default="{ row }">
                <el-input v-model="row.description" />
              </template>
            </el-table-column>
            <el-table-column label="启用" width="90">
              <template #default="{ row }">
                <el-switch v-model="row.enabled" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ $index }">
                <el-button link type="danger" @click="removeRow(state.channel_matrix, $index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="提现费" name="fees">
        <el-card class="panel">
          <template #header>
            <div class="header-row">
              <span>提现手续费规则</span>
              <el-button size="small" @click="addFeeRule">新增规则</el-button>
            </div>
          </template>
          <el-table :data="state.withdraw_fee_rules" size="small" stripe>
            <el-table-column label="适用端" width="120">
              <template #default="{ row }">
                <el-select v-model="row.user_type">
                  <el-option label="用户" value="customer" />
                  <el-option label="骑手" value="rider" />
                  <el-option label="商户" value="merchant" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="提现渠道" width="130">
              <template #default="{ row }">
                <el-select v-model="row.withdraw_method">
                  <el-option label="微信" value="wechat" />
                  <el-option label="支付宝" value="alipay" />
                  <el-option label="银行卡" value="bank_card" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="最小金额(分)" width="140">
              <template #default="{ row }">
                <el-input-number v-model="row.min_amount" :min="0" />
              </template>
            </el-table-column>
            <el-table-column label="最大金额(分)" width="140">
              <template #default="{ row }">
                <el-input-number v-model="row.max_amount" :min="0" />
              </template>
            </el-table-column>
            <el-table-column label="费率(bp)" width="130">
              <template #default="{ row }">
                <el-input-number v-model="row.rate_basis_points" :min="0" />
              </template>
            </el-table-column>
            <el-table-column label="最小手续费(分)" width="150">
              <template #default="{ row }">
                <el-input-number v-model="row.min_fee" :min="0" />
              </template>
            </el-table-column>
            <el-table-column label="最大手续费(分)" width="150">
              <template #default="{ row }">
                <el-input-number v-model="row.max_fee" :min="0" />
              </template>
            </el-table-column>
            <el-table-column label="启用" width="90">
              <template #default="{ row }">
                <el-switch v-model="row.enabled" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ $index }">
                <el-button link type="danger" @click="removeRow(state.withdraw_fee_rules, $index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="分账规则" name="settlement">
        <div class="two-col settlement-grid">
          <el-card class="panel">
            <template #header>
              <div class="header-row">
                <span>分账对象</span>
                <el-button size="small" @click="addSubject">新增对象</el-button>
              </div>
            </template>
            <el-table :data="state.settlement_subjects" size="small" stripe>
              <el-table-column label="名称" min-width="120">
                <template #default="{ row }">
                  <el-input v-model="row.name" />
                </template>
              </el-table-column>
              <el-table-column label="类型" width="120">
                <template #default="{ row }">
                  <el-select v-model="row.subject_type">
                    <el-option label="学校" value="school" />
                    <el-option label="平台" value="platform" />
                    <el-option label="骑手" value="rider" />
                    <el-option label="商户" value="merchant" />
                    <el-option label="自定义" value="custom" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="收款渠道" width="120">
                <template #default="{ row }">
                  <el-select v-model="row.external_channel" clearable>
                    <el-option label="微信" value="wechat" />
                    <el-option label="支付宝" value="alipay" />
                    <el-option label="银行卡" value="bank_card" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="收款账号" min-width="160">
                <template #default="{ row }">
                  <el-input v-model="row.external_account" />
                </template>
              </el-table-column>
              <el-table-column label="启用" width="90">
                <template #default="{ row }">
                  <el-switch v-model="row.enabled" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="90" fixed="right">
                <template #default="{ $index }">
                  <el-button link type="danger" @click="removeRow(state.settlement_subjects, $index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <el-card class="panel">
            <template #header>规则 JSON 编辑</template>
            <el-input
              v-model="state.settlementRulesText"
              type="textarea"
              :rows="16"
              spellcheck="false"
              placeholder="在这里编辑 settlement_rules JSON"
            />
            <div class="hint">当前先保留高自由度编辑方式，支持学校、平台、骑手、商户和自定义对象组合。</div>
          </el-card>
        </div>

        <el-card class="panel">
          <template #header>规则预览</template>
          <div class="preview-toolbar">
            <el-input-number v-model="previewForm.amount" :min="1" placeholder="订单金额(分)" />
            <el-input v-model="previewForm.ruleSetName" placeholder="规则集名称或 UID，留空走默认规则" />
            <el-button type="primary" :loading="previewing" @click="runPreview">预览分账</el-button>
          </div>
          <el-table v-if="settlementPreviewEntries.length" :data="settlementPreviewEntries" size="small" stripe>
            <el-table-column prop="subject_uid" label="对象 UID" min-width="160" />
            <el-table-column prop="calc_type" label="计算方式" width="160" />
            <el-table-column prop="amount" label="金额(分)" width="140" />
            <el-table-column prop="description" label="说明" min-width="200" />
          </el-table>
          <div v-else class="empty-note">输入金额后可以在这里预览实际分账结果。</div>
        </el-card>

        <el-card class="panel">
          <template #header>订单分账查询</template>
          <div class="preview-toolbar">
            <el-input
              v-model="settlementLookupForm.orderId"
              clearable
              placeholder="输入订单 ID / UID / TSID / 日订单号"
              @keyup.enter="loadSettlementOrder"
            />
            <el-button type="primary" :loading="settlementLookupLoading" @click="loadSettlementOrder">查询订单分账</el-button>
            <el-button @click="resetSettlementOrder">清空</el-button>
          </div>
          <div v-if="settlementOrderDetail" class="settlement-order-detail">
            <div class="two-col settlement-order-grid">
              <el-card class="panel detail-panel">
                <template #header>清分快照</template>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="订单标识">{{ settlementOrderDetail.order_id || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="快照状态">{{ settlementSnapshotStatusLabel(settlementOrderDetail.status) }}</el-descriptions-item>
                  <el-descriptions-item label="规则集 UID">{{ settlementOrderDetail.snapshot?.rule_set_uid || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="订单金额">{{ formatFenOrDash(settlementOrderDetail.snapshot?.order_amount) }}</el-descriptions-item>
                  <el-descriptions-item label="生成时间">{{ formatDateTime(settlementOrderDetail.snapshot?.created_at) }}</el-descriptions-item>
                  <el-descriptions-item label="结算时间">{{ formatDateTime(settlementOrderDetail.snapshot?.settled_at || settlementOrderDetail.snapshot?.reversed_at) }}</el-descriptions-item>
                </el-descriptions>
              </el-card>

              <el-card class="panel detail-panel">
                <template #header>订单概览</template>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="订单状态">{{ settlementOrderDetail.order?.status || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="支付状态">{{ settlementOrderDetail.order?.payment_status || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="商户">{{ settlementOrderDetail.order?.merchant_id || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="骑手">{{ settlementOrderDetail.order?.rider_id || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="用户">{{ settlementOrderDetail.order?.user_id || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="店铺">{{ settlementOrderDetail.order?.shop_name || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="创建时间">{{ formatDateTime(settlementOrderDetail.order?.created_at) }}</el-descriptions-item>
                  <el-descriptions-item label="完成时间">{{ formatDateTime(settlementOrderDetail.order?.completed_at) }}</el-descriptions-item>
                </el-descriptions>
              </el-card>
            </div>

            <el-card class="panel detail-panel">
              <template #header>分账分录</template>
              <el-table :data="settlementOrderDetail.ledger_entries || []" size="small" stripe>
                <el-table-column prop="settlement_subject_uid" label="对象 UID" min-width="170" />
                <el-table-column prop="subject_type" label="对象类型" width="120" />
                <el-table-column prop="entry_type" label="分录类型" width="140" />
                <el-table-column label="金额(元)" width="120">
                  <template #default="{ row }">{{ formatFen(row.amount) }}</template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="140" />
                <el-table-column label="发生时间" width="170">
                  <template #default="{ row }">{{ formatDateTime(row.occurred_at || row.updated_at) }}</template>
                </el-table-column>
              </el-table>
            </el-card>

            <el-card class="panel detail-panel">
              <template #header>快照 JSON</template>
              <pre class="json-block">{{ prettyJson(settlementOrderDetail.snapshot_data) }}</pre>
            </el-card>
          </div>
          <div v-else class="empty-note">输入订单号后可以查看实际清分快照和分录。</div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="保证金与提现" name="deposit">
        <div class="two-col">
          <el-card class="panel">
            <template #header>骑手保证金</template>
            <el-form label-width="140px">
              <el-form-item label="保证金金额(分)">
                <el-input-number v-model="state.rider_deposit_policy.amount" :min="0" />
              </el-form-item>
              <el-form-item label="解锁天数">
                <el-input-number v-model="state.rider_deposit_policy.unlock_days" :min="1" />
              </el-form-item>
              <el-form-item label="自动通过提现">
                <el-switch v-model="state.rider_deposit_policy.auto_approve_withdrawal" />
              </el-form-item>
              <el-form-item label="允许缴纳方式">
                <el-checkbox-group v-model="state.rider_deposit_policy.allowed_methods">
                  <el-checkbox label="wechat">微信</el-checkbox>
                  <el-checkbox label="alipay">支付宝</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </el-form>
          </el-card>

          <el-card class="panel">
            <template #header>最近保证金记录</template>
            <el-table :data="state.riderDepositRecords" size="small" stripe>
              <el-table-column prop="rider_id" label="骑手" min-width="120" />
              <el-table-column prop="amount" label="金额(分)" width="120" />
              <el-table-column prop="payment_method" label="缴纳方式" width="120" />
              <el-table-column prop="status" label="状态" width="130" />
              <el-table-column prop="withdraw_request_id" label="提现单" min-width="160" />
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>
      <el-tab-pane label="提现处理" name="withdraw">
        <el-card class="panel">
          <template #header>
            <div class="header-row">
              <span>提现处理队列</span>
              <div class="header-actions">
                <span class="bank-pending-count">自动重试待执行：{{ autoRetryWithdrawCount }}</span>
                <el-select v-model="withdrawFilter.status" clearable placeholder="状态" style="width: 120px">
                  <el-option label="待审核" value="pending_review" />
                  <el-option label="待打款" value="pending_transfer" />
                  <el-option label="转账中" value="transferring" />
                  <el-option label="已完成" value="success" />
                  <el-option label="已失败" value="failed" />
                  <el-option label="已驳回" value="rejected" />
                </el-select>
                <el-select v-model="withdrawFilter.userType" clearable placeholder="端类型" style="width: 120px">
                  <el-option label="用户" value="customer" />
                  <el-option label="骑手" value="rider" />
                  <el-option label="商户" value="merchant" />
                </el-select>
                <el-select v-model="withdrawFilter.withdrawMethod" clearable placeholder="提现渠道" style="width: 140px">
                  <el-option label="微信提现" value="wechat" />
                  <el-option label="支付宝提现" value="alipay" />
                  <el-option label="银行卡提现" value="bank_card" />
                </el-select>
                <el-button size="small" @click="loadAll">刷新</el-button>
              </div>
            </div>
          </template>
          <el-table :data="filteredWithdrawRequests" size="small" stripe>
            <el-table-column prop="request_id" label="提现单号" min-width="180" />
            <el-table-column label="端类型" width="90">
              <template #default="{ row }">{{ withdrawUserTypeLabel(row.user_type) }}</template>
            </el-table-column>
            <el-table-column label="提现渠道" width="110">
              <template #default="{ row }">{{ withdrawMethodLabel(row.withdraw_method) }}</template>
            </el-table-column>
            <el-table-column label="申请金额" width="110">
              <template #default="{ row }">¥{{ formatFen(row.amount) }}</template>
            </el-table-column>
            <el-table-column label="手续费" width="100">
              <template #default="{ row }">¥{{ formatFen(row.fee) }}</template>
            </el-table-column>
            <el-table-column label="到账金额" width="110">
              <template #default="{ row }">¥{{ formatFen(row.actual_amount) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <div class="retry-cell">
                  <span>{{ withdrawStatusLabel(row.status) }}</span>
                  <template v-if="getWithdrawAutoRetry(row)">
                    <el-tag size="small" :type="withdrawAutoRetryTag(row)">
                      {{ withdrawAutoRetryLabel(row) }}
                    </el-tag>
                    <span class="muted-text">{{ withdrawAutoRetryHint(row) }}</span>
                  </template>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="withdraw_account" label="收款账号" min-width="180" show-overflow-tooltip />
            <el-table-column label="创建时间" width="170">
              <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
            </el-table-column>
            <el-table-column label="处理时间" width="170">
              <template #default="{ row }">{{ formatDateTime(row.reviewed_at || row.completed_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" min-width="260" fixed="right">
              <template #default="{ row }">
                <div class="withdraw-actions">
                  <el-button
                    link
                    @click="openWithdrawHistory(row)"
                  >
                    处理轨迹
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'approve')"
                    link
                    type="primary"
                    :loading="withdrawActionLoading === `${row.request_id}:approve`"
                    @click="submitWithdrawAction(row, 'approve')"
                  >
                    通过
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'reject')"
                    link
                    type="danger"
                    :loading="withdrawActionLoading === `${row.request_id}:reject`"
                    @click="submitWithdrawAction(row, 'reject')"
                  >
                    驳回
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'sync_gateway_status')"
                    link
                    :loading="withdrawActionLoading === `${row.request_id}:sync_gateway_status`"
                    @click="syncWithdrawStatus(row)"
                  >
                    同步状态
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'execute')"
                    link
                    type="primary"
                    :loading="withdrawActionLoading === `${row.request_id}:execute`"
                    @click="submitWithdrawAction(row, 'execute')"
                  >
                    发起打款
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'mark_processing')"
                    link
                    :loading="withdrawActionLoading === `${row.request_id}:mark_processing`"
                    @click="submitWithdrawAction(row, 'mark_processing')"
                  >
                    转账中
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'complete')"
                    link
                    type="success"
                    :loading="withdrawActionLoading === `${row.request_id}:complete`"
                    @click="submitWithdrawAction(row, 'complete')"
                  >
                    打款成功
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'fail')"
                    link
                    type="danger"
                    :loading="withdrawActionLoading === `${row.request_id}:fail`"
                    @click="submitWithdrawAction(row, 'fail')"
                  >
                    打款失败
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'retry_payout')"
                    link
                    type="warning"
                    :loading="withdrawActionLoading === `${row.request_id}:retry_payout`"
                    @click="retryWithdrawPayout(row)"
                  >
                    重试打款
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'supplement_success')"
                    link
                    type="success"
                    :loading="withdrawActionLoading === `${row.request_id}:supplement_success`"
                    @click="supplementWithdraw(row, 'supplement_success')"
                  >
                    补记成功
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'supplement_fail')"
                    link
                    type="danger"
                    :loading="withdrawActionLoading === `${row.request_id}:supplement_fail`"
                    @click="supplementWithdraw(row, 'supplement_fail')"
                  >
                    补记失败
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
      <el-tab-pane label="银行卡处理" name="bank-withdraw">
        <el-card class="panel">
          <template #header>
            <div class="header-row">
              <span>银行卡人工打款队列</span>
              <div class="header-actions">
                <span class="bank-pending-count">待处理：{{ pendingBankWithdrawRequests.length }}</span>
                <el-button size="small" @click="loadAll">刷新</el-button>
              </div>
            </div>
          </template>
          <el-table :data="bankWithdrawRequests" size="small" stripe>
            <el-table-column prop="request_id" label="提现单号" min-width="180" />
            <el-table-column label="端类型" width="90">
              <template #default="{ row }">{{ withdrawUserTypeLabel(row.user_type) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">{{ withdrawStatusLabel(row.status) }}</template>
            </el-table-column>
            <el-table-column label="申请/到账" min-width="150">
              <template #default="{ row }">￥{{ formatFen(row.amount) }} / ￥{{ formatFen(row.actual_amount) }}</template>
            </el-table-column>
            <el-table-column label="手续费" width="100">
              <template #default="{ row }">￥{{ formatFen(row.fee) }}</template>
            </el-table-column>
            <el-table-column prop="withdraw_name" label="收款人" width="120" />
            <el-table-column prop="bank_name" label="收款银行" min-width="140" />
            <el-table-column prop="bank_branch" label="收款支行" min-width="180" show-overflow-tooltip />
            <el-table-column label="收款卡号" min-width="160">
              <template #default="{ row }">{{ maskCardNo(row.withdraw_account) }}</template>
            </el-table-column>
            <el-table-column label="打款来源" min-width="220">
              <template #default="{ row }">
                <div class="bank-detail-cell">
                  <div>{{ row.payout_source_bank_name || '-' }}</div>
                  <div class="muted-text">{{ row.payout_source_account_name || '-' }} / {{ maskCardNo(row.payout_source_card_no) }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="打款凭证" width="120">
              <template #default="{ row }">
                <el-button v-if="row.payout_voucher_url" link type="primary" @click="openBankVoucher(row.payout_voucher_url)">查看凭证</el-button>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="驳回原因" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">{{ row.reject_reason || '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" min-width="300" fixed="right">
              <template #default="{ row }">
                <div class="withdraw-actions">
                  <el-button
                    link
                    @click="openWithdrawHistory(row)"
                  >
                    处理轨迹
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'approve')"
                    link
                    type="primary"
                    :loading="withdrawActionLoading === `${row.request_id}:approve`"
                    @click="submitWithdrawAction(row, 'approve')"
                  >
                    通过
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'reject')"
                    link
                    type="danger"
                    :loading="withdrawActionLoading === `${row.request_id}:reject`"
                    @click="submitWithdrawAction(row, 'reject')"
                  >
                    驳回
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'execute')"
                    link
                    type="primary"
                    :loading="withdrawActionLoading === `${row.request_id}:execute`"
                    @click="submitWithdrawAction(row, 'execute')"
                  >
                    尝试直连打款
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'sync_gateway_status')"
                    link
                    :loading="withdrawActionLoading === `${row.request_id}:sync_gateway_status`"
                    @click="syncWithdrawStatus(row)"
                  >
                    同步状态
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'complete')"
                    link
                    type="success"
                    :loading="withdrawActionLoading === `${row.request_id}:complete`"
                    @click="openBankPayoutDialog(row)"
                  >
                    人工打款完成
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'fail')"
                    link
                    type="danger"
                    :loading="withdrawActionLoading === `${row.request_id}:fail`"
                    @click="submitWithdrawAction(row, 'fail')"
                  >
                    打款失败
                  </el-button>
                  <el-button
                    v-if="canWithdrawAction(row, 'retry_payout')"
                    link
                    type="warning"
                    :loading="withdrawActionLoading === `${row.request_id}:retry_payout`"
                    @click="retryWithdrawPayout(row)"
                  >
                    重试打款
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
      <el-tab-pane label="回调日志" name="callback-logs">
        <el-card class="panel">
          <template #header>
            <div class="header-row">
              <span>支付回调与出款日志</span>
              <div class="header-actions">
                <el-button size="small" :loading="callbackLoading" @click="loadPaymentCallbacks">刷新</el-button>
              </div>
            </div>
          </template>
          <div class="filter-row">
            <el-select v-model="callbackFilter.channel" clearable placeholder="渠道" style="width: 140px">
              <el-option label="微信" value="wechat" />
              <el-option label="支付宝" value="alipay" />
              <el-option label="银行卡" value="bank_card" />
            </el-select>
            <el-select v-model="callbackFilter.eventType" clearable placeholder="事件" style="width: 180px">
              <el-option label="支付成功" value="payment.success" />
              <el-option label="支付失败" value="payment.fail" />
              <el-option label="退款成功" value="refund.success" />
              <el-option label="退款失败" value="refund.fail" />
              <el-option label="出款成功" value="payout.success" />
              <el-option label="出款失败" value="payout.fail" />
              <el-option label="处理中" value="payout.processing" />
            </el-select>
            <el-select v-model="callbackFilter.status" clearable placeholder="处理状态" style="width: 160px">
              <el-option label="已处理" value="success" />
              <el-option label="待处理" value="pending" />
              <el-option label="处理失败" value="failed" />
              <el-option label="已忽略" value="ignored" />
            </el-select>
            <el-select v-model="callbackFilter.verified" clearable placeholder="验签" style="width: 140px">
              <el-option label="通过" value="true" />
              <el-option label="失败" value="false" />
            </el-select>
            <el-input v-model="callbackFilter.transactionId" clearable placeholder="关联交易号" style="width: 220px" />
            <el-input v-model="callbackFilter.thirdPartyOrderId" clearable placeholder="第三方单号" style="width: 220px" />
            <el-button type="primary" :loading="callbackLoading" @click="loadPaymentCallbacks">筛选</el-button>
            <el-button @click="resetCallbackFilters">重置</el-button>
          </div>
          <el-table :data="state.paymentCallbacks" size="small" stripe v-loading="callbackLoading">
            <el-table-column prop="callback_id" label="回调号" min-width="180" />
            <el-table-column label="渠道" width="100">
              <template #default="{ row }">{{ paymentCallbackChannelLabel(row.channel) }}</template>
            </el-table-column>
            <el-table-column prop="event_type" label="事件" min-width="140" />
            <el-table-column label="处理状态" width="120">
              <template #default="{ row }">
                <el-tag :type="paymentCallbackStatusTag(row)" size="small">{{ paymentCallbackStatusLabel(row) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="关联交易" min-width="160">
              <template #default="{ row }">{{ row.transaction_id || row.transaction?.transaction_id || '-' }}</template>
            </el-table-column>
            <el-table-column label="第三方单号" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ row.third_party_order_id || row.transaction?.third_party_order_id || '-' }}</template>
            </el-table-column>
            <el-table-column label="请求摘要" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="callback-preview-cell">
                  <span>{{ row.request_body_preview || '-' }}</span>
                  <el-tag v-if="row.is_admin_replay" size="small" type="warning">后台重放</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="170">
              <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
            </el-table-column>
            <el-table-column label="处理时间" width="170">
              <template #default="{ row }">{{ formatDateTime(row.processed_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openPaymentCallbackDetail(row)">详情</el-button>
                <el-button
                  v-if="canReplayPaymentCallback(row)"
                  link
                  type="warning"
                  :loading="callbackReplayLoading === (row.callback_id || row.callbackId)"
                  @click="replayPaymentCallback(row)"
                >
                  重放
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="bankPayoutDialogVisible"
      title="银行卡人工打款完成"
      width="720px"
      destroy-on-close
      @closed="handleBankPayoutDialogClosed"
    >
      <el-form label-width="120px">
        <el-form-item label="提现单号">
          <el-input :model-value="bankPayoutForm.requestId" disabled />
        </el-form-item>
        <el-form-item label="打款凭证" required>
          <ImageUpload v-model="bankPayoutForm.payoutVoucherUrl" upload-domain="admin_asset" />
        </el-form-item>
        <el-form-item label="出款银行" required>
          <el-input v-model="bankPayoutForm.payoutSourceBankName" placeholder="例如：中国工商银行" />
        </el-form-item>
        <el-form-item label="出款支行" required>
          <el-input v-model="bankPayoutForm.payoutSourceBankBranch" placeholder="请填写具体支行" />
        </el-form-item>
        <el-form-item label="出款卡号" required>
          <el-input v-model="bankPayoutForm.payoutSourceCardNo" placeholder="请填写实际打款卡号" />
        </el-form-item>
        <el-form-item label="出款户名" required>
          <el-input v-model="bankPayoutForm.payoutSourceAccountName" placeholder="请填写打款账户名" />
        </el-form-item>
        <el-form-item label="流水号">
          <el-input v-model="bankPayoutForm.payoutReferenceNo" placeholder="银行回单号或内部打款流水号" />
        </el-form-item>
        <el-form-item label="处理说明">
          <el-input v-model="bankPayoutForm.transferResult" type="textarea" :rows="3" placeholder="请填写打款备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bankPayoutDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="bankPayoutSubmitting" @click="submitBankPayoutComplete">确认已打款</el-button>
      </template>
    </el-dialog>
    <el-dialog
      v-model="withdrawHistoryDialogVisible"
      title="提现处理轨迹"
      width="820px"
      destroy-on-close
      @closed="resetWithdrawHistory"
    >
      <div v-if="withdrawHistoryTarget.requestId" class="history-header">
        <el-tag size="small" type="info">{{ withdrawHistoryTarget.requestId }}</el-tag>
        <span>{{ withdrawMethodLabel(withdrawHistoryTarget.method) }}</span>
        <span class="muted-text">{{ withdrawUserTypeLabel(withdrawHistoryTarget.userType) }}</span>
        <span class="muted-text">申请金额：{{ formatFen(withdrawHistoryTarget.amount) }}</span>
      </div>
      <el-table :data="withdrawActionHistory" size="small" stripe v-loading="withdrawHistoryLoading">
        <el-table-column label="处理时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="动作" width="170">
          <template #default="{ row }">{{ withdrawOperationTypeLabel(row.operation_type) }}</template>
        </el-table-column>
        <el-table-column label="处理人" min-width="160">
          <template #default="{ row }">{{ formatAdminOperationActor(row) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="处理说明" min-width="180" show-overflow-tooltip />
        <el-table-column prop="remark" label="备注" min-width="220" show-overflow-tooltip />
      </el-table>
      <el-empty v-if="!withdrawHistoryLoading && !withdrawActionHistory.length" description="暂无处理轨迹" />
      <template #footer>
        <el-button @click="withdrawHistoryDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
    <el-drawer
      v-model="callbackDetailVisible"
      title="回调详情"
      size="720px"
      destroy-on-close
    >
      <div v-if="callbackDetail" v-loading="callbackDetailLoading" class="callback-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="回调号">{{ callbackDetail.callback_id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="渠道">{{ paymentCallbackChannelLabel(callbackDetail.channel) }}</el-descriptions-item>
          <el-descriptions-item label="事件">{{ callbackDetail.event_type || '-' }}</el-descriptions-item>
          <el-descriptions-item label="处理状态">{{ paymentCallbackStatusLabel(callbackDetail) }}</el-descriptions-item>
          <el-descriptions-item label="关联交易">{{ callbackDetail.transaction_id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="第三方单号">{{ callbackDetail.third_party_order_id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(callbackDetail.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="处理时间">{{ formatDateTime(callbackDetail.processed_at) }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{ callbackDetail.is_admin_replay ? '后台重放' : '原始回调' }}</el-descriptions-item>
          <el-descriptions-item label="来源回调">{{ callbackDetail.replayed_from_callback_id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="重放管理员">{{ callbackDetail.replay_admin_name || callbackDetail.replay_admin_id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="验签指纹" :span="2">{{ callbackDetail.replay_fingerprint || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div class="callback-actions">
          <el-button
            v-if="canReplayPaymentCallback(callbackDetail)"
            type="warning"
            plain
            :loading="callbackReplayLoading === (callbackDetail.callback_id || callbackDetail.callbackId)"
            @click="replayPaymentCallback(callbackDetail)"
          >
            重放这条已验签回调
          </el-button>
          <span class="hint">适用于异步回调已入库但业务链未正确推进时的后台补偿处理。</span>
        </div>

        <el-card class="panel detail-panel" v-if="callbackDetail.transaction">
          <template #header>关联交易</template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="交易号">{{ callbackDetail.transaction.transaction_id || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ callbackDetail.transaction.status || '-' }}</el-descriptions-item>
            <el-descriptions-item label="业务类型">{{ callbackDetail.transaction.business_type || '-' }}</el-descriptions-item>
            <el-descriptions-item label="支付渠道">{{ callbackDetail.transaction.payment_channel || '-' }}</el-descriptions-item>
            <el-descriptions-item label="用户">{{ callbackDetail.transaction.user_id || '-' }}</el-descriptions-item>
            <el-descriptions-item label="端类型">{{ withdrawUserTypeLabel(callbackDetail.transaction.user_type) }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="panel detail-panel" v-if="callbackDetail.withdraw">
          <template #header>关联提现单</template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="提现单号">{{ callbackDetail.withdraw.request_id || '-' }}</el-descriptions-item>
            <el-descriptions-item label="提现状态">{{ withdrawStatusLabel(callbackDetail.withdraw.status) }}</el-descriptions-item>
            <el-descriptions-item label="提现渠道">{{ withdrawMethodLabel(callbackDetail.withdraw.withdraw_method) }}</el-descriptions-item>
            <el-descriptions-item label="申请到账">{{ formatFen(callbackDetail.withdraw.actual_amount) }}</el-descriptions-item>
            <el-descriptions-item label="手续费">{{ formatFen(callbackDetail.withdraw.fee) }}</el-descriptions-item>
            <el-descriptions-item label="处理说明">{{ callbackDetail.withdraw.transfer_result || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="panel detail-panel">
          <template #header>请求头</template>
          <pre class="json-block">{{ prettyJson(callbackDetail.request_headers_raw || callbackDetail.request_headers) }}</pre>
        </el-card>
        <el-card class="panel detail-panel">
          <template #header>请求体</template>
          <pre class="json-block">{{ prettyJson(callbackDetail.request_body_raw || callbackDetail.request_body) }}</pre>
        </el-card>
        <el-card class="panel detail-panel">
          <template #header>响应体</template>
          <pre class="json-block">{{ prettyJson(callbackDetail.response_body_raw || callbackDetail.response_body) }}</pre>
        </el-card>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  extractEnvelopeData,
  extractErrorMessage,
  extractPaginatedItems,
} from '@infinitech/contracts'
import {
  buildBankPayoutCompletePayload,
  buildPaymentCallbackQuery,
  buildWithdrawHistoryTarget,
  buildWithdrawReviewPayload,
  canReplayPaymentCallback,
  canWithdrawAction,
  createBankPayoutFormState,
  createPaymentCallbackFilterState,
  createPaymentCallbackReplayPayload,
  createWithdrawHistoryTargetState,
  extractPaymentCallbackDetail,
  extractPaymentCallbackPage,
  extractWithdrawRequestPage,
  formatAdminWalletOperationActor,
  formatAdminDateTime as formatDateTime,
  getPaymentCallbackId,
  getWithdrawAutoRetry,
  getWithdrawRequestId,
  getWithdrawReviewActionTitle,
  getWithdrawTransactionId,
  isWithdrawGatewaySubmitted,
  maskCardNo,
  normalizePaymentCenterConfig,
  paymentCallbackChannelLabel,
  paymentCallbackStatusLabel,
  paymentCallbackStatusTag,
  settlementSnapshotStatusLabel,
  withdrawAutoRetryHint,
  withdrawAutoRetryLabel,
  withdrawAutoRetryTag,
  withdrawMethodLabel,
  withdrawOperationTypeLabel,
  withdrawStatusLabel,
  withdrawUserTypeLabel,
  validateBankPayoutForm,
} from '@infinitech/admin-core'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'
import ImageUpload from '@/components/ImageUpload.vue'

const activeTab = ref('basic')
const loading = ref(false)
const saving = ref(false)
const previewing = ref(false)
const pageError = ref('')
const riderDepositOverview = ref({})
const settlementPreviewEntries = ref([])
const settlementLookupLoading = ref(false)
const settlementOrderDetail = ref(null)
const gatewaySummary = ref({})
const withdrawActionLoading = ref('')
const bankPayoutDialogVisible = ref(false)
const bankPayoutSubmitting = ref(false)
const withdrawHistoryDialogVisible = ref(false)
const withdrawHistoryLoading = ref(false)
const withdrawActionHistory = ref([])
const callbackLoading = ref(false)
const callbackReplayLoading = ref('')
const callbackDetailLoading = ref(false)
const callbackDetailVisible = ref(false)
const callbackDetail = ref(null)

const state = reactive({
  pay_mode: { isProd: false },
  wxpay_config: { appId: '', mchId: '', apiKey: '', apiV3Key: '', serialNo: '', notifyUrl: '', refundNotifyUrl: '', payoutNotifyUrl: '', payoutSceneId: '' },
  alipay_config: { appId: '', privateKey: '', alipayPublicKey: '', notifyUrl: '', payoutNotifyUrl: '', sidecarUrl: '', sandbox: true },
  channel_matrix: [],
  withdraw_fee_rules: [],
  settlement_subjects: [],
  settlementRulesText: '[]',
  rider_deposit_policy: { amount: 5000, unlock_days: 7, auto_approve_withdrawal: true, allowed_methods: ['wechat', 'alipay'] },
  bank_card_config: {
    arrival_text: '24小时-48小时',
    sidecar_url: '',
    provider_url: '',
    merchant_id: '',
    api_key: '',
    notify_url: '',
    allow_stub: false,
  },
  riderDepositRecords: [],
  withdrawRequests: [],
  paymentCallbacks: [],
})

const bankPayoutForm = reactive({
  ...createBankPayoutFormState(),
})

const withdrawHistoryTarget = reactive({
  ...createWithdrawHistoryTargetState(),
})

const previewForm = reactive({
  amount: 1000,
  ruleSetName: '',
})

const settlementLookupForm = reactive({
  orderId: '',
})

const withdrawFilter = reactive({
  status: '',
  userType: '',
  withdrawMethod: '',
})

const callbackFilter = reactive({
  ...createPaymentCallbackFilterState(),
})

function normalizeListPayload(payload) {
  return extractPaginatedItems(payload).items
}

const filteredWithdrawRequests = computed(() => {
  return (state.withdrawRequests || []).filter((item) => {
    if (withdrawFilter.status && item.status !== withdrawFilter.status) return false
    if (withdrawFilter.userType && item.user_type !== withdrawFilter.userType) return false
    if (withdrawFilter.withdrawMethod && item.withdraw_method !== withdrawFilter.withdrawMethod) return false
    return true
  })
})

const autoRetryWithdrawCount = computed(() => {
  return (state.withdrawRequests || []).filter((item) => {
    const retry = getWithdrawAutoRetry(item)
    return String(item?.status || '') === 'failed' && Boolean(retry?.eligible) && String(retry?.nextRetryAt || '').trim() !== ''
  }).length
})

const bankWithdrawRequests = computed(() => {
  return (state.withdrawRequests || []).filter((item) => String(item.withdraw_method || '') === 'bank_card')
})

const pendingBankWithdrawRequests = computed(() => {
  return bankWithdrawRequests.value.filter((item) => ['pending', 'pending_review', 'pending_transfer', 'transferring'].includes(String(item.status || '')))
})

function normalizeConfig(payload = {}) {
  const normalized = normalizePaymentCenterConfig(payload)
  gatewaySummary.value = normalized.gatewaySummary
  state.pay_mode = normalized.pay_mode
  state.wxpay_config = normalized.wxpay_config
  state.alipay_config = normalized.alipay_config
  state.channel_matrix = normalized.channel_matrix
  state.withdraw_fee_rules = normalized.withdraw_fee_rules
  state.settlement_subjects = normalized.settlement_subjects
  state.settlementRulesText = JSON.stringify(normalized.settlement_rules, null, 2)
  state.rider_deposit_policy = normalized.rider_deposit_policy
  state.bank_card_config = normalized.bank_card_config
}

async function loadAll() {
  loading.value = true
  pageError.value = ''
  try {
    const [configRes, overviewRes, recordsRes, withdrawRes, callbackRes] = await Promise.all([
      request.get('/api/pay-center/config'),
      request.get('/api/rider-deposit/overview'),
      request.get('/api/rider-deposit/records', { params: { page: 1, limit: 20 } }),
      request.get('/api/pay-center/withdraw-requests', { params: { page: 1, limit: 50 } }),
      request.get('/api/admin/wallet/payment-callbacks', { params: { page: 1, limit: 50 } }),
    ])
    normalizeConfig(configRes.data || {})
    riderDepositOverview.value = extractEnvelopeData(overviewRes.data) || {}
    state.riderDepositRecords = normalizeListPayload(recordsRes.data)
    state.withdrawRequests = extractWithdrawRequestPage(withdrawRes.data).items
    state.paymentCallbacks = extractPaymentCallbackPage(callbackRes.data).items
  } catch (error) {
    pageError.value = extractErrorMessage(error, '加载支付中心失败')
  } finally {
    loading.value = false
  }
}

async function loadPaymentCallbacks() {
  callbackLoading.value = true
  pageError.value = ''
  try {
    const { data } = await request.get('/api/admin/wallet/payment-callbacks', {
      params: buildPaymentCallbackQuery(callbackFilter),
    })
    state.paymentCallbacks = extractPaymentCallbackPage(data).items
  } catch (error) {
    pageError.value = extractErrorMessage(error, '加载回调日志失败')
  } finally {
    callbackLoading.value = false
  }
}

function resetCallbackFilters() {
  Object.assign(callbackFilter, createPaymentCallbackFilterState())
  loadPaymentCallbacks()
}

function addChannelRow() {
  state.channel_matrix.push({
    user_type: 'customer',
    platform: 'app',
    scene: 'order_payment',
    channel: 'wechat',
    enabled: true,
    label: '新渠道',
    description: '',
  })
}

function addFeeRule() {
  state.withdraw_fee_rules.push({
    user_type: 'customer',
    withdraw_method: 'wechat',
    min_amount: 0,
    max_amount: 0,
    rate_basis_points: 0,
    min_fee: 0,
    max_fee: 0,
    enabled: true,
    sort_order: state.withdraw_fee_rules.length * 10 + 10,
  })
}

function addSubject() {
  state.settlement_subjects.push({
    uid: `custom-${Date.now()}`,
    name: '新分账对象',
    subject_type: 'custom',
    scope_type: 'global',
    scope_id: '',
    external_account: '',
    external_channel: '',
    account_holder_name: '',
    enabled: true,
    sort_order: state.settlement_subjects.length * 10 + 10,
    notes: '',
  })
}

function removeRow(list, index) {
  list.splice(index, 1)
}

function formatFen(value) {
  return (Number(value || 0) / 100).toFixed(2)
}

function formatFenOrDash(value) {
  if (value === null || value === undefined || value === '') return '-'
  return formatFen(value)
}

function prettyJson(value) {
  if (value == null || value === '') return '-'
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch (_) {
      return value
    }
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch (_) {
    return String(value)
  }
}

async function loadSettlementOrder() {
  const orderId = String(settlementLookupForm.orderId || '').trim()
  if (!orderId) {
    ElMessage.warning('请先输入订单号')
    return
  }
  settlementLookupLoading.value = true
  pageError.value = ''
  try {
    const { data } = await request.get(`/api/settlement/orders/${encodeURIComponent(orderId)}`)
    settlementOrderDetail.value = extractEnvelopeData(data) || null
  } catch (error) {
    settlementOrderDetail.value = null
    pageError.value = extractErrorMessage(error, '查询订单分账失败')
    ElMessage.error(pageError.value)
  } finally {
    settlementLookupLoading.value = false
  }
}

function resetSettlementOrder() {
  settlementLookupForm.orderId = ''
  settlementOrderDetail.value = null
}

async function openPaymentCallbackDetail(row) {
  const callbackId = getPaymentCallbackId(row)
  if (!callbackId) return
  callbackDetailLoading.value = true
  pageError.value = ''
  try {
    const { data } = await request.get(`/api/admin/wallet/payment-callbacks/${encodeURIComponent(callbackId)}`)
    callbackDetail.value = extractPaymentCallbackDetail(data)
    callbackDetailVisible.value = true
  } catch (error) {
    pageError.value = extractErrorMessage(error, '加载回调详情失败')
  } finally {
    callbackDetailLoading.value = false
  }
}

async function replayPaymentCallback(row) {
  const callbackId = getPaymentCallbackId(row)
  if (!callbackId || !canReplayPaymentCallback(row)) return

  const prompt = await ElMessageBox.prompt('请输入这次重放的备注，方便后续审计追踪。', '重放已验签回调', {
    inputPlaceholder: '后台重放已验签回调',
    inputValue: '后台重放已验签回调',
    confirmButtonText: '确认重放',
    cancelButtonText: '取消',
  }).catch(() => null)
  if (!prompt) return

  callbackReplayLoading.value = callbackId
  pageError.value = ''
  try {
    const { data } = await request.post(
      `/api/admin/wallet/payment-callbacks/${encodeURIComponent(callbackId)}/replay`,
      createPaymentCallbackReplayPayload(prompt.value),
    )
    ElMessage.success(data?.duplicated ? '回调已被处理过，已按当前状态回填' : '回调已重放处理')
    await loadPaymentCallbacks()
    const nextCallbackId = data?.callbackId || callbackId
    await openPaymentCallbackDetail({ callback_id: nextCallbackId })
  } catch (error) {
    pageError.value = extractErrorMessage(error, '重放回调失败')
    ElMessage.error(pageError.value)
  } finally {
    callbackReplayLoading.value = ''
  }
}

function resetWithdrawHistory() {
  withdrawActionHistory.value = []
  Object.assign(withdrawHistoryTarget, createWithdrawHistoryTargetState())
}

async function openWithdrawHistory(row) {
  const transactionId = getWithdrawTransactionId(row)
  if (!transactionId) {
    ElMessage.warning('当前提现单缺少关联交易号，暂时无法加载处理轨迹')
    return
  }
  withdrawHistoryDialogVisible.value = true
  withdrawHistoryLoading.value = true
  resetWithdrawHistory()
  Object.assign(withdrawHistoryTarget, buildWithdrawHistoryTarget(row))
  try {
    const { data } = await request.get('/api/pay-center/operations', {
      params: {
        transactionId,
        page: 1,
        limit: 50,
      },
    })
    withdrawActionHistory.value = normalizeListPayload(data)
  } catch (error) {
    pageError.value = extractErrorMessage(error, '加载提现处理轨迹失败')
    ElMessage.error(pageError.value)
  } finally {
    withdrawHistoryLoading.value = false
  }
}

function openBankVoucher(url) {
  const target = String(url || '').trim()
  if (!target) return
  if (typeof window !== 'undefined') {
    window.open(target, '_blank', 'noopener,noreferrer')
  }
}

function openBankPayoutDialog(row) {
  Object.assign(bankPayoutForm, createBankPayoutFormState(row))
  bankPayoutDialogVisible.value = true
}

function handleBankPayoutDialogClosed() {
  Object.assign(bankPayoutForm, createBankPayoutFormState())
}

async function submitWithdrawAction(row, action) {
  const requestId = getWithdrawRequestId(row)
  if (!requestId) return
  if (action === 'complete' && String(row?.withdraw_method || '') === 'bank_card') {
    openBankPayoutDialog(row)
    return
  }

  const actionTitle = getWithdrawReviewActionTitle(action)

  let note = ''
  if (action === 'reject' || action === 'fail') {
    const prompt = await ElMessageBox.prompt('请输入处理说明', actionTitle, {
      inputPlaceholder: '请输入备注或失败原因',
      inputValidator: (value) => (String(value || '').trim() ? true : '请填写处理说明'),
      confirmButtonText: '确认',
      cancelButtonText: '取消',
    }).catch(() => null)
    if (!prompt) return
    note = String(prompt.value || '').trim()
  } else {
    const confirmed = await ElMessageBox.confirm(`确认执行“${actionTitle}”吗？`, '确认操作', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    }).catch(() => false)
    if (!confirmed) return
  }

  withdrawActionLoading.value = `${requestId}:${action}`
  pageError.value = ''
  try {
    await request.post(
      '/api/pay-center/withdraw-requests/review',
      buildWithdrawReviewPayload(requestId, action, { remark: note }),
    )
    ElMessage.success(`${actionTitle}已提交`)
    await loadAll()
  } catch (error) {
    pageError.value = extractErrorMessage(error, `${actionTitle}失败`)
    ElMessage.error(pageError.value)
  } finally {
    withdrawActionLoading.value = ''
  }
}

async function submitBankPayoutComplete() {
  const validationMessage = validateBankPayoutForm(bankPayoutForm)
  if (validationMessage) {
    ElMessage.error(validationMessage)
    return
  }

  bankPayoutSubmitting.value = true
  withdrawActionLoading.value = `${bankPayoutForm.requestId}:complete`
  pageError.value = ''
  try {
    await request.post(
      '/api/pay-center/withdraw-requests/review',
      buildBankPayoutCompletePayload(bankPayoutForm),
    )
    ElMessage.success('\u5df2\u6807\u8bb0\u4e3a\u5df2\u6253\u6b3e\u5e76\u4fdd\u5b58\u51ed\u8bc1')
    bankPayoutDialogVisible.value = false
    Object.assign(bankPayoutForm, createBankPayoutFormState())
    await loadAll()
  } catch (error) {
    pageError.value = extractErrorMessage(error, '\u4fdd\u5b58\u94f6\u884c\u5361\u6253\u6b3e\u8bb0\u5f55\u5931\u8d25')
    ElMessage.error(pageError.value)
  } finally {
    bankPayoutSubmitting.value = false
    withdrawActionLoading.value = ''
  }
}

async function syncWithdrawStatus(row) {
  const requestId = getWithdrawRequestId(row)
  if (!requestId) return
  withdrawActionLoading.value = `${requestId}:sync_gateway_status`
  pageError.value = ''
  try {
    const { data } = await request.post(
      '/api/pay-center/withdraw-requests/review',
      buildWithdrawReviewPayload(requestId, 'sync_gateway_status'),
    )
    ElMessage.success(`同步完成，当前状态：${withdrawStatusLabel(data?.status || row?.status)}`)
    await loadAll()
  } catch (error) {
    pageError.value = extractErrorMessage(error, '同步网关状态失败')
    ElMessage.error(pageError.value)
  } finally {
    withdrawActionLoading.value = ''
  }
}

async function retryWithdrawPayout(row) {
  const requestId = getWithdrawRequestId(row)
  if (!requestId) return
  const confirmed = await ElMessageBox.confirm('确认重试这笔提现打款吗？如果网关未就绪，会先恢复为待打款状态。', '重试打款', {
    confirmButtonText: '确认重试',
    cancelButtonText: '取消',
    type: 'warning',
  }).catch(() => false)
  if (!confirmed) return

  withdrawActionLoading.value = `${requestId}:retry_payout`
  pageError.value = ''
  try {
    const { data } = await request.post(
      '/api/pay-center/withdraw-requests/review',
      buildWithdrawReviewPayload(requestId, 'retry_payout', {
        remark: '后台重试打款',
      }),
    )
    if (data?.warning) {
      ElMessage.warning(data.warning)
    } else {
      ElMessage.success('已重新发起打款')
    }
    await loadAll()
  } catch (error) {
    pageError.value = extractErrorMessage(error, '重试打款失败')
    ElMessage.error(pageError.value)
  } finally {
    withdrawActionLoading.value = ''
  }
}

async function supplementWithdraw(row, action) {
  const requestId = getWithdrawRequestId(row)
  if (!requestId) return

  const isSuccess = action === 'supplement_success'
  const actionTitle = getWithdrawReviewActionTitle(action)
  const defaultRemark = isSuccess ? '后台补记成功' : '后台补记失败'
  const defaultThirdPartyOrderId = row?.third_party_order_id || row?.thirdPartyOrderId || requestId

  const prompt = await ElMessageBox.prompt('请输入补单备注，可选填写第三方单号。', actionTitle, {
    inputPlaceholder: defaultRemark,
    inputValue: defaultRemark,
    confirmButtonText: '确认补记',
    cancelButtonText: '取消',
  }).catch(() => null)
  if (!prompt) return

  const thirdPartyPrompt = await ElMessageBox.prompt('请输入第三方流水号，留空则沿用当前提现单号。', actionTitle, {
    inputPlaceholder: defaultThirdPartyOrderId,
    inputValue: defaultThirdPartyOrderId,
    confirmButtonText: '继续',
    cancelButtonText: '取消',
  }).catch(() => null)
  if (!thirdPartyPrompt) return

  withdrawActionLoading.value = `${requestId}:${action}`
  pageError.value = ''
  try {
    const { data } = await request.post(
      '/api/pay-center/withdraw-requests/review',
      buildWithdrawReviewPayload(requestId, action, {
        remark: String(prompt.value || defaultRemark).trim() || defaultRemark,
        thirdPartyOrderId: String(thirdPartyPrompt.value || defaultThirdPartyOrderId).trim() || defaultThirdPartyOrderId,
      }),
    )
    if (data?.duplicated) {
      ElMessage.warning(`${actionTitle}已存在，已按最新状态回写`)
    } else {
      ElMessage.success(`${actionTitle}已提交`)
    }
    await loadAll()
  } catch (error) {
    pageError.value = extractErrorMessage(error, `${actionTitle}失败`)
    ElMessage.error(pageError.value)
  } finally {
    withdrawActionLoading.value = ''
  }
}

const formatAdminOperationActor = formatAdminWalletOperationActor

async function saveAll() {
  saving.value = true
  pageError.value = ''
  try {
    let settlementRules = []
    try {
      settlementRules = JSON.parse(state.settlementRulesText || '[]')
    } catch (error) {
      throw new Error('分账规则 JSON 格式不正确，请先修正后再保存')
    }
    const payload = {
      pay_mode: state.pay_mode,
      wxpay_config: state.wxpay_config,
      alipay_config: state.alipay_config,
      channel_matrix: state.channel_matrix,
      withdraw_fee_rules: state.withdraw_fee_rules,
      settlement_rules: settlementRules,
      settlement_subjects: state.settlement_subjects,
      rider_deposit_policy: state.rider_deposit_policy,
      bank_card_config: state.bank_card_config,
    }
    const { data } = await request.post('/api/pay-center/config', payload)
    normalizeConfig(data || {})
    ElMessage.success('支付中心配置已保存')
  } catch (error) {
    pageError.value = extractErrorMessage(error, '保存失败')
    ElMessage.error(pageError.value)
  } finally {
    saving.value = false
  }
}

async function runPreview() {
  previewing.value = true
  try {
    const { data } = await request.post('/api/settlement/rule-preview', {
      amount: previewForm.amount,
      ruleSetName: previewForm.ruleSetName,
    })
    settlementPreviewEntries.value = data?.preview_entries || []
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '预览失败'))
  } finally {
    previewing.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped>
.payment-center-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 26px 28px;
  border: 1px solid #eadfc0;
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(255, 186, 73, 0.28), transparent 30%),
    linear-gradient(135deg, #fff7e7, #fff 62%, #edf6ff);
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #9c6400;
}

.hero h1 {
  margin: 0;
  font-size: 30px;
  color: #172033;
}

.subtitle {
  max-width: 760px;
  margin: 10px 0 0;
  line-height: 1.7;
  color: #5b6472;
}

.hero-actions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.gateway-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  border-radius: 18px;
}

.summary-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-label {
  font-size: 13px;
  color: #6b7280;
}

.summary-card strong {
  font-size: 28px;
  color: #111827;
}

.tabs :deep(.el-tabs__item) {
  font-weight: 600;
}

.gateway-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gateway-state-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.gateway-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 76px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.gateway-badge.is-ready {
  background: rgba(38, 153, 67, 0.12);
  color: #1c7c35;
}

.gateway-badge.is-danger {
  background: rgba(199, 73, 73, 0.12);
  color: #b42318;
}

.gateway-badge.is-warn {
  background: rgba(201, 129, 13, 0.12);
  color: #9c6400;
}

.gateway-meta {
  font-size: 12px;
  color: #6b7280;
}

.gateway-list {
  margin: 0;
  padding-left: 18px;
  line-height: 1.7;
  color: #374151;
}

.two-col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.settlement-grid {
  align-items: start;
}

.settlement-order-grid {
  align-items: start;
}

.settlement-order-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel {
  border-radius: 18px;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.header-actions,
.withdraw-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hint {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.7;
  color: #6b7280;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.preview-toolbar .el-input {
  max-width: 280px;
}

.empty-note {
  padding: 28px 0 10px;
  color: #8b93a3;
}

.bank-detail-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.retry-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.muted-text {
  font-size: 12px;
  color: #6b7280;
}

.bank-pending-count {
  font-size: 13px;
  color: #6b7280;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.callback-preview-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.callback-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.callback-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.detail-panel {
  margin-top: 4px;
}

.json-block {
  margin: 0;
  padding: 12px;
  border-radius: 12px;
  background: #0f172a;
  color: #e2e8f0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.7;
}

@media (max-width: 1100px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .gateway-grid {
    grid-template-columns: 1fr;
  }

  .two-col {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-direction: column;
  }
}

@media (max-width: 720px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
