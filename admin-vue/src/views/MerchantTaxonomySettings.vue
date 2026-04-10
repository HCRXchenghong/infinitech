<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h2>商户业务字典</h2>
        <p>统一维护商户类型、业务分类、别名兼容与展示顺序，所有店铺编辑页共用这一份字典。</p>
      </div>
      <div class="page-actions">
        <el-button size="small" :loading="loading" @click="loadSettings(true)">刷新</el-button>
        <el-button type="primary" :loading="saving" @click="saveSettings">保存配置</el-button>
      </div>
    </div>

    <PageStateAlert :message="loadError" />

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-title-row">
              <span>商户类型</span>
              <span class="card-tip">内部 key 固定，展示 label 可调整。</span>
            </div>
          </template>
          <el-table :data="merchantTypes" size="small" v-loading="loading" border>
            <el-table-column prop="key" label="内部 key" width="120" />
            <el-table-column label="显示名称" min-width="160">
              <template #default="{ row }">
                <el-input v-model="row.label" />
              </template>
            </el-table-column>
            <el-table-column label="别名兼容" min-width="220">
              <template #default="{ row }">
                <el-select v-model="row.aliases" multiple filterable allow-create default-first-option collapse-tags style="width: 100%;">
                  <el-option v-for="alias in row.aliases" :key="alias" :label="alias" :value="alias" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="排序" width="110">
              <template #default="{ row }">
                <el-input-number v-model="row.sort_order" :min="0" :step="10" style="width: 100%;" />
              </template>
            </el-table-column>
            <el-table-column label="启用" width="90">
              <template #default="{ row }">
                <el-switch v-model="row.enabled" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-title-row">
              <span>业务分类</span>
              <span class="card-tip">历史别名会在保存和读取时自动收敛到标准 key。</span>
            </div>
          </template>
          <el-table :data="businessCategories" size="small" v-loading="loading" border>
            <el-table-column prop="key" label="内部 key" width="180" />
            <el-table-column label="显示名称" min-width="140">
              <template #default="{ row }">
                <el-input v-model="row.label" />
              </template>
            </el-table-column>
            <el-table-column label="别名兼容" min-width="220">
              <template #default="{ row }">
                <el-select v-model="row.aliases" multiple filterable allow-create default-first-option collapse-tags style="width: 100%;">
                  <el-option v-for="alias in row.aliases" :key="alias" :label="alias" :value="alias" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="排序" width="110">
              <template #default="{ row }">
                <el-input-number v-model="row.sort_order" :min="0" :step="10" style="width: 100%;" />
              </template>
            </el-table-column>
            <el-table-column label="启用" width="90">
              <template #default="{ row }">
                <el-switch v-model="row.enabled" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const form = reactive({
  merchant_types: [],
  business_categories: []
})

function createOption(source = {}) {
  return {
    key: String(source.key || '').trim(),
    label: String(source.label || '').trim(),
    enabled: source.enabled !== false,
    sort_order: Number(source.sort_order || 0),
    aliases: Array.isArray(source.aliases) ? source.aliases.map((item) => String(item || '').trim()).filter(Boolean) : []
  }
}

function normalizePayload(payload = {}) {
  return {
    merchant_types: (Array.isArray(payload.merchant_types) ? payload.merchant_types : []).map(createOption),
    business_categories: (Array.isArray(payload.business_categories) ? payload.business_categories : []).map(createOption)
  }
}

const merchantTypes = computed(() =>
  [...form.merchant_types].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
)

const businessCategories = computed(() =>
  [...form.business_categories].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
)

async function loadSettings(forceRefresh = false) {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await request.get('/api/merchant-taxonomy-settings', {
      params: forceRefresh ? { _t: Date.now() } : undefined
    })
    Object.assign(form, normalizePayload(data || {}))
  } catch (error) {
    loadError.value = error?.response?.data?.error || error?.message || '加载商户业务字典失败'
  } finally {
    loading.value = false
  }
}

function validateOptions(items, label) {
  const seen = new Set()
  for (const item of items) {
    if (!item.key || !item.label) {
      return `${label}存在未填写的 key 或 label`
    }
    if (seen.has(item.key)) {
      return `${label}内部 key 重复：${item.key}`
    }
    seen.add(item.key)
  }
  return ''
}

async function saveSettings() {
  const validationMessage = validateOptions(form.merchant_types, '商户类型') || validateOptions(form.business_categories, '业务分类')
  if (validationMessage) {
    ElMessage.warning(validationMessage)
    return
  }
  try {
    await ElMessageBox.confirm('保存后商户端建店、店铺编辑和首页分类映射会同步使用新字典，确认继续吗？', '确认保存', {
      type: 'warning'
    })
  } catch (_error) {
    return
  }

  saving.value = true
  try {
    const payload = {
      merchant_types: form.merchant_types.map(createOption),
      business_categories: form.business_categories.map(createOption)
    }
    const { data } = await request.post('/api/merchant-taxonomy-settings', payload)
    Object.assign(form, normalizePayload(data?.data || payload))
    ElMessage.success('商户业务字典已保存')
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || error?.message || '保存商户业务字典失败')
  } finally {
    saving.value = false
  }
}

void loadSettings()
</script>

<style scoped>
.page-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
}

.page-header p,
.card-tip {
  margin: 0;
  color: #6b7280;
}

.page-actions {
  display: flex;
  gap: 8px;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
</style>
