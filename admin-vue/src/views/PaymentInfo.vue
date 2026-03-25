<template>
  <div class="page">
    <div class="title">付款说明管理</div>
    <el-card>
      <el-tabs v-model="paymentTab" @tab-click="loadPaymentNotices">
        <el-tab-pane label="配送服务" name="delivery">
          <div class="form-row">
            <div class="label">配送服务付款说明</div>
            <el-input
              type="textarea"
              v-model="paymentNotices.delivery"
              :rows="8"
              placeholder="请输入配送服务的付款说明、退款规则等"
            />
          </div>
          <div class="actions">
            <el-button type="primary" :loading="saving" @click="savePaymentNotices">保存配送服务说明</el-button>
            <el-button :loading="loading" @click="loadPaymentNotices">刷新</el-button>
          </div>
          <div class="tips">适用于餐食、饮品、快递、跑腿等配送服务</div>
        </el-tab-pane>

        <el-tab-pane label="手机贴膜" name="phone_film">
          <div class="form-row">
            <div class="label">手机贴膜付款说明</div>
            <el-input
              type="textarea"
              v-model="paymentNotices.phone_film"
              :rows="8"
              placeholder="请输入手机贴膜服务的付款说明、退款规则等"
            />
          </div>
          <div class="actions">
            <el-button type="primary" :loading="saving" @click="savePaymentNotices">保存手机贴膜说明</el-button>
            <el-button :loading="loading" @click="loadPaymentNotices">刷新</el-button>
          </div>
          <div class="tips">适用于手机贴膜服务，包含贴膜费用和服务费说明</div>
        </el-tab-pane>

        <el-tab-pane label="拔罐推拿" name="massage">
          <div class="form-row">
            <div class="label">拔罐推拿付款说明</div>
            <el-input
              type="textarea"
              v-model="paymentNotices.massage"
              :rows="8"
              placeholder="请输入拔罐推拿服务的付款说明、退款规则等"
            />
          </div>
          <div class="actions">
            <el-button type="primary" :loading="saving" @click="savePaymentNotices">保存拔罐推拿说明</el-button>
            <el-button :loading="loading" @click="loadPaymentNotices">刷新</el-button>
          </div>
          <div class="tips">适用于拔罐推拿服务，包含服务项目和时长说明</div>
        </el-tab-pane>

        <el-tab-pane label="小众咖啡" name="coffee">
          <div class="form-row">
            <div class="label">小众咖啡付款说明</div>
            <el-input
              type="textarea"
              v-model="paymentNotices.coffee"
              :rows="8"
              placeholder="请输入小众咖啡的付款说明、退款规则等"
            />
          </div>
          <div class="actions">
            <el-button type="primary" :loading="saving" @click="savePaymentNotices">保存小众咖啡说明</el-button>
            <el-button :loading="loading" @click="loadPaymentNotices">刷新</el-button>
          </div>
          <div class="tips">适用于小众咖啡配送服务</div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import request from '@/utils/request';
import { ElMessage } from 'element-plus';

const paymentTab = ref('delivery');
const paymentNotices = reactive({
  delivery: '',
  phone_film: '',
  massage: '',
  coffee: ''
});
const loading = ref(false);
const saving = ref(false);

onMounted(() => {
  loadPaymentNotices();
});

async function loadPaymentNotices() {
  loading.value = true;
  try {
    const { data } = await request.get('/api/payment-notices');
    if (data) {
      Object.assign(paymentNotices, data);
    }
  } catch (e) {
    console.error('加载付款说明失败:', e);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
}

async function savePaymentNotices() {
  saving.value = true;
  try {
    await request.post('/api/payment-notices', paymentNotices);
    ElMessage.success('付款说明保存成功');
  } catch (e) {
    ElMessage.error('保存失败');
    console.error('保存付款说明失败:', e);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.title {
  font-size: 18px;
  font-weight: 700;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-weight: 600;
  color: #333;
}

.actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

.tips {
  margin-top: 10px;
  color: #888;
  font-size: 12px;
}
</style>

