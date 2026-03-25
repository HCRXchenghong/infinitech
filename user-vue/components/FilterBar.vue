<template>
  <view class="filter-bar">
    <view
      v-for="filter in filters"
      :key="filter.key"
      class="filter-item"
      :class="{ active: activeFilter === filter.key }"
      @tap="handleFilter(filter.key)"
    >
      <text>{{ filter.label }}</text>
      <text v-if="filter.sortable" class="sort-icon">↓</text>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    filters: {
      type: Array,
      required: true
    },
    activeFilter: {
      type: String,
      default: 'default'
    }
  },
  methods: {
    handleFilter(key) {
      this.$emit('change', key)
    }
  }
}
</script>

<style scoped lang="scss">
.filter-bar {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 90px);
  left: 0;
  right: 0;
  z-index: 99;
  display: flex;
  background: #fff;
  padding: 10px 8px;
  border-bottom: 1px solid #f0f0f0;
}

.filter-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 4px;
  font-size: 13px;
  color: #6b7280;
  transition: all 0.2s;
}

.filter-item.active {
  color: #009bf5;
  font-weight: 600;
}

.sort-icon {
  font-size: 10px;
}
</style>
