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
        <el-button size="small" type="primary" @click="loadCampaigns">查询</el-button>
      </div>

      <el-table :data="campaigns" size="small" stripe v-loading="loading">
        <el-table-column prop="objectType" label="对象类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.objectType === 'shop' ? 'success' : 'warning'">
              {{ row.objectType === 'shop' ? '商户' : '商品' }}
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
            <el-tag size="small" :type="row.isPositionLocked ? 'danger' : 'info'">
              {{ row.isPositionLocked ? '是' : '否' }}
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
                {{ row.isPromoted ? row.promoteLabel || '推广' : '-' }}
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
                {{ row.isPromoted ? row.promoteLabel || '推广' : '-' }}
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

const filters = reactive({
  objectType: '',
  status: '',
  city: '',
  businessCategory: '',
})

const form = reactive(createEmptyForm())

const dialogTitle = computed(() => {
  if (editingId.value) return '编辑首页推广计划'
  if (form.isPositionLocked) return '锁定位次'
  return '新建首页推广计划'
})

const targetOptions = computed(() => {
  const current = form.objectType === 'product' ? products.value : shops.value
  return current.map((item) => ({
    id: String(item.id || ''),
    name: item.name || `ID ${item.id || '-'}`,
  }))
})

function createEmptyForm() {
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  return {
    objectType: 'shop',
    targetId: '',
    slotPosition: 1,
    city: '',
    businessCategory: '',
    status: 'draft',
    isPositionLocked: false,
    promoteLabel: '推广',
    contractNo: '',
    serviceRecordNo: '',
    remark: '',
    startAt: formatDateTime(now),
    endAt: formatDateTime(nextWeek),
  }
}

function formatDateTime(date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  const seconds = `${date.getSeconds()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function extractList(payload, field) {
  if (Array.isArray(payload?.[field])) return payload[field]
  if (Array.isArray(payload?.data?.[field])) return payload.data[field]
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload)) return payload
  return []
}

function assignForm(values) {
  Object.assign(form, createEmptyForm(), values)
}

function openDialog(row = null, locked = false) {
  editingId.value = row?.id || ''
  assignForm({
    objectType: row?.objectType || 'shop',
    targetId: row?.targetId || '',
    slotPosition: Number(row?.slotPosition || 1),
    city: row?.city || '',
    businessCategory: row?.businessCategory || '',
    status: row?.status || (locked ? 'approved' : 'draft'),
    isPositionLocked: Boolean(row?.isPositionLocked || locked),
    promoteLabel: row?.promoteLabel || '推广',
    contractNo: row?.contractNo || '',
    serviceRecordNo: row?.serviceRecordNo || '',
    remark: row?.remark || '',
    startAt: row?.startAt ? formatDateTime(new Date(row.startAt)) : createEmptyForm().startAt,
    endAt: row?.endAt ? formatDateTime(new Date(row.endAt)) : createEmptyForm().endAt,
  })
  dialogVisible.value = true
}

function handleObjectTypeChange() {
  form.targetId = ''
}

function statusTagType(status) {
  switch (status) {
    case 'active':
      return 'success'
    case 'approved':
    case 'scheduled':
      return 'primary'
    case 'paused':
      return 'warning'
    case 'rejected':
    case 'ended':
      return 'info'
    default:
      return ''
  }
}

function positionSourceTagType(source) {
  switch (source) {
    case 'manual_locked':
      return 'danger'
    case 'paid_campaign':
      return 'warning'
    case 'featured':
      return 'success'
    default:
      return 'info'
  }
}

function formatStatus(status) {
  const map = {
    draft: '草稿',
    approved: '已审核',
    active: '投放中',
    scheduled: '已排期',
    paused: '已暂停',
    rejected: '已驳回',
    ended: '已结束',
  }
  return map[status] || status || '-'
}

function formatPositionSource(source) {
  const map = {
    featured: '推荐位',
    organic: '自然排序',
    paid_campaign: '付费计划',
    manual_locked: '手工锁位',
  }
  return map[source] || source || '-'
}

function canAction(row, action) {
  const status = row?.effectiveStatus || row?.status
  if (action === 'approve') return status === 'draft' || status === 'rejected'
  if (action === 'reject') return status === 'draft' || status === 'approved' || status === 'scheduled'
  if (action === 'pause') return status === 'approved' || status === 'active' || status === 'scheduled'
  if (action === 'resume') return status === 'paused'
  return false
}

async function loadTargets() {
  const [shopsRes, productsRes] = await Promise.all([
    request.get('/api/shops'),
    request.get('/api/products'),
  ])
  shops.value = extractList(shopsRes.data, 'shops')
  products.value = extractList(productsRes.data, 'products')
}

async function loadCampaigns() {
  const { data } = await request.get('/api/home-campaigns', { params: { ...filters } })
  campaigns.value = Array.isArray(data?.campaigns) ? data.campaigns : []
}

async function loadSlots() {
  const { data } = await request.get('/api/home-slots', {
    params: {
      city: filters.city || '',
      businessCategory: filters.businessCategory || '',
    },
  })
  slotProducts.value = Array.isArray(data?.products) ? data.products : []
  slotShops.value = Array.isArray(data?.shops) ? data.shops : []
}

async function loadAll() {
  loading.value = true
  pageError.value = ''
  try {
    await Promise.all([loadCampaigns(), loadSlots(), loadTargets()])
  } catch (error) {
    pageError.value =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      '加载首页推广数据失败'
  } finally {
    loading.value = false
  }
}

function buildPayload() {
  return {
    objectType: form.objectType,
    targetId: form.targetId,
    slotPosition: Number(form.slotPosition || 0),
    city: form.city,
    businessCategory: form.businessCategory,
    status: form.status,
    isPositionLocked: Boolean(form.isPositionLocked),
    promoteLabel: form.promoteLabel,
    contractNo: form.contractNo,
    serviceRecordNo: form.serviceRecordNo,
    remark: form.remark,
    startAt: form.startAt,
    endAt: form.endAt,
  }
}

function validateForm() {
  if (!form.objectType) return '请选择对象类型'
  if (!form.targetId) return '请选择投放对象'
  if (!form.slotPosition || Number(form.slotPosition) <= 0) return '目标位次必须大于 0'
  if (!form.startAt || !form.endAt) return '请选择投放时间范围'
  return ''
}

async function submitForm() {
  const validationError = validateForm()
  if (validationError) {
    ElMessage.error(validationError)
    return
  }

  submitting.value = true
  try {
    const payload = buildPayload()
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
    ElMessage.error(
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      '保存首页推广计划失败',
    )
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
    ElMessage.error(
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      '状态更新失败',
    )
  }
}

onMounted(() => {
  void loadAll()
})
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
