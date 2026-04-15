<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h2>骑手等级配置</h2>
        <p>统一维护骑手等级名称、图标、升级提示与阈值说明，骑手端与后台榜单保持一套口径。</p>
      </div>
      <div class="page-actions">
        <el-button size="small" :loading="loading" @click="loadSettings(true)">刷新</el-button>
        <el-button type="primary" :loading="saving" @click="saveSettings">保存配置</el-button>
      </div>
    </div>

    <PageStateAlert :message="loadError" />

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>
            <div class="card-title-row">
              <span>等级列表</span>
              <span class="card-tip">本期固定 6 档，`level` 和 `key` 作为稳定识别值。</span>
            </div>
          </template>

          <div v-loading="loading">
            <div v-for="level in sortedLevels" :key="level.level" class="level-card">
              <div class="level-card-header">
                <div class="level-heading">
                  <span class="level-badge">Lv.{{ level.level }}</span>
                  <strong>{{ level.name }}</strong>
                  <span class="level-key">{{ level.key }}</span>
                </div>
              </div>

              <el-row :gutter="12">
                <el-col :span="6">
                  <el-form-item label="名称">
                    <el-input v-model="level.name" />
                  </el-form-item>
                </el-col>
                <el-col :span="4">
                  <el-form-item label="图标">
                    <el-input v-model="level.icon" />
                  </el-form-item>
                </el-col>
                <el-col :span="14">
                  <el-form-item label="简介">
                    <el-input v-model="level.desc" />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="进度模板">
                <el-input v-model="level.progress_template" />
              </el-form-item>

              <el-form-item label="阈值规则">
                <el-select v-model="level.threshold_rules" multiple filterable allow-create default-first-option collapse-tags style="width: 100%;">
                  <el-option v-for="rule in level.threshold_rules" :key="rule" :label="rule" :value="rule" />
                </el-select>
              </el-form-item>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <div class="card-title-row">
              <span>展示预览</span>
              <span class="card-tip">这里的名称与图标会同步给骑手个人页与等级页。</span>
            </div>
          </template>

          <div class="preview-list">
            <div v-for="level in sortedLevels" :key="level.level" class="preview-item">
              <div class="preview-icon">{{ level.icon || '🏍' }}</div>
              <div class="preview-content">
                <strong>{{ level.name }}</strong>
                <span>{{ level.desc }}</span>
                <small>{{ level.progress_template }}</small>
              </div>
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
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const form = reactive({
  levels: []
})

function createLevel(source = {}) {
  return {
    level: Number(source.level || 0),
    key: String(source.key || '').trim(),
    name: String(source.name || '').trim(),
    icon: String(source.icon || '').trim(),
    desc: String(source.desc || '').trim(),
    progress_template: String(source.progress_template || '').trim(),
    threshold_rules: Array.isArray(source.threshold_rules)
      ? source.threshold_rules.map((item) => String(item || '').trim()).filter(Boolean)
      : []
  }
}

function normalizePayload(payload = {}) {
  return {
    levels: (Array.isArray(payload.levels) ? payload.levels : []).map(createLevel)
  }
}

const sortedLevels = computed(() =>
  [...form.levels].sort((left, right) => Number(left.level || 0) - Number(right.level || 0))
)

async function loadSettings(forceRefresh = false) {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await request.get('/api/rider-rank-settings', {
      params: forceRefresh ? { _t: Date.now() } : undefined
    })
    Object.assign(form, normalizePayload(extractEnvelopeData(data) || {}))
  } catch (error) {
    loadError.value = extractErrorMessage(error, '加载骑手等级配置失败')
  } finally {
    loading.value = false
  }
}

function validateLevels() {
  if (!form.levels.length) return '骑手等级配置不能为空'
  for (const item of form.levels) {
    if (!item.level || !item.key || !item.name) {
      return '骑手等级存在未填写的 level、key 或 name'
    }
  }
  return ''
}

async function saveSettings() {
  const validationMessage = validateLevels()
  if (validationMessage) {
    ElMessage.warning(validationMessage)
    return
  }
  try {
    await ElMessageBox.confirm('保存后骑手端等级名称、图标和进度文案会同步更新，确认继续吗？', '确认保存', {
      type: 'warning'
    })
  } catch (_error) {
    return
  }

  saving.value = true
  try {
    const payload = {
      levels: form.levels.map(createLevel)
    }
    const { data } = await request.post('/api/rider-rank-settings', payload)
    Object.assign(form, normalizePayload(extractEnvelopeData(data) || payload))
    ElMessage.success('骑手等级配置已保存')
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '保存骑手等级配置失败'))
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
.card-tip,
.level-key {
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
  gap: 12px;
  align-items: center;
}

.level-card {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
}

.level-card:last-child {
  margin-bottom: 0;
}

.level-card-header {
  margin-bottom: 12px;
}

.level-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.level-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 12px;
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
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
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
