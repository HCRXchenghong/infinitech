<template>
  <el-card class="management-panel-card">
    <template #header>
      <div class="management-account-toolbar">
        <div class="management-panel-title">管理员账号列表</div>
        <el-input
          :model-value="keyword"
          class="management-search"
          size="small"
          clearable
          placeholder="按姓名或手机号搜索"
          @update:model-value="emit('update:keyword', $event)"
        />
      </div>
    </template>

    <el-table
      :data="filteredAdmins"
      size="small"
      stripe
      v-loading="loadingAdmins"
      style="width: 100%;"
    >
      <el-table-column type="index" label="#" width="60" />
      <el-table-column prop="phone" label="手机号" min-width="140" />
      <el-table-column prop="name" label="姓名" min-width="120" />
      <el-table-column label="角色" width="140">
        <template #default="{ row }">
          <el-tag :type="roleTagType(row.type)">{{ roleLabel(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" min-width="170">
        <template #default="{ row }">
          {{ formatTime(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250">
        <template #default="{ row }">
          <div class="management-table-actions">
            <el-button size="small" @click="showEditAdminDialog(row)">编辑</el-button>
            <el-button size="small" type="warning" @click="handleResetPassword(row)">重置密码</el-button>
            <el-button size="small" type="danger" @click="handleDeleteAdmin(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
          :description="adminsError ? '加载失败，暂无可显示数据' : '暂无管理员账号'"
          :image-size="90"
        />
      </template>
    </el-table>
  </el-card>
</template>

<script setup>
defineProps({
  keyword: {
    type: String,
    default: '',
  },
  filteredAdmins: {
    type: Array,
    default: () => [],
  },
  loadingAdmins: {
    type: Boolean,
    default: false,
  },
  adminsError: {
    type: String,
    default: '',
  },
  roleLabel: {
    type: Function,
    required: true,
  },
  roleTagType: {
    type: Function,
    required: true,
  },
  formatTime: {
    type: Function,
    required: true,
  },
  showEditAdminDialog: {
    type: Function,
    required: true,
  },
  handleResetPassword: {
    type: Function,
    required: true,
  },
  handleDeleteAdmin: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:keyword']);
</script>
