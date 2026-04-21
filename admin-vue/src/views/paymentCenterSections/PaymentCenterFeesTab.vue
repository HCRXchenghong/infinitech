<template>
  <el-card class="payment-center-panel">
    <template #header>
      <div class="payment-center-header-row">
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
</template>

<script setup>
defineProps({
  state: {
    type: Object,
    required: true,
  },
  addFeeRule: {
    type: Function,
    required: true,
  },
  removeRow: {
    type: Function,
    required: true,
  },
})
</script>
