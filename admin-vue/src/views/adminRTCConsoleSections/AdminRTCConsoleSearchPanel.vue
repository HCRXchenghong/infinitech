<template>
  <el-card class="card search-card">
    <template #header>
      <div class="card-header">
        <span>站内联系人搜索</span>
        <el-button size="small" :loading="targetsLoading" @click="searchTargets">搜索</el-button>
      </div>
    </template>

    <div class="search-toolbar">
      <el-input
        v-model.trim="searchForm.keyword"
        clearable
        placeholder="姓名 / 手机号 / Chat ID / Legacy ID"
        @keyup.enter="searchTargets"
      />
      <el-select v-model="searchForm.role" clearable placeholder="角色筛选">
        <el-option label="全部角色" value="" />
        <el-option label="用户" value="user" />
        <el-option label="商户" value="merchant" />
        <el-option label="骑手" value="rider" />
      </el-select>
    </div>

    <PageStateAlert :message="targetsError" />

    <div class="search-results" v-loading="targetsLoading">
      <div v-if="filteredTargets.length === 0" class="empty-state">
        {{ searchForm.keyword ? '没有搜到可用的 RTC 联系人' : '输入关键词后可搜索用户 / 商户 / 骑手' }}
      </div>

      <button
        v-for="target in filteredTargets"
        :key="target.resultKey"
        type="button"
        class="target-item"
        :class="{ active: selectedTarget?.resultKey === target.resultKey }"
        @click="selectTarget(target)"
      >
        <div class="target-top">
          <div class="target-name">{{ target.name || target.phone || target.chatId || '未命名联系人' }}</div>
          <el-tag size="small" effect="light">{{ roleLabel(target.role) }}</el-tag>
        </div>
        <div class="target-meta">
          <span v-if="target.phone">{{ target.phone }}</span>
          <span v-if="target.legacyId">Legacy {{ target.legacyId }}</span>
          <span v-if="target.chatId">Chat {{ target.chatId }}</span>
        </div>
      </button>
    </div>
  </el-card>
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue'

defineProps({
  searchForm: {
    type: Object,
    required: true,
  },
  targetsLoading: {
    type: Boolean,
    default: false,
  },
  searchTargets: {
    type: Function,
    required: true,
  },
  targetsError: {
    type: String,
    default: '',
  },
  filteredTargets: {
    type: Array,
    default: () => [],
  },
  selectedTarget: {
    type: Object,
    default: () => null,
  },
  selectTarget: {
    type: Function,
    required: true,
  },
  roleLabel: {
    type: Function,
    required: true,
  },
})
</script>
