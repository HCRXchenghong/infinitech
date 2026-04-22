<template>
  <el-card class="card management-card">
    <template #header>
      <div class="card-header">
        <span>Key 与权限分配</span>
        <el-tag size="small" type="info">主入口 + Key + 权限</el-tag>
      </div>
    </template>

    <div v-if="!isMobile" class="table-wrap">
      <el-table :data="apiList" stripe size="small" v-loading="apiListLoading">
        <el-table-column prop="name" label="调用方 / Key 名称" min-width="150" />
        <el-table-column label="主要 API URL / 路径" min-width="220">
          <template #default="{ row }">
            <code class="mono-text">{{ row.path || '未填写' }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="用途说明" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.description || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="权限分配" min-width="220">
          <template #default="{ row }">
            <div class="permission-tags">
              <el-tag
                v-for="perm in normalizePublicApiPermissionList(row.permissions)"
                :key="`${row.id}-${perm}`"
                size="small"
              >
                {{ getPermissionLabel(perm) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="API Key" min-width="240">
          <template #default="{ row }">
            <div class="key-cell">
              <code class="mono-text key-text">{{ row.api_key }}</code>
              <el-button link type="primary" @click="copyApiKey(row.api_key)">复制</el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button size="small" type="primary" @click="editApi(row)">编辑</el-button>
              <el-button size="small" @click="downloadKeyDoc(row)">下载说明</el-button>
              <el-button size="small" type="danger" @click="deleteApi(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            :description="apiListError ? '加载失败，暂无可显示数据' : '还没有配置任何 API Key'"
            :image-size="90"
          />
        </template>
      </el-table>
    </div>

    <div v-else class="mobile-list" v-loading="apiListLoading">
      <div v-if="apiList.length === 0" class="mobile-empty">
        <el-empty
          :description="apiListError ? '加载失败，暂无可显示数据' : '还没有配置任何 API Key'"
          :image-size="90"
        />
      </div>
      <div v-for="row in apiList" :key="row.id" class="mobile-card">
        <div class="mobile-card-header">
          <div>
            <div class="mobile-card-title">{{ row.name }}</div>
            <div class="mobile-card-subtitle">{{ row.path || '未填写主要 API URL / 路径' }}</div>
          </div>
          <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
            {{ row.is_active ? '启用' : '禁用' }}
          </el-tag>
        </div>
        <div class="mobile-card-body">
          <div class="mobile-label">用途说明</div>
          <div class="mobile-value">{{ row.description || '—' }}</div>
          <div class="mobile-label">权限分配</div>
          <div class="permission-tags">
            <el-tag
              v-for="perm in normalizePublicApiPermissionList(row.permissions)"
              :key="`${row.id}-${perm}`"
              size="small"
            >
              {{ getPermissionLabel(perm) }}
            </el-tag>
          </div>
          <div class="mobile-label">API Key</div>
          <div class="mobile-key-wrap">
            <code class="mono-text key-text">{{ row.api_key }}</code>
            <el-button size="small" @click="copyApiKey(row.api_key)">复制</el-button>
          </div>
        </div>
        <div class="mobile-card-actions">
          <el-button size="small" type="primary" @click="editApi(row)">编辑</el-button>
          <el-button size="small" @click="downloadKeyDoc(row)">下载说明</el-button>
          <el-button size="small" type="danger" @click="deleteApi(row)">删除</el-button>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  apiList: {
    type: Array,
    default: () => [],
  },
  apiListError: {
    type: String,
    default: '',
  },
  apiListLoading: {
    type: Boolean,
    default: false,
  },
  copyApiKey: {
    type: Function,
    required: true,
  },
  deleteApi: {
    type: Function,
    required: true,
  },
  downloadKeyDoc: {
    type: Function,
    required: true,
  },
  editApi: {
    type: Function,
    required: true,
  },
  getPermissionLabel: {
    type: Function,
    required: true,
  },
  isMobile: {
    type: Boolean,
    default: false,
  },
  normalizePublicApiPermissionList: {
    type: Function,
    required: true,
  },
});
</script>
