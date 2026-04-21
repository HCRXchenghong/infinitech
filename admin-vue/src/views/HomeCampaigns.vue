<template>
  <div class="page home-campaigns-page">
    <HomeCampaignsListPanel
      :loading="loading"
      :page-error="pageError"
      :filters="filters"
      :campaigns="campaigns"
      :load-all="loadAll"
      :open-dialog="openDialog"
      :handle-filter-query="handleFilterQuery"
      :object-type-tag-type="objectTypeTagType"
      :object-type-label="objectTypeLabel"
      :status-tag-type="statusTagType"
      :format-status="formatStatus"
      :lock-tag-type="lockTagType"
      :lock-label="lockLabel"
      :can-action="canAction"
      :change-status="changeStatus"
    />

    <HomeCampaignsPreviewPanel
      :slot-products="slotProducts"
      :slot-shops="slotShops"
      :position-source-tag-type="positionSourceTagType"
      :format-position-source="formatPositionSource"
      :promote-label="promoteLabel"
    />

    <HomeCampaignsDialog
      v-model:visible="dialogVisible"
      :dialog-title="dialogTitle"
      :form="form"
      :target-options="targetOptions"
      :submitting="submitting"
      :handle-object-type-change="handleObjectTypeChange"
      :submit-form="submitForm"
    />
  </div>
</template>

<script setup>
import './HomeCampaigns.css'
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
import HomeCampaignsDialog from './homeCampaignSections/HomeCampaignsDialog.vue'
import HomeCampaignsListPanel from './homeCampaignSections/HomeCampaignsListPanel.vue'
import HomeCampaignsPreviewPanel from './homeCampaignSections/HomeCampaignsPreviewPanel.vue'

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
