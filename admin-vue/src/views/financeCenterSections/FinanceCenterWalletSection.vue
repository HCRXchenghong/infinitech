<template>
  <div class="two-col">
    <div class="stack-col">
      <el-card class="card">
        <div class="card-title wallet-card-title">
          <span>账号充值</span>
          <el-button type="primary" size="small" @click="openRechargeDialog">发起充值</el-button>
        </div>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="功能说明">
            <span class="wallet-tip">可向任意用户、骑手或商户账号充值余额，充值记录将计入钱包流水</span>
          </el-descriptions-item>
          <el-descriptions-item label="最近充值">
            <span v-if="lastRecharge" class="wallet-record">
              {{ formatUserType(lastRecharge.userType) }}
              #{{ lastRecharge.userId }} 充值 ¥{{ (lastRecharge.amount / 100).toFixed(2) }}
            </span>
            <span v-else class="wallet-empty">暂无记录</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="card">
        <div class="card-title wallet-card-title">
          <span>账户扣款</span>
          <el-button type="warning" size="small" @click="openDeductDialog">发起扣款</el-button>
        </div>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="功能说明">
            <span class="wallet-tip">可从任意用户、骑手或商户账号扣除余额，扣款记录将计入钱包流水</span>
          </el-descriptions-item>
          <el-descriptions-item label="最近扣款">
            <span v-if="lastDeduct" class="wallet-record">
              {{ formatUserType(lastDeduct.userType) }}
              #{{ lastDeduct.userId }} 扣款 ¥{{ (lastDeduct.amount / 100).toFixed(2) }}
            </span>
            <span v-else class="wallet-empty">暂无记录</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>

    <el-card class="card">
      <div class="card-title">虚拟币兑换比例</div>
      <el-form label-width="110px" size="small">
        <el-form-item label="1元 = 虚拟币">
          <el-input-number
            :model-value="coinRatioRatio"
            :min="1"
            :max="10000"
            :precision="0"
            style="width: 160px"
            @update:model-value="updateCoinRatio"
          />
          <span class="coin-unit">枚</span>
        </el-form-item>
        <el-form-item label="说明">
          <span class="coin-tip">用户充值 1 元人民币将获得 {{ coinRatioRatio }} 枚虚拟币</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="savingCoinRatio" @click="saveCoinRatio">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
defineProps({
  coinRatioRatio: {
    type: Number,
    default: 1,
  },
  savingCoinRatio: {
    type: Boolean,
    default: false,
  },
  lastRecharge: {
    type: Object,
    default: null,
  },
  lastDeduct: {
    type: Object,
    default: null,
  },
  formatUserType: {
    type: Function,
    required: true,
  },
  updateCoinRatio: {
    type: Function,
    required: true,
  },
  saveCoinRatio: {
    type: Function,
    required: true,
  },
  openRechargeDialog: {
    type: Function,
    required: true,
  },
  openDeductDialog: {
    type: Function,
    required: true,
  },
})
</script>

<style scoped>
.wallet-card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wallet-tip {
  color: #6b7280;
  font-size: 13px;
}

.wallet-record {
  color: #374151;
  font-size: 13px;
}

.wallet-empty {
  color: #9ca3af;
  font-size: 13px;
}

.coin-unit {
  margin-left: 8px;
  color: #6b7280;
  font-size: 13px;
}

.coin-tip {
  color: #9ca3af;
  font-size: 12px;
}
</style>
