<template>
  <div class="payment-center-two-col">
    <el-card class="payment-center-panel">
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

    <el-card class="payment-center-panel">
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
</template>

<script setup>
defineProps({
  state: {
    type: Object,
    required: true,
  },
})
</script>
