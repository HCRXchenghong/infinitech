<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h2>首页入口配置</h2>
        <p>统一维护用户端与 App 首页的平台入口、路由与展示状态。</p>
      </div>
      <div class="page-actions">
        <el-select v-model="previewClient" size="small" style="width: 150px;">
          <el-option label="用户端预览" value="user-vue" />
          <el-option label="App 预览" value="app-mobile" />
        </el-select>
        <el-button size="small" :loading="loading" @click="loadSettings(true)">刷新</el-button>
        <el-button size="small" @click="addEntry">新增入口</el-button>
        <el-button type="primary" :loading="saving" @click="saveSettings">保存配置</el-button>
      </div>
    </div>

    <PageStateAlert :message="loadError" />

    <el-row :gutter="16">
      <el-col :span="15">
        <el-card shadow="never">
          <template #header>
            <div class="card-title-row">
              <span>入口列表</span>
              <span class="card-tip">支持新增自定义 page / external 入口，排序按 `sort_order` 生效。</span>
            </div>
          </template>

          <div v-loading="loading">
            <el-empty v-if="!form.entries.length && !loading" description="暂无首页入口配置" />

            <div v-for="(entry, index) in form.entries" :key="entry.localKey" class="entry-card">
              <div class="entry-card-header">
                <div>
                  <strong>{{ entry.label || entry.key || `入口 ${index + 1}` }}</strong>
                  <span class="entry-meta">{{ entry.key || '未设置 key' }}</span>
                </div>
                <div class="entry-card-actions">
                  <el-tag size="small" :type="entry.enabled ? 'success' : 'info'">
                    {{ entry.enabled ? '已启用' : '已停用' }}
                  </el-tag>
                  <el-button size="small" text @click="moveEntry(index, -1)" :disabled="index === 0">上移</el-button>
                  <el-button size="small" text @click="moveEntry(index, 1)" :disabled="index === form.entries.length - 1">下移</el-button>
                  <el-button size="small" text type="danger" @click="removeEntry(index)">删除</el-button>
                </div>
              </div>

              <el-row :gutter="12">
                <el-col :span="8">
                  <el-form-item label="内部 key" required>
                    <el-input v-model="entry.key" placeholder="如：food 或 new-page" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="显示名称" required>
                    <el-input v-model="entry.label" placeholder="如：首页活动" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="徽标文案">
                    <el-input v-model="entry.badge_text" placeholder="如：HOT" />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="12">
                <el-col :span="6">
                  <el-form-item label="图标">
                    <el-input v-model="entry.icon" placeholder="emoji / 图片地址" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="图标类型">
                    <el-select v-model="entry.icon_type" style="width: 100%;">
                      <el-option label="Emoji" value="emoji" />
                      <el-option label="站内图片" value="image" />
                      <el-option label="外链图片" value="external" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="背景色">
                    <el-input v-model="entry.bg_color" placeholder="#F3F4F6" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="排序值">
                    <el-input-number v-model="entry.sort_order" :min="0" :step="10" style="width: 100%;" />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="12">
                <el-col :span="6">
                  <el-form-item label="路由类型">
                    <el-select v-model="entry.route_type" style="width: 100%;">
                      <el-option label="功能入口" value="feature" />
                      <el-option label="业务类目" value="category" />
                      <el-option label="页面路径" value="page" />
                      <el-option label="外链地址" value="external" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="10">
                  <el-form-item label="路由值">
                    <el-input v-model="entry.route_value" :placeholder="routePlaceholder(entry.route_type)" />
                  </el-form-item>
                </el-col>
                <el-col :span="4">
                  <el-form-item label="启用状态">
                    <el-switch v-model="entry.enabled" />
                  </el-form-item>
                </el-col>
                <el-col :span="4">
                  <el-form-item label="端范围">
                    <el-select v-model="entry.client_scopes" multiple collapse-tags style="width: 100%;">
                      <el-option label="用户端" value="user-vue" />
                      <el-option label="App" value="app-mobile" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="城市范围">
                <el-select v-model="entry.city_scopes" multiple filterable allow-create default-first-option collapse-tags style="width: 100%;">
                  <el-option v-for="city in entry.city_scopes" :key="city" :label="city" :value="city" />
                </el-select>
                <div class="form-tip">留空代表全城市通用，填写后按城市编码或城市名命中。</div>
              </el-form-item>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="9">
        <el-card shadow="never">
          <template #header>
            <div class="card-title-row">
              <span>预览</span>
              <span class="card-tip">{{ previewClient === 'user-vue' ? '用户端' : 'App' }}当前会看到的入口</span>
            </div>
          </template>

          <el-empty v-if="!previewEntries.length" description="当前预览端没有可展示入口" />
          <div v-else class="preview-grid">
            <div v-for="entry in previewEntries" :key="entry.localKey" class="preview-card" :style="{ background: entry.bg_color || '#f5f5f5' }">
              <div class="preview-icon">
                <img v-if="showImageIcon(entry)" :src="entry.icon" alt="" />
                <span v-else>{{ entry.icon || '✨' }}</span>
              </div>
              <div class="preview-text">
                <strong>{{ entry.label }}</strong>
                <span>{{ entry.route_type }} / {{ entry.route_value }}</span>
              </div>
              <el-tag v-if="entry.badge_text" size="small" type="danger">{{ entry.badge_text }}</el-tag>
            </div>
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
const previewClient = ref('user-vue')
const form = reactive({
  entries: []
})

function createEntry(source = {}) {
  return {
    localKey: `${source.key || 'entry'}-${Math.random().toString(36).slice(2, 10)}`,
    key: String(source.key || '').trim(),
    label: String(source.label || '').trim(),
    icon: String(source.icon || '✨').trim() || '✨',
    icon_type: String(source.icon_type || 'emoji').trim() || 'emoji',
    bg_color: String(source.bg_color || '#F3F4F6').trim() || '#F3F4F6',
    sort_order: Number(source.sort_order || 0),
    enabled: source.enabled !== false,
    city_scopes: Array.isArray(source.city_scopes) ? [...source.city_scopes] : [],
    client_scopes: Array.isArray(source.client_scopes) && source.client_scopes.length ? [...source.client_scopes] : ['user-vue', 'app-mobile'],
    route_type: String(source.route_type || 'page').trim() || 'page',
    route_value: String(source.route_value || '').trim(),
    badge_text: String(source.badge_text || '').trim()
  }
}

function routePlaceholder(routeType) {
  if (routeType === 'feature') return 'errand / medicine / dining_buddy / charity'
  if (routeType === 'category') return 'food / groupbuy / dessert_drinks ...'
  if (routeType === 'external') return 'https://example.com'
  return '/pages/activity/index'
}

function normalizePayload(payload = {}) {
  return {
    entries: (Array.isArray(payload.entries) ? payload.entries : []).map(createEntry)
  }
}

const previewEntries = computed(() =>
  form.entries
    .filter((entry) => entry.enabled)
    .filter((entry) => !entry.client_scopes.length || entry.client_scopes.includes(previewClient.value))
    .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
)

function showImageIcon(entry) {
  return entry.icon_type === 'image' || entry.icon_type === 'external'
}

async function loadSettings(forceRefresh = false) {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await request.get('/api/home-entry-settings', {
      params: forceRefresh ? { _t: Date.now() } : undefined
    })
    Object.assign(form, normalizePayload(data || {}))
  } catch (error) {
    form.entries = []
    loadError.value = error?.response?.data?.error || error?.message || '加载首页入口配置失败'
  } finally {
    loading.value = false
  }
}

function addEntry() {
  const maxSort = form.entries.reduce((result, item) => Math.max(result, Number(item.sort_order || 0)), 0)
  form.entries.push(createEntry({
    key: `custom_${form.entries.length + 1}`,
    label: '新入口',
    sort_order: maxSort + 10
  }))
}

function moveEntry(index, delta) {
  const target = index + delta
  if (target < 0 || target >= form.entries.length) return
  const current = form.entries[index]
  form.entries[index] = form.entries[target]
  form.entries[target] = current
}

async function removeEntry(index) {
  try {
    await ElMessageBox.confirm('删除后保存配置才会正式生效，是否继续？', '确认删除', {
      type: 'warning'
    })
  } catch (_error) {
    return
  }
  form.entries.splice(index, 1)
}

function validateEntries() {
  if (!form.entries.length) {
    return '至少保留一个首页入口'
  }
  const seen = new Set()
  for (const entry of form.entries) {
    if (!entry.key) return '首页入口 key 不能为空'
    if (seen.has(entry.key)) return `首页入口 key 重复：${entry.key}`
    seen.add(entry.key)
    if (!entry.label) return `入口 ${entry.key} 的显示名称不能为空`
    if (!entry.route_value) return `入口 ${entry.key} 的路由值不能为空`
  }
  return ''
}

async function saveSettings() {
  const validationMessage = validateEntries()
  if (validationMessage) {
    ElMessage.warning(validationMessage)
    return
  }

  try {
    await ElMessageBox.confirm('保存后首页入口会同时影响用户端与 App，确认提交吗？', '确认保存', {
      type: 'warning',
      confirmButtonText: '确认保存'
    })
  } catch (_error) {
    return
  }

  saving.value = true
  try {
    const payload = {
      entries: form.entries.map(({ localKey, ...entry }) => entry)
    }
    const { data } = await request.post('/api/home-entry-settings', payload)
    Object.assign(form, normalizePayload(data?.data || payload))
    ElMessage.success('首页入口配置已保存')
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || error?.message || '保存首页入口配置失败')
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

.page-header p {
  margin: 0;
  color: #6b7280;
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.card-tip,
.entry-meta,
.form-tip {
  color: #909399;
  font-size: 12px;
}

.entry-card {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
}

.entry-card:last-child {
  margin-bottom: 0;
}

.entry-card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.entry-card-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.preview-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.preview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
}

.preview-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  overflow: hidden;
}

.preview-icon img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.preview-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-text span {
  color: #4b5563;
  font-size: 12px;
}
</style>
