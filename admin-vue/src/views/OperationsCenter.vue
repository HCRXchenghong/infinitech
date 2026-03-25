<template>
  <div class="page ops-page">
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">运营管理</div>
        <div class="panel-actions">
          <el-button size="small" @click="refreshCurrent" :loading="loading">刷新</el-button>
        </div>
      </div>
      <PageStateAlert :message="loadError" />

      <el-tabs v-model="activeTab">
        <el-tab-pane label="反馈与合作" name="cooperation">
          <el-table :data="cooperations" size="small" stripe v-loading="loading">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="company" label="主题" min-width="160" />
            <el-table-column label="类型" width="120">
              <template #default="{ row }">
                <el-tag size="small" :type="row.cooperation_type === 'feedback' ? 'info' : 'success'">
                  {{ formatCooperationType(row.cooperation_type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="contact_name" label="联系人" width="100" />
            <el-table-column prop="contact_phone" label="电话" width="140" />
            <el-table-column prop="description" label="内容" min-width="220" show-overflow-tooltip />
            <el-table-column prop="created_at" label="提交时间" width="160" />
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-select v-model="row.status" size="small" @change="updateCooperation(row)">
                  <el-option label="待处理" value="pending" />
                  <el-option label="跟进中" value="processing" />
                  <el-option label="已完成" value="done" />
                </el-select>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无反馈与合作记录'" :image-size="90" />
            </template>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="邀请好友" name="invite">
          <div class="sub-section">
            <div class="sub-title">邀请码</div>
            <el-table :data="inviteCodes" size="small" stripe v-loading="loading">
              <el-table-column prop="id" label="ID" width="70" />
              <el-table-column prop="user_id" label="用户ID" width="140" />
              <el-table-column prop="phone" label="手机号" width="140" />
              <el-table-column prop="code" label="邀请码" width="120" />
              <el-table-column prop="created_at" label="创建时间" width="160" />
              <template #empty>
                <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无邀请码数据'" :image-size="90" />
              </template>
            </el-table>
          </div>
          <div class="sub-section">
            <div class="sub-title">邀请记录</div>
            <el-table :data="inviteRecords" size="small" stripe v-loading="loading">
              <el-table-column prop="id" label="ID" width="70" />
              <el-table-column prop="inviter_user_id" label="邀请人ID" width="140" />
              <el-table-column prop="inviter_phone" label="邀请人手机号" width="140" />
              <el-table-column prop="invite_code" label="邀请码" width="120" />
              <el-table-column prop="invitee_user_id" label="被邀请人ID" width="140" />
              <el-table-column prop="invitee_phone" label="被邀请人手机号" width="140" />
              <el-table-column prop="status" label="状态" width="120" />
              <el-table-column prop="reward_points" label="奖励积分" width="100" />
              <el-table-column prop="created_at" label="时间" width="160" />
              <template #empty>
                <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无邀请记录数据'" :image-size="90" />
              </template>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="积分兑换" name="redemption">
          <el-table :data="redemptions" size="small" stripe v-loading="loading">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="user_id" label="用户ID" width="140" />
            <el-table-column prop="user_phone" label="手机号" width="140" />
            <el-table-column prop="good_name" label="兑换商品" min-width="160" />
            <el-table-column prop="points" label="积分" width="90" />
            <el-table-column prop="ship_fee" label="运费" width="90" />
            <el-table-column prop="created_at" label="兑换时间" width="160" />
            <el-table-column label="状态" width="140">
              <template #default="{ row }">
                <el-select v-model="row.status" size="small" @change="updateRedemption(row)">
                  <el-option label="待处理" value="pending" />
                  <el-option label="已发货" value="shipped" />
                  <el-option label="已完成" value="completed" />
                  <el-option label="已取消" value="canceled" />
                </el-select>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无积分兑换记录'" :image-size="90" />
            </template>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="积分商品" name="goods">
          <div class="toolbar">
            <el-button type="primary" size="small" @click="openGoodDialog()">新增商品</el-button>
          </div>
          <el-table :data="goods" size="small" stripe v-loading="loading">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="name" label="名称" min-width="160" />
            <el-table-column prop="points" label="积分" width="90" />
            <el-table-column prop="ship_fee" label="运费" width="90" />
            <el-table-column prop="tag" label="标签" width="100" />
            <el-table-column prop="type" label="类型" width="90" />
            <el-table-column prop="is_active" label="上架" width="80">
              <template #default="{ row }">
                <el-switch v-model="row.is_active" @change="toggleGood(row)" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openGoodDialog(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="deleteGood(row)">删除</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无积分商品数据'" :image-size="90" />
            </template>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="goodDialogVisible" title="积分商品" width="480px">
      <el-form :model="goodForm" label-width="90px">
        <el-form-item label="名称">
          <el-input v-model="goodForm.name" />
        </el-form-item>
        <el-form-item label="积分">
          <el-input-number v-model="goodForm.points" :min="1" />
        </el-form-item>
        <el-form-item label="运费">
          <el-input-number v-model="goodForm.ship_fee" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="goodForm.tag" placeholder="如：实物/VIP" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="goodForm.type">
            <el-option label="实物" value="goods" />
            <el-option label="VIP" value="vip" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="goodForm.desc" type="textarea" />
        </el-form-item>
        <el-form-item label="上架">
          <el-switch v-model="goodForm.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="goodDialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="saveGood">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';

const activeTab = ref('cooperation');
const loading = ref(false);
const loadError = ref('');

const cooperations = ref([]);
const inviteCodes = ref([]);
const inviteRecords = ref([]);
const redemptions = ref([]);
const goods = ref([]);

const goodDialogVisible = ref(false);
const goodForm = ref({
  id: null,
  name: '',
  points: 0,
  ship_fee: 0,
  tag: '',
  type: 'goods',
  desc: '',
  is_active: true
});

onMounted(() => {
  refreshCurrent();
});

watch(activeTab, () => {
  refreshCurrent();
});

function formatCooperationType(type) {
  if (type === 'feedback') return '用户反馈';
  if (type === 'cooperation') return '商务合作';
  return type || '未分类';
}

function refreshCurrent() {
  loadError.value = '';
  if (activeTab.value === 'cooperation') return loadCooperations();
  if (activeTab.value === 'invite') return loadInvites();
  if (activeTab.value === 'redemption') return loadRedemptions();
  if (activeTab.value === 'goods') return loadGoods();
  return Promise.resolve();
}

function extractRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  if (Array.isArray(payload.records)) return payload.records;
  if (Array.isArray(payload.list)) return payload.list;

  const nested = payload.data;
  if (Array.isArray(nested)) return nested;
  if (nested && typeof nested === 'object') {
    if (Array.isArray(nested.records)) return nested.records;
    if (Array.isArray(nested.list)) return nested.list;
  }
  return [];
}

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;
}

async function loadCooperations() {
  loadError.value = '';
  loading.value = true;
  try {
    const { data } = await request.get('/api/cooperations');
    cooperations.value = extractRecords(data);
  } catch (e) {
    cooperations.value = [];
    loadError.value = extractErrorMessage(e, '加载反馈与合作失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

async function updateCooperation(row) {
  try {
    await request.put(`/api/cooperations/${row.id}`, { status: row.status, remark: row.admin_remark || '' });
    ElMessage.success('状态已更新');
  } catch (e) {
    loadCooperations();
    ElMessage.error(`更新失败：${extractErrorMessage(e, '请求异常')}`);
  }
}

async function loadInvites() {
  loadError.value = '';
  loading.value = true;
  try {
    const [codesRes, recordsRes] = await Promise.all([
      request.get('/api/invite/codes'),
      request.get('/api/invite/records')
    ]);
    inviteCodes.value = extractRecords(codesRes.data);
    inviteRecords.value = extractRecords(recordsRes.data);
  } catch (e) {
    inviteCodes.value = [];
    inviteRecords.value = [];
    loadError.value = extractErrorMessage(e, '加载邀请数据失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

async function loadRedemptions() {
  loadError.value = '';
  loading.value = true;
  try {
    const { data } = await request.get('/api/points/redemptions');
    redemptions.value = extractRecords(data);
  } catch (e) {
    redemptions.value = [];
    loadError.value = extractErrorMessage(e, '加载兑换记录失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

async function updateRedemption(row) {
  try {
    await request.put(`/api/points/redemptions/${row.id}`, { status: row.status });
    ElMessage.success('状态已更新');
  } catch (e) {
    loadRedemptions();
    ElMessage.error(`更新失败：${extractErrorMessage(e, '请求异常')}`);
  }
}

async function loadGoods() {
  loadError.value = '';
  loading.value = true;
  try {
    const { data } = await request.get('/api/points/goods', { params: { all: 1 } });
    goods.value = extractRecords(data);
  } catch (e) {
    goods.value = [];
    loadError.value = extractErrorMessage(e, '加载积分商品失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

function openGoodDialog(row) {
  if (row) {
    goodForm.value = { ...row };
  } else {
    goodForm.value = {
      id: null,
      name: '',
      points: 0,
      ship_fee: 0,
      tag: '',
      type: 'goods',
      desc: '',
      is_active: true
    };
  }
  goodDialogVisible.value = true;
}

async function saveGood() {
  const payload = { ...goodForm.value };
  try {
    if (payload.id) {
      await request.put(`/api/points/goods/${payload.id}`, payload);
    } else {
      await request.post('/api/points/goods', payload);
    }
    ElMessage.success('保存成功');
    goodDialogVisible.value = false;
    loadGoods();
  } catch (e) {
    ElMessage.error(`保存失败：${extractErrorMessage(e, '请求异常')}`);
  }
}

async function toggleGood(row) {
  const prevValue = !row.is_active;
  try {
    await request.put(`/api/points/goods/${row.id}`, { is_active: row.is_active });
    ElMessage.success('已更新');
  } catch (e) {
    row.is_active = prevValue;
    ElMessage.error(`更新失败：${extractErrorMessage(e, '请求异常')}`);
  }
}

function deleteGood(row) {
  ElMessageBox.confirm('确认删除该商品吗？', '提示', { type: 'warning' })
    .then(async () => {
      await request.delete(`/api/points/goods/${row.id}`);
      ElMessage.success('删除成功');
      loadGoods();
    })
    .catch((e) => {
      if (e !== 'cancel') {
        ElMessage.error(`删除失败：${extractErrorMessage(e, '请求异常')}`);
      }
    });
}
</script>

<style scoped>
.ops-page .panel-title {
  font-size: 16px;
  font-weight: 600;
}

.sub-section {
  margin-bottom: 20px;
}

.sub-title {
  font-size: 14px;
  font-weight: 600;
  margin: 12px 0;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}
</style>
