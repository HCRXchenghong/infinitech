<template>
  <div class="page">
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">
          <el-button type="primary" link @click="goBack" style="margin-right: 10px;">← 返回</el-button>
          <span>骑手送单排名</span>
        </div>
        <div class="panel-actions">
          <el-radio-group v-model="period" size="small" @change="() => { dataCache.value.clear(); loadRanks(); }">
            <el-radio-button value="week">周榜</el-radio-button>
            <el-radio-button value="month">月榜</el-radio-button>
          </el-radio-group>
          <el-button size="small" @click="loadRanks(true)" :loading="loading">刷新</el-button>
        </div>
      </div>
      <PageStateAlert :message="loadError" />
      <el-table :data="ranks" stripe size="small" v-loading="loading">
        <el-table-column type="index" label="排名" width="80" :index="indexMethod" />
        <el-table-column prop="name" label="骑手姓名" />
        <el-table-column prop="level" label="段位" width="120">
          <template #default="{ row }">
            <el-tag :type="getRankType(row.level)" size="small">{{ getRankName(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="value" label="送单次数" width="120" align="right">
          <template #default="{ row }">
            <strong>{{ row.value }}</strong>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无排名数据'" :image-size="90" />
        </template>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import request from '@/utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const ranks = ref([]);
const period = ref(route.query.period || 'week');
const loadError = ref('');

// 数据缓存：避免重复加载相同周期的数据
const dataCache = ref(new Map());

function goBack() {
  router.push('/dashboard');
}

function indexMethod(index) {
  return index + 1;
}

async function loadRanks(forceRefresh = false) {
  loadError.value = '';
  // 检查缓存，如果已有数据且不是强制刷新，则直接使用缓存
  const cacheKey = period.value;
  if (!forceRefresh && dataCache.value.has(cacheKey)) {
    ranks.value = dataCache.value.get(cacheKey);
    return;
  }
  
  loading.value = true;
  try {
    const { data } = await request.get(`/api/rider-ranks?period=${period.value}`);
    ranks.value = Array.isArray(data) ? data : [];
    // 缓存数据
    dataCache.value.set(cacheKey, [...ranks.value]);
  } catch (e) {
    ranks.value = [];
    loadError.value = e?.response?.data?.error || e?.response?.data?.message || e?.message || '加载骑手排名失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadRanks();
});

function getRankName(level) {
  const ranks = {
    1: '青铜骑士',
    2: '白银骑士',
    3: '黄金骑士',
    4: '钻石骑士',
    5: '王者骑士',
    6: '传奇大佬'
  };
  return ranks[level] || '青铜骑士';
}

function getRankType(level) {
  if (level >= 6) return 'danger';
  if (level >= 5) return 'warning';
  if (level >= 4) return 'success';
  if (level >= 3) return 'primary';
  return 'info';
}
</script>

<style scoped>
.page {
  padding: 0;
}

.panel {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e6ebf5;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
}

.panel-header {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.panel-title {
  font-weight: 700;
  font-size: 18px;
  display: flex;
  align-items: center;
}

.panel-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
}
</style>

