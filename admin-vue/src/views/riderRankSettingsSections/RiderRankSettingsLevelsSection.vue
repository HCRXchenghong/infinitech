<template>
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
          <el-select
            v-model="level.threshold_rules"
            multiple
            filterable
            allow-create
            default-first-option
            collapse-tags
            style="width: 100%;"
          >
            <el-option
              v-for="rule in level.threshold_rules"
              :key="rule"
              :label="rule"
              :value="rule"
            />
          </el-select>
        </el-form-item>
      </div>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  sortedLevels: {
    type: Array,
    default: () => [],
  },
});
</script>
