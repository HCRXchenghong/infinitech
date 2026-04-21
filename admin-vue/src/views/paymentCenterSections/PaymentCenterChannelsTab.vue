<template>
  <el-card class="payment-center-panel">
    <template #header>
      <div class="payment-center-header-row">
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
</template>

<script setup>
defineProps({
  state: {
    type: Object,
    required: true,
  },
  addChannelRow: {
    type: Function,
    required: true,
  },
  removeRow: {
    type: Function,
    required: true,
  },
})
</script>
