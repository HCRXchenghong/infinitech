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
              <strong>{{ form.hero_title }}</strong>
              <p>{{ form.hero_desc }}</p>
            </div>
            <div class="preview-list">
              <div v-for="service in enabledServices" :key="service.key" class="preview-item">
                <div class="preview-icon" :style="{ background: service.color || '#e5e7eb' }">
                  {{ service.icon || '·' }}
                </div>
                <div class="preview-content">
                  <strong>{{ service.label }}</strong>
                  <span>{{ service.desc }}</span>
                  <small>{{ service.service_fee_hint }}</small>
                </div>
              </div>
            </div>
            <el-empty v-if="!enabledServices.length" description="当前没有启用中的跑腿服务" />
          </div>
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
  page_title: '',
  hero_title: '',
  hero_desc: '',
  detail_tip: '',
  services: []
})

function createService(source = {}) {
  return {
    key: String(source.key || '').trim(),
    label: String(source.label || '').trim(),
    desc: String(source.desc || '').trim(),
    icon: String(source.icon || '').trim(),
    color: String(source.color || '').trim(),
    enabled: source.enabled !== false,
    sort_order: Number(source.sort_order || 0),
    route: String(source.route || '').trim(),
    service_fee_hint: String(source.service_fee_hint || '').trim()
  }
}

function normalizePayload(payload = {}) {
  return {
    page_title: String(payload.page_title || '').trim(),
    hero_title: String(payload.hero_title || '').trim(),
    hero_desc: String(payload.hero_desc || '').trim(),
    detail_tip: String(payload.detail_tip || '').trim(),
    services: (Array.isArray(payload.services) ? payload.services : []).map(createService)
  }
}

const sortedServices = computed(() =>
  [...form.services].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
)

const enabledServices = computed(() => sortedServices.value.filter((item) => item.enabled))

async function loadSettings(forceRefresh = false) {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await request.get('/api/errand-settings', {
      params: forceRefresh ? { _t: Date.now() } : undefined
    })
    Object.assign(form, normalizePayload(data || {}))
  } catch (error) {
    loadError.value = error?.response?.data?.error || error?.message || '加载跑腿配置失败'
  } finally {
    loading.value = false
  }
}

function validateServices() {
  if (!form.hero_title) return '跑腿主标题不能为空'
  if (!form.services.length) return '至少需要保留一个跑腿服务'
  for (const service of form.services) {
    if (!service.key || !service.label) return '跑腿服务 key 和名称不能为空'
  }
  return ''
}

async function saveSettings() {
  const message = validateServices()
  if (message) {
    ElMessage.warning(message)
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
    const payload = {
      page_title: form.page_title,
      hero_title: form.hero_title,
      hero_desc: form.hero_desc,
      detail_tip: form.detail_tip,
      services: form.services.map((item) => ({ ...item }))
    }
    const { data } = await request.post('/api/errand-settings', payload)
    Object.assign(form, normalizePayload(data?.data || payload))
    ElMessage.success('跑腿配置已保存')
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || error?.message || '保存跑腿配置失败')
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
