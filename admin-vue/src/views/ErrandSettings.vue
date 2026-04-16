<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h2>跑腿配置</h2>
        <p>统一维护跑腿首页标题、四张服务卡片、详情提示与服务费说明。</p>
      </div>
      <div class="page-actions">
        <el-button size="small" :loading="loading" @click="loadSettings(true)">刷新</el-button>
        <el-button type="primary" :loading="saving" @click="saveSettings">保存配置</el-button>
      </div>
    </div>

    <PageStateAlert :message="loadError" />

    <el-row :gutter="16">
      <el-col :span="14">
        <el-card shadow="never">
          <template #header>
            <div class="card-title-row">
              <span>页面文案</span>
              <span class="card-tip">用户端与 App 跑腿首页、详情页统一读取这一份配置。</span>
            </div>
          </template>

          <el-form label-width="100px">
            <el-form-item label="页面标题">
              <el-input v-model="form.page_title" />
            </el-form-item>
            <el-form-item label="主标题">
              <el-input v-model="form.hero_title" />
            </el-form-item>
            <el-form-item label="副标题">
              <el-input v-model="form.hero_desc" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="详情提示">
              <el-input v-model="form.detail_tip" type="textarea" :rows="3" />
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never" style="margin-top: 16px;">
          <template #header>
            <div class="card-title-row">
              <span>服务卡片</span>
              <span class="card-tip">一期固定四项：买、送、取、办。</span>
            </div>
          </template>

          <div v-loading="loading">
            <div v-for="service in sortedServices" :key="service.key" class="service-card">
              <div class="service-header">
                <strong>{{ service.label || service.key }}</strong>
                <el-tag size="small">{{ service.key }}</el-tag>
              </div>
              <el-row :gutter="12">
                <el-col :span="6">
                  <el-form-item label="名称">
                    <el-input v-model="service.label" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="图标">
                    <el-input v-model="service.icon" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="颜色">
                    <el-input v-model="service.color" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="排序">
                    <el-input-number v-model="service.sort_order" :min="0" :step="10" style="width: 100%;" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="12">
                <el-col :span="12">
                  <el-form-item label="说明">
                    <el-input v-model="service.desc" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="页面路由">
                    <el-input v-model="service.route" placeholder="/pages/errand/buy/index" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="12">
                <el-col :span="18">
                  <el-form-item label="服务费提示">
                    <el-input v-model="service.service_fee_hint" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="启用">
                    <el-switch v-model="service.enabled" />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card shadow="never">
          <template #header>
            <div class="card-title-row">
              <span>页面预览</span>
              <span class="card-tip">启停与排序以右侧预览效果实时回显。</span>
            </div>
          </template>

          <div class="preview-shell">
            <div class="hero-card">
              <strong>{{ preview.heroTitle }}</strong>
              <p>{{ preview.heroDesc }}</p>
            </div>
            <div class="preview-list">
              <div v-for="service in preview.services" :key="service.key" class="preview-item">
                <div class="preview-icon" :style="{ background: service.color || '#e5e7eb' }">
                  {{ service.icon || '·' }}
                </div>
                <div class="preview-content">
                  <strong>{{ service.name }}</strong>
                  <span>{{ service.desc }}</span>
                  <small>{{ service.serviceFeeHint }}</small>
                </div>
              </div>
            </div>
            <el-empty v-if="!preview.services.length" description="当前没有启用中的跑腿服务" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts'
import {
  buildErrandSettingsPayload,
  createDefaultErrandSettings,
  getEnabledErrandServices,
  getSortedErrandServices,
  normalizeErrandSettings,
  validateErrandSettings,
} from '@infinitech/domain-core'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const form = reactive(createDefaultErrandSettings())

const sortedServices = computed(() => getSortedErrandServices(form.services))
const preview = computed(() => ({
  heroTitle: form.hero_title,
  heroDesc: form.hero_desc,
  services: getEnabledErrandServices(form.services).map((item) => ({
    ...item,
    name: item.label,
    serviceFeeHint: item.service_fee_hint
  }))
}))

async function loadSettings(forceRefresh = false) {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await request.get('/api/errand-settings', {
      params: forceRefresh ? { _t: Date.now() } : undefined
    })
    Object.assign(form, normalizeErrandSettings(extractEnvelopeData(data) || {}))
  } catch (error) {
    loadError.value = extractErrorMessage(error, '加载跑腿配置失败')
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  const validation = validateErrandSettings(form)
  if (!validation.valid) {
    ElMessage.warning(validation.message)
    return
  }
  try {
    await ElMessageBox.confirm('保存后跑腿首页与详情提示会立即变更，确认提交吗？', '确认保存', {
      type: 'warning'
    })
  } catch (_error) {
    return
  }

  saving.value = true
  try {
    const payload = buildErrandSettingsPayload(form)
    const { data } = await request.post('/api/errand-settings', payload)
    Object.assign(form, normalizeErrandSettings(extractEnvelopeData(data) || payload))
    ElMessage.success('跑腿配置已保存')
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '保存跑腿配置失败'))
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.service-card {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  margin-bottom: 16px;
}

.service-card:last-child {
  margin-bottom: 0;
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.preview-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hero-card {
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #009bf5 0%, #4ec5ff 100%);
  color: #fff;
}

.hero-card p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.9);
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
}

.preview-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-content span,
.preview-content small {
  color: #6b7280;
}
</style>
