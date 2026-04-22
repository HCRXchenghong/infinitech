<template>
  <el-dialog
    :model-value="visible"
    :title="editingApi ? '编辑 API Key 权限' : '新建 API Key 权限'"
    :width="isMobile ? '94%' : '720px'"
    :close-on-click-modal="false"
    @update:model-value="setApiDialogVisible"
  >
    <el-form :model="apiForm" label-width="120px" size="small">
      <el-form-item label="调用方名称" required>
        <el-input v-model="apiForm.name" placeholder="如：合作伙伴官网 / BI 报表服务" />
        <div class="form-tip">用于区分不同的调用方或不同用途的 Key。</div>
      </el-form-item>
      <el-form-item label="主要 API URL / 路径">
        <el-input
          v-model="apiForm.path"
          placeholder="如：/api/public/orders 或 /api/v1/query"
        />
        <div class="form-tip">记录该 Key 主要使用的接口入口，便于后续排查与审计。</div>
      </el-form-item>
      <el-form-item label="权限分配" required>
        <el-checkbox-group v-model="apiForm.permissions" @change="handleApiPermissionChange">
          <el-checkbox
            v-for="permission in permissionOptions"
            :key="permission.value"
            :label="permission.value"
          >
            {{ permission.label }}
          </el-checkbox>
        </el-checkbox-group>
        <div class="form-tip">勾选后系统会按权限校验该 Key 能访问的公开接口。</div>
      </el-form-item>
      <el-form-item label="API Key" required>
        <el-input v-model="apiForm.api_key" readonly placeholder="点击生成新的 API Key">
          <template #append>
            <el-button @click="generateApiKey">生成</el-button>
          </template>
        </el-input>
        <div class="form-tip">API Key 相当于访问凭证，建议一个调用方分配一个独立 Key。</div>
      </el-form-item>
      <el-form-item label="用途说明">
        <el-input
          v-model="apiForm.description"
          type="textarea"
          :rows="3"
          placeholder="补充说明这个 Key 的业务用途、调用频率或责任人"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-switch v-model="apiForm.is_active" />
        <span class="switch-text">{{ apiForm.is_active ? '启用' : '禁用' }}</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="setApiDialogVisible(false)">取消</el-button>
      <el-button type="primary" :loading="savingApi" @click="saveApi">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  apiForm: {
    type: Object,
    required: true,
  },
  editingApi: {
    type: [Object, Boolean, String],
    default: null,
  },
  generateApiKey: {
    type: Function,
    required: true,
  },
  handleApiPermissionChange: {
    type: Function,
    required: true,
  },
  isMobile: {
    type: Boolean,
    default: false,
  },
  permissionOptions: {
    type: Array,
    default: () => [],
  },
  saveApi: {
    type: Function,
    required: true,
  },
  savingApi: {
    type: Boolean,
    default: false,
  },
  setApiDialogVisible: {
    type: Function,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>
