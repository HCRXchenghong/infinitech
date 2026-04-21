<template>
  <el-card shadow="never">
    <template #header>
      <div class="home-entry-settings-card-title">
        <span>入口列表</span>
        <span class="home-entry-settings-card-tip">
          支持新增自定义 page / external 入口，排序按 `sort_order` 生效。
        </span>
      </div>
    </template>

    <div v-loading="loading">
      <el-empty v-if="!entries.length && !loading" description="暂无首页入口配置" />

      <HomeEntrySettingsEntryCard
        v-for="(entry, index) in entries"
        :key="entry.localKey"
        :entry="entry"
        :index="index"
        :move-entry="moveEntry"
        :remove-entry="removeEntry"
        :route-placeholder="routePlaceholder"
        :total="entries.length"
      />
    </div>
  </el-card>
</template>

<script setup>
import HomeEntrySettingsEntryCard from './HomeEntrySettingsEntryCard.vue';

defineProps({
  entries: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
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
});
</script>
