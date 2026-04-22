<template>
  <el-dialog
    :model-value="visible"
    title="新建优惠券"
    width="760px"
    :close-on-click-modal="false"
    @update:model-value="setCreateDialogVisible"
  >
    <el-form :ref="setCreateFormRef" :model="createForm" :rules="createRules" label-width="110px">
      <div class="form-grid">
        <el-form-item label="券名称" prop="name">
          <el-input v-model="createForm.name" maxlength="50" placeholder="例如：客服补偿券" />
        </el-form-item>

        <el-form-item label="来源" prop="source">
          <el-select v-model="createForm.source" style="width: 100%;">
            <el-option label="商户券" value="merchant" />
            <el-option label="客服券" value="customer_service" />
            <el-option label="平台" value="port_1788" />
          </el-select>
        </el-form-item>

        <el-form-item label="店铺ID">
          <el-input v-model="createForm.shopId" placeholder="0=平台通用，商户券需填写店铺ID" />
        </el-form-item>

        <el-form-item label="优惠类型" prop="type">
          <el-select v-model="createForm.type" style="width: 100%;">
            <el-option label="固定金额券" value="fixed" />
            <el-option label="折扣券（百分比）" value="percent" />
          </el-select>
        </el-form-item>

        <el-form-item label="优惠金额" prop="amount">
          <el-input-number v-model="createForm.amount" :min="0.01" :precision="2" :step="1" style="width: 100%;" />
        </el-form-item>

        <el-form-item v-if="createForm.type === 'percent'" label="最大优惠">
          <el-input-number v-model="createForm.maxDiscount" :min="0" :precision="2" :step="1" style="width: 100%;" />
        </el-form-item>

        <el-form-item label="门槛类型">
          <el-radio-group v-model="createForm.conditionType">
            <el-radio label="threshold">满减券</el-radio>
            <el-radio label="no_threshold">无门槛券</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="消费门槛">
          <el-input-number
            v-model="createForm.minAmount"
            :disabled="createForm.conditionType === 'no_threshold'"
            :min="0"
            :precision="2"
            :step="1"
            style="width: 100%;"
          />
        </el-form-item>

        <el-form-item label="发放数量">
          <el-input-number v-model="createForm.totalCount" :min="0" :step="10" style="width: 100%;" />
        </el-form-item>

        <el-form-item label="预算成本(分)">
          <el-input-number v-model="createForm.budgetCost" :min="0" :step="100" style="width: 100%;" />
        </el-form-item>

        <el-form-item label="开始时间" prop="validFrom">
          <el-date-picker v-model="createForm.validFrom" type="datetime" style="width: 100%;" />
        </el-form-item>

        <el-form-item label="结束时间" prop="validUntil">
          <el-date-picker v-model="createForm.validUntil" type="datetime" style="width: 100%;" />
        </el-form-item>

        <el-form-item label="生成链接">
          <el-switch v-model="createForm.claimLinkEnabled" />
        </el-form-item>
      </div>

      <el-form-item label="说明">
        <el-input v-model="createForm.description" type="textarea" :rows="3" maxlength="200" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="setCreateDialogVisible(false)">取消</el-button>
      <el-button type="primary" :loading="creating" @click="submitCreate">创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  createForm: {
    type: Object,
    required: true,
  },
  createFormRef: {
    type: Object,
    default: null,
  },
  createRules: {
    type: Object,
    default: () => ({}),
  },
  creating: {
    type: Boolean,
    default: false,
  },
  setCreateFormRef: {
    type: Function,
    required: true,
  },
  setCreateDialogVisible: {
    type: Function,
    required: true,
  },
  submitCreate: {
    type: Function,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>
