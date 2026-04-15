<template>
  <div class="merchant-profile-page" v-loading="loading">
    <div class="page-header">
      <div>
        <div class="page-title">商户详情</div>
        <div class="page-subtitle">商户ID：{{ merchant.id || '-' }}</div>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="goBack">返回商户列表</el-button>
        <el-button type="primary" size="small" @click="openMerchantEdit">编辑商户信息</el-button>
      </div>
    </div>
    <PageStateAlert :message="pageError" />

    <div class="panel">
      <div class="panel-title">商户基本信息</div>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="商户名称">{{ merchant.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="负责人">{{ merchant.owner_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ merchant.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="店铺数量">{{ shops.length }}</el-descriptions-item>
        <el-descriptions-item label="营业执照" :span="2">
          <el-image
            v-if="merchant.business_license_image"
            class="license-image"
            :src="merchant.business_license_image"
            :preview-src-list="[merchant.business_license_image]"
            fit="cover"
          />
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ merchant.created_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ merchant.updated_at || '-' }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <div class="panel">
      <div class="panel-title">入驻邀请信息</div>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="来源">{{ formatOnboardingSource(merchant.onboarding_info?.source) }}</el-descriptions-item>
        <el-descriptions-item label="邀请类型">{{ formatOnboardingType(merchant.onboarding_info?.invite_type) }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ merchant.onboarding_info?.submitted_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邀请链接ID">{{ merchant.onboarding_info?.invite_link_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="链接状态">{{ merchant.onboarding_info?.invite_status || '-' }}</el-descriptions-item>
        <el-descriptions-item label="链接过期">{{ merchant.onboarding_info?.invite_expires_at || '-' }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">店铺信息</div>
        <div class="panel-header-actions">
          <el-button type="primary" size="small" @click="addShop">新增店铺</el-button>
          <el-button size="small" @click="loadShops">刷新店铺</el-button>
        </div>
      </div>
      <el-table :data="shops" stripe size="small">
        <el-table-column label="店铺" min-width="240">
          <template #default="{ row }">
            <div class="shop-base">
              <img v-if="row.logo" class="shop-logo" :src="row.logo" alt="logo" />
              <div v-else class="shop-logo placeholder">LOGO</div>
              <span class="shop-name">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="店铺类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.orderType || '外卖类' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="店铺评分" width="110">
          <template #default="{ row }">
            <span class="rating">★ {{ row.rating || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="monthlySales" label="月销量" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '营业中' : '已关闭' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="goShopDetail(row)">详情</el-button>
            <el-button type="danger" link size="small" @click="deleteShop(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="shopsError ? '加载失败，暂无可显示数据' : '暂无店铺数据'" :image-size="90" />
        </template>
      </el-table>
    </div>

    <el-dialog v-model="merchantEditVisible" title="编辑商户信息" width="520px" :close-on-click-modal="false">
      <el-form :model="merchantForm" label-width="100px">
        <el-form-item label="商户名称" required>
          <el-input v-model="merchantForm.name" placeholder="请输入商户名称" />
        </el-form-item>
        <el-form-item label="负责人" required>
          <el-input v-model="merchantForm.owner_name" placeholder="请输入负责人姓名" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="merchantForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="营业执照">
          <div class="upload-box">
            <el-upload
              :show-file-list="false"
              :auto-upload="false"
              accept="image/*"
              :on-change="handleBusinessLicenseChange"
            >
              <el-button :loading="uploadingBusinessLicense">上传照片</el-button>
            </el-upload>
            <el-image
              v-if="merchantForm.business_license_image"
              class="license-image"
              :src="merchantForm.business_license_image"
              :preview-src-list="[merchantForm.business_license_image]"
              fit="cover"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="merchantEditVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingMerchant" @click="saveMerchant">保存</el-button>
      </template>
    </el-dialog>

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
        :merchant-id="merchant.id || merchantId"
        @save="handleShopSave"
        @cancel="shopDialogVisible = false"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractEnvelopeData, extractErrorMessage, extractUploadAsset } from '@infinitech/contracts';
import request from '@/utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';
import ShopEditor from './ShopEditor.vue';

const route = useRoute();
const router = useRouter();

const merchantId = String(route.params.id || '').trim();

const loading = ref(false);
const merchantError = ref('');
const shopsError = ref('');
const pageError = computed(() => shopsError.value || merchantError.value || '');
const shops = ref([]);
const merchant = ref({
  id: merchantId,
  name: '',
  owner_name: '',
  phone: '',
  business_license_image: '',
  onboarding_info: null
});

const merchantEditVisible = ref(false);
const savingMerchant = ref(false);
const uploadingBusinessLicense = ref(false);
const merchantForm = ref({
  name: '',
  owner_name: '',
  phone: '',
  business_license_image: ''
});
const MAX_LICENSE_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_LICENSE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]);
const ALLOWED_LICENSE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const shopDialogVisible = ref(false);
const shopDialogTitle = ref('新增店铺');
const currentShop = ref(null);

onMounted(async () => {
  await loadMerchant();
  await loadShops();
});

function goBack() {
  router.push('/merchants');
}

async function loadMerchant() {
  merchantError.value = '';
  loading.value = true;
  try {
    const { data } = await request.get(`/api/merchant/${merchantId}`);
    const current = extractEnvelopeData(data) || {};
    merchant.value = {
      ...current,
      owner_name: current.owner_name || current.name || ''
    };
  } catch (error) {
    merchantError.value = extractErrorMessage(error, '加载商户信息失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

async function loadShops() {
  shopsError.value = '';
  try {
    const { data } = await request.get(`/api/merchants/${merchantId}/shops`);
    const payload = extractEnvelopeData(data);
    const list = Array.isArray(payload?.shops) ? payload.shops : [];
    shops.value = list.map((item) => ({
      ...item,
      isActive: item.isActive === true || item.isActive === 1
    }));
  } catch (error) {
    shops.value = [];
    shopsError.value = extractErrorMessage(error, '加载店铺信息失败，请稍后重试');
  }
}

function openMerchantEdit() {
  merchantForm.value = {
    name: merchant.value.name || '',
    owner_name: merchant.value.owner_name || merchant.value.name || '',
    phone: merchant.value.phone || '',
    business_license_image: merchant.value.business_license_image || ''
  };
  merchantEditVisible.value = true;
}

async function handleBusinessLicenseChange(uploadFile) {
  const raw = uploadFile?.raw;
  if (!raw) return;
  const fileName = String(raw.name || '').toLowerCase();
  const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
  const hasValidMime = raw.type ? ALLOWED_LICENSE_MIME_TYPES.has(raw.type) : false;
  const hasValidExtension = extension ? ALLOWED_LICENSE_EXTENSIONS.has(extension) : false;

  if (!hasValidMime && !hasValidExtension) {
    ElMessage.warning('营业执照仅支持 jpg/jpeg/png/gif/webp 格式');
    return;
  }
  if (raw.size > MAX_LICENSE_FILE_SIZE) {
    ElMessage.warning('营业执照图片不能超过 5MB');
    return;
  }

  uploadingBusinessLicense.value = true;
  try {
    const formData = new FormData();
    formData.append('file', raw);
    const { data } = await request.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    const asset = extractUploadAsset(data);
    const nextUrl = asset?.url || '';
    if (!nextUrl) {
      throw new Error('上传返回地址为空');
    }
    merchantForm.value.business_license_image = nextUrl;
    ElMessage.success('营业执照上传成功');
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '营业执照上传失败'));
  } finally {
    uploadingBusinessLicense.value = false;
  }
}

async function saveMerchant() {
  const payload = {
    name: String(merchantForm.value.name || '').trim(),
    owner_name: String(merchantForm.value.owner_name || '').trim(),
    phone: String(merchantForm.value.phone || '').trim(),
    business_license_image: String(merchantForm.value.business_license_image || '').trim()
  };
  if (!payload.owner_name) {
    payload.owner_name = payload.name;
  }

  if (!payload.name || !payload.owner_name || !payload.phone) {
    ElMessage.warning('请完整填写商户信息');
    return;
  }
  if (!/^1[3-9]\d{9}$/.test(payload.phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }

  savingMerchant.value = true;
  try {
    await request.put(`/api/merchants/${merchantId}`, payload);
    ElMessage.success('商户信息已保存');
    merchantEditVisible.value = false;
    await loadMerchant();
  } catch (error) {
    console.error('更新商户失败:', error);
    ElMessage.error(extractErrorMessage(error, '保存失败'));
  } finally {
    savingMerchant.value = false;
  }
}

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

async function handleShopSave(shopData) {
  shopsError.value = '';
  try {
    const data = {
      ...shopData,
      merchant_id: merchant.value.id || merchantId
    };
    await request.post('/api/shops', data);
    ElMessage.success('新增店铺成功');
    shopDialogVisible.value = false;
    await loadShops();
  } catch (error) {
    shopsError.value = error?.response?.data?.error || error?.response?.data?.message || error?.message || '保存店铺失败，请稍后重试';
    ElMessage.error(error?.response?.data?.error || '保存店铺失败');
  }
}

function goShopDetail(shop) {
  router.push(`/merchants/${merchantId}/shops/${shop.id}`);
}

async function deleteShop(shop) {
  try {
    await ElMessageBox.confirm(
      `确认删除店铺“${shop.name}”？删除后不可恢复。`,
      '删除店铺',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    );
    await request.delete(`/api/shops/${shop.id}`);
    ElMessage.success('删除成功');
    await loadShops();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.error || '删除店铺失败');
    }
  }
}

function formatOnboardingSource(source) {
  if (source === 'invite') return '邀请链接';
  if (source === 'manual') return '管理端手动创建';
  return source || '-';
}

function formatOnboardingType(inviteType) {
  if (inviteType === 'merchant') return '商户邀请';
  if (inviteType === 'rider') return '骑手邀请';
  return inviteType || '-';
}
</script>

<style scoped>
.merchant-profile-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
}

.page-subtitle {
  margin-top: 6px;
  color: #909399;
  font-size: 13px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.panel {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.upload-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.license-image {
  width: 220px;
  height: 132px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-header-actions {
  display: flex;
  gap: 8px;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
}

.shop-base {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shop-logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid #ebeef5;
}

.shop-logo.placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f2f6fc;
  color: #909399;
  font-size: 10px;
}

.shop-name {
  font-weight: 600;
}

.rating {
  color: #e6a23c;
}
</style>
