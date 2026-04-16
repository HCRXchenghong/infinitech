<template>
  <div class="page home-campaigns-page">
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">首页推广</div>
        <div class="panel-actions">
          <el-button size="small" @click="loadAll" :loading="loading">刷新</el-button>
          <el-button size="small" @click="openDialog(null, true)">锁定位次</el-button>
          <el-button type="primary" size="small" @click="openDialog()">新建推广计划</el-button>
        </div>
      </div>

      <PageStateAlert :message="pageError" />

      <div class="filters">
        <el-select
          v-model="filters.objectType"
          clearable
          placeholder="对象类型"
          size="small"
          style="width: 140px"
        >
          <el-option label="商户" value="shop" />
          <el-option label="商品" value="product" />
        </el-select>
        <el-select
          v-model="filters.status"
          clearable
          placeholder="投放状态"
          size="small"
          style="width: 140px"
        >
          <el-option label="草稿" value="draft" />
          <el-option label="已审核" value="approved" />
          <el-option label="投放中" value="active" />
          <el-option label="已排期" value="scheduled" />
          <el-option label="已暂停" value="paused" />
          <el-option label="已驳回" value="rejected" />
          <el-option label="已结束" value="ended" />
        </el-select>
        <el-input v-model.trim="filters.city" clearable size="small" placeholder="城市" style="width: 160px" />
        <el-input
          v-model.trim="filters.businessCategory"
          clearable
          size="small"
          placeholder="业务分类"
          style="width: 160px"
        />
        <el-button size="small" type="primary" @click="handleFilterQuery">查询</el-button>
      </div>

      <el-table :data="campaigns" size="small" stripe v-loading="loading">
        <el-table-column prop="objectType" label="对象类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="objectTypeTagType(row.objectType)">
              {{ objectTypeLabel(row.objectType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetName" label="投放对象" min-width="180" />
        <el-table-column prop="slotPosition" label="目标位次" width="100" align="center" />
        <el-table-column prop="city" label="城市" width="120">
          <template #default="{ row }">
            {{ row.city || '全局' }}
          </template>
        </el-table-column>
        <el-table-column prop="businessCategory" label="业务分类" width="140">
          <template #default="{ row }">
            {{ row.businessCategory || '全部' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.effectiveStatus || row.status)">
              {{ formatStatus(row.effectiveStatus || row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="锁位" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="lockTagType(row.isPositionLocked)">
              {{ lockLabel(row.isPositionLocked) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="promoteLabel" label="前台标识" width="120" />
        <el-table-column prop="startAt" label="开始时间" width="170" />
        <el-table-column prop="endAt" label="结束时间" width="170" />
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDialog(row)">编辑</el-button>
            <el-button
              v-if="canAction(row, 'approve')"
              type="success"
              link
              size="small"
              @click="changeStatus(row, 'approve')"
            >
              审核
            </el-button>
            <el-button
              v-if="canAction(row, 'reject')"
              type="danger"
              link
              size="small"
              @click="changeStatus(row, 'reject')"
            >
              驳回
            </el-button>
            <el-button
              v-if="canAction(row, 'pause')"
              type="warning"
              link
              size="small"
              @click="changeStatus(row, 'pause')"
            >
              暂停
            </el-button>
            <el-button
              v-if="canAction(row, 'resume')"
              type="primary"
              link
              size="small"
              @click="changeStatus(row, 'resume')"
            >
              恢复
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="pageError ? '加载失败，暂无可显示数据' : '暂无首页推广计划'" :image-size="90" />
        </template>
      </el-table>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">当前生效位次</div>
      </div>

      <div class="preview-grid">
        <div class="preview-block">
          <div class="preview-title">商品区</div>
          <el-table :data="slotProducts" size="small" stripe>
            <el-table-column label="位次" width="80" align="center">
              <template #default="{ $index }">
                <el-tag size="small">{{ $index + 1 }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="名称" min-width="160" />
            <el-table-column label="来源" width="120">
              <template #default="{ row }">
                <el-tag size="small" :type="positionSourceTagType(row.positionSource)">
                  {{ formatPositionSource(row.positionSource) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="前台标识" width="120">
              <template #default="{ row }">
                {{ promoteLabel(row) }}
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="preview-block">
          <div class="preview-title">商户区</div>
          <el-table :data="slotShops" size="small" stripe>
            <el-table-column label="位次" width="80" align="center">
              <template #default="{ $index }">
                <el-tag size="small">{{ $index + 1 }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="名称" min-width="160" />
            <el-table-column label="来源" width="120">
              <template #default="{ row }">
                <el-tag size="small" :type="positionSourceTagType(row.positionSource)">
                  {{ formatPositionSource(row.positionSource) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="前台标识" width="120">
              <template #default="{ row }">
                {{ promoteLabel(row) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="760px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="对象类型">
              <el-select v-model="form.objectType" style="width: 100%" @change="handleObjectTypeChange">
                <el-option label="商户" value="shop" />
                <el-option label="商品" value="product" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="目标位次">
              <el-input-number v-model="form.slotPosition" :min="1" :max="99" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="投放对象">
          <el-select
            v-model="form.targetId"
            filterable
            clearable
            style="width: 100%"
            placeholder="请选择投放对象"
          >
            <el-option
              v-for="item in targetOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="城市">
              <el-input v-model.trim="form.city" placeholder="留空表示全局" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="业务分类">
              <el-input v-model.trim="form.businessCategory" placeholder="留空表示全部分类" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="投放状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="草稿" value="draft" />
                <el-option label="已审核" value="approved" />
                <el-option label="已暂停" value="paused" />
                <el-option label="已驳回" value="rejected" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="推广标识">
              <el-input v-model.trim="form.promoteLabel" placeholder="默认显示“推广”" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="form.startAt"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="form.endAt"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="合同编号">
              <el-input v-model.trim="form.contractNo" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客服记录号">
              <el-input v-model.trim="form.serviceRecordNo" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="锁定位次">
          <el-switch v-model="form.isPositionLocked" />
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model.trim="form.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { extractErrorMessage } from '@infinitech/contracts'
import {
  buildAdminHomeCampaignListQuery,
  buildAdminHomeCampaignPayload,
  buildAdminHomeSlotQuery,
  canAdminHomeCampaignPerformAction,
  createAdminHomeCampaignFilters,
  createAdminHomeCampaignForm,
  createAdminHomeCampaignTargetOptions,
  extractAdminHomeCampaignNamedList,
  extractAdminHomeCampaignPage,
  extractAdminHomeSlotCollections,
  getAdminHomeCampaignDialogTitle,
  getAdminHomeCampaignLockLabel,
  getAdminHomeCampaignLockTagType,
  getAdminHomeCampaignObjectTypeLabel,
  getAdminHomeCampaignObjectTypeTagType,
  getAdminHomeCampaignPositionSourceLabel,
  getAdminHomeCampaignPositionSourceTagType,
  getAdminHomeCampaignPromoteLabel,
  getAdminHomeCampaignStatusLabel,
  getAdminHomeCampaignStatusTagType,
  validateAdminHomeCampaignForm,
} from '@infinitech/admin-core'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref('')
const campaigns = ref([])
const slotProducts = ref([])
const slotShops = ref([])
const shops = ref([])
const products = ref([])
const pageError = ref('')

const filters = reactive(createAdminHomeCampaignFilters())
const form = reactive(createAdminHomeCampaignForm())

const dialogTitle = computed(() => {
  return getAdminHomeCampaignDialogTitle(editingId.value, form)
})

const targetOptions = computed(() => {
  const current = form.objectType === 'product' ? products.value : shops.value
  return createAdminHomeCampaignTargetOptions(current)
})

async function withPageLoad(task, fallback = '加载首页推广数据失败') {
  loading.value = true
  pageError.value = ''
  try {
    await task()
  } catch (error) {
    pageError.value = extractErrorMessage(error, fallback)
  } finally {
    loading.value = false
  }
}

async function refreshPlacementData() {
  await Promise.all([loadCampaigns(), loadSlots()])
}

function openDialog(row = null, locked = false) {
  editingId.value = row?.id || ''
  Object.assign(form, createAdminHomeCampaignForm(row || {}, { locked }))
  dialogVisible.value = true
}

function handleObjectTypeChange() {
  form.targetId = ''
}

async function loadTargets() {
  const [shopsRes, productsRes] = await Promise.all([
    request.get('/api/shops'),
    request.get('/api/products'),
  ])
  shops.value = extractAdminHomeCampaignNamedList(shopsRes.data, 'shops')
  products.value = extractAdminHomeCampaignNamedList(productsRes.data, 'products')
}

async function loadCampaigns() {
  const { data } = await request.get('/api/home-campaigns', {
    params: buildAdminHomeCampaignListQuery(filters),
  })
  campaigns.value = extractAdminHomeCampaignPage(data).items
}

async function loadSlots() {
  const { data } = await request.get('/api/home-slots', {
    params: buildAdminHomeSlotQuery(filters),
  })
  const slots = extractAdminHomeSlotCollections(data)
  slotProducts.value = slots.products
  slotShops.value = slots.shops
}

function handleFilterQuery() {
  void withPageLoad(refreshPlacementData)
}

async function loadAll() {
  await withPageLoad(async () => {
    await Promise.all([refreshPlacementData(), loadTargets()])
  })
}

async function submitForm() {
  const validationError = validateAdminHomeCampaignForm(form)
  if (validationError) {
    ElMessage.error(validationError)
    return
  }

  submitting.value = true
  try {
    const payload = buildAdminHomeCampaignPayload(form)
    if (form.isPositionLocked) {
      await request.put('/api/home-slots', payload)
    } else if (editingId.value) {
      await request.put(`/api/home-campaigns/${encodeURIComponent(editingId.value)}`, payload)
    } else {
      await request.post('/api/home-campaigns', payload)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    await loadAll()
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '保存首页推广计划失败'))
  } finally {
    submitting.value = false
  }
}

async function changeStatus(row, action) {
  try {
    await request.post(`/api/home-campaigns/${encodeURIComponent(row.id)}/${action}`)
    ElMessage.success('状态更新成功')
    await loadAll()
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '状态更新失败'))
  }
}

onMounted(() => {
  void loadAll()
})

const objectTypeLabel = getAdminHomeCampaignObjectTypeLabel
const objectTypeTagType = getAdminHomeCampaignObjectTypeTagType
const statusTagType = getAdminHomeCampaignStatusTagType
const formatStatus = getAdminHomeCampaignStatusLabel
const positionSourceTagType = getAdminHomeCampaignPositionSourceTagType
const formatPositionSource = getAdminHomeCampaignPositionSourceLabel
const canAction = canAdminHomeCampaignPerformAction
const lockLabel = getAdminHomeCampaignLockLabel
const lockTagType = getAdminHomeCampaignLockTagType
const promoteLabel = getAdminHomeCampaignPromoteLabel
</script>

<style scoped>
.home-campaigns-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.preview-block {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
}

.preview-title {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 12px;
}

@media (max-width: 1100px) {
  .preview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
