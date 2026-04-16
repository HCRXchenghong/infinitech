<template>
  <div class="merchant-detail">
    <PageStateAlert :message="loadError" />
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 基本信息标签页 -->
      <el-tab-pane label="基本信息" name="basic">
        <el-descriptions :column="2" size="small" border>
          <el-descriptions-item label="商户ID">{{ merchant.id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="商户名称">{{ merchant.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ merchant.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="在线状态">
            <el-tag :type="merchant.is_online ? 'success' : 'info'" size="small">
              {{ merchant.is_online ? '🟢 在线' : '⚪ 离线' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">{{ merchant.created_at || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <!-- 店铺列表标签页 -->
      <el-tab-pane label="店铺列表" name="shops">
        <div style="margin-bottom: 16px;">
          <el-button type="primary" size="small" @click="addShop">新增店铺</el-button>
        </div>
        <el-table :data="merchant.shops || []" stripe size="small">
          <el-table-column prop="id" label="店铺ID" width="80" />
          <el-table-column prop="name" label="店铺名称" min-width="150" />
          <el-table-column label="订单类型" width="100">
            <template #default="{ row }">
              <el-tag size="small">{{ row.orderType || '外卖类' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="业务分类" width="120">
            <template #default="{ row }">
              <el-tag size="small" type="success">{{ row.businessCategory || '美食' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="rating" label="评分" width="80">
            <template #default="{ row }">
              <span style="color: #f59e0b;">★ {{ row.rating || 5.0 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="monthlySales" label="月销量" width="100" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
                {{ row.isActive ? '营业中' : '已关闭' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="editShop(row)">编辑</el-button>
              <el-button type="danger" link size="small" @click="deleteShop(row)">删除</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '该商户暂无店铺'" :image-size="90" />
          </template>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 店铺编辑对话框 -->
    <el-dialog
      v-model="shopDialogVisible"
      :title="shopDialogTitle"
      width="90%"
      :close-on-click-modal="false"
      style="max-width: 1200px;"
    >
      <ShopEditor
        v-if="shopDialogVisible"
        :shop="currentShop"
        :merchant-id="merchant.id"
        @save="handleShopSave"
        @cancel="shopDialogVisible = false"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractErrorMessage } from '@infinitech/contracts';
import request from '@/utils/request';
import ShopEditor from './ShopEditor.vue';
import PageStateAlert from '@/components/PageStateAlert.vue';

const props = defineProps({
  merchant: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['refresh', 'close']);

const activeTab = ref('basic');
const loadError = ref('');
const shopDialogVisible = ref(false);
const shopDialogTitle = ref('新增店铺');
const currentShop = ref(null);

// 新增店铺
function addShop() {
  shopDialogTitle.value = '新增店铺';
  currentShop.value = {
    name: '',
    orderType: '外卖类',
    businessCategory: '美食',
    rating: 5.0,
    monthlySales: 0,
    perCapita: 0,
    minPrice: 0,
    deliveryPrice: 0,
    deliveryTime: '30分钟',
    address: '',
    phone: '',
    coverImage: '',
    backgroundImage: '',
    logo: '',
    announcement: '',
    businessHours: '09:00-22:00',
    tags: [],
    discounts: [],
    isBrand: false,
    isFranchise: false,
    isActive: true
  };
  shopDialogVisible.value = true;
}

// 编辑店铺
function editShop(shop) {
  shopDialogTitle.value = '编辑店铺';
  currentShop.value = { ...shop };
  shopDialogVisible.value = true;
}

// 保存店铺
async function handleShopSave(shopData) {
  loadError.value = '';
  try {
    const data = {
      ...shopData,
      merchant_id: props.merchant.id
    };

    if (shopData.id) {
      await request.put(`/api/shops/${shopData.id}`, data);
      ElMessage.success('更新店铺成功');
    } else {
      await request.post('/api/shops', data);
      ElMessage.success('新增店铺成功');
    }

    shopDialogVisible.value = false;
    emit('refresh');
  } catch (e) {
    loadError.value = extractErrorMessage(e, '保存店铺失败，请稍后重试');
    ElMessage.error(extractErrorMessage(e, '保存店铺失败'));
  }
}

// 删除店铺
async function deleteShop(shop) {
  loadError.value = '';
  try {
    await ElMessageBox.confirm(
      `确定要删除店铺"${shop.name}"吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await request.delete(`/api/shops/${shop.id}`);
    ElMessage.success('删除店铺成功');
    emit('refresh');
  } catch (e) {
    if (e !== 'cancel') {
      loadError.value = extractErrorMessage(e, '删除店铺失败，请稍后重试');
      ElMessage.error(extractErrorMessage(e, '删除店铺失败'));
    }
  }
}
</script>

<style scoped>
.merchant-detail {
  min-height: 400px;
}
</style>
