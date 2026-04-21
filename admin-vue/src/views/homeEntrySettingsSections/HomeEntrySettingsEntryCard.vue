<template>
  <div class="home-entry-settings-entry-card">
    <div class="home-entry-settings-entry-header">
      <div>
        <strong>{{ entry.label || entry.key || `入口 ${index + 1}` }}</strong>
        <span class="home-entry-settings-entry-meta">{{ entry.key || '未设置 key' }}</span>
      </div>

      <div class="home-entry-settings-entry-actions">
        <el-tag size="small" :type="entry.enabled ? 'success' : 'info'">
          {{ entry.enabled ? '已启用' : '已停用' }}
        </el-tag>
        <el-button size="small" text :disabled="index === 0" @click="moveEntry(index, -1)">
          上移
        </el-button>
        <el-button
          size="small"
          text
          :disabled="index === total - 1"
          @click="moveEntry(index, 1)"
        >
          下移
        </el-button>
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
          <el-select v-model="entry.icon_type" style="width: 100%">
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
          <el-input-number v-model="entry.sort_order" :min="0" :step="10" style="width: 100%" />
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="12">
      <el-col :span="6">
        <el-form-item label="路由类型">
          <el-select v-model="entry.route_type" style="width: 100%">
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
          <el-select v-model="entry.client_scopes" multiple collapse-tags style="width: 100%">
            <el-option label="用户端" value="user-vue" />
            <el-option label="App" value="app-mobile" />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item label="城市范围">
      <el-select
        v-model="entry.city_scopes"
        multiple
        filterable
        allow-create
        default-first-option
        collapse-tags
        style="width: 100%"
      >
        <el-option
          v-for="city in entry.city_scopes"
          :key="city"
          :label="city"
          :value="city"
        />
      </el-select>
      <div class="home-entry-settings-form-tip">
        留空代表全城市通用，填写后按城市编码或城市名命中。
      </div>
    </el-form-item>
  </div>
</template>

<script setup>
defineProps({
  entry: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  moveEntry: {
    type: Function,
    required: true,
  },
  removeEntry: {
    type: Function,
    required: true,
  },
  routePlaceholder: {
    type: Function,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
});
</script>
