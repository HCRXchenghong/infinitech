<template>
  <div>
    <div class="payment-center-two-col payment-center-settlement-grid">
      <el-card class="payment-center-panel">
        <template #header>
          <div class="payment-center-header-row">
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

      <el-card class="payment-center-panel">
        <template #header>规则 JSON 编辑</template>
        <el-input
          v-model="state.settlementRulesText"
          type="textarea"
          :rows="16"
          spellcheck="false"
          placeholder="在这里编辑 settlement_rules JSON"
        />
        <div class="payment-center-hint">当前先保留高自由度编辑方式，支持学校、平台、骑手、商户和自定义对象组合。</div>
      </el-card>
    </div>

    <el-card class="payment-center-panel">
      <template #header>规则预览</template>
      <div class="payment-center-preview-toolbar">
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
      <div v-else class="payment-center-empty-note">输入金额后可以在这里预览实际分账结果。</div>
    </el-card>

    <el-card class="payment-center-panel">
      <template #header>订单分账查询</template>
      <div class="payment-center-preview-toolbar">
        <el-input
          v-model="settlementLookupForm.orderId"
          clearable
          placeholder="输入订单 ID / UID / TSID / 日订单号"
          @keyup.enter="loadSettlementOrder"
        />
        <el-button type="primary" :loading="settlementLookupLoading" @click="loadSettlementOrder">查询订单分账</el-button>
        <el-button @click="resetSettlementOrder">清空</el-button>
      </div>
      <div v-if="settlementOrderDetail" class="payment-center-settlement-order-detail">
        <div class="payment-center-two-col payment-center-settlement-order-grid">
          <el-card class="payment-center-panel payment-center-detail-panel">
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

          <el-card class="payment-center-panel payment-center-detail-panel">
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

        <el-card class="payment-center-panel payment-center-detail-panel">
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

        <el-card class="payment-center-panel payment-center-detail-panel">
          <template #header>快照 JSON</template>
          <pre class="payment-center-json-block">{{ prettyJson(settlementOrderDetail.snapshot_data) }}</pre>
        </el-card>
      </div>
      <div v-else class="payment-center-empty-note">输入订单号后可以查看实际清分快照和分录。</div>
    </el-card>
  </div>
</template>

<script setup>
import { settlementSnapshotStatusLabel, formatAdminDateTime as formatDateTime } from '@infinitech/admin-core'

defineProps({
  state: {
    type: Object,
    required: true,
  },
  addSubject: {
    type: Function,
    required: true,
  },
  removeRow: {
    type: Function,
    required: true,
  },
  previewForm: {
    type: Object,
    required: true,
  },
  previewing: {
    type: Boolean,
    default: false,
  },
  runPreview: {
    type: Function,
    required: true,
  },
  settlementPreviewEntries: {
    type: Array,
    default: () => [],
  },
  settlementLookupForm: {
    type: Object,
    required: true,
  },
  settlementLookupLoading: {
    type: Boolean,
    default: false,
  },
  loadSettlementOrder: {
    type: Function,
    required: true,
  },
  resetSettlementOrder: {
    type: Function,
    required: true,
  },
  settlementOrderDetail: {
    type: Object,
    default: null,
  },
  formatFen: {
    type: Function,
    required: true,
  },
  formatFenOrDash: {
    type: Function,
    required: true,
  },
  prettyJson: {
    type: Function,
    required: true,
  },
})
</script>
