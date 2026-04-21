<template>
  <div class="contact-phone-audits-filters">
    <el-select
      v-model="filters.actorRole"
      clearable
      size="small"
      placeholder="发起方角色"
      style="width: 140px"
    >
      <el-option label="用户" value="user" />
      <el-option label="商户" value="merchant" />
      <el-option label="骑手" value="rider" />
      <el-option label="管理员" value="admin" />
    </el-select>
    <el-select
      v-model="filters.targetRole"
      clearable
      size="small"
      placeholder="目标方角色"
      style="width: 140px"
    >
      <el-option label="用户" value="user" />
      <el-option label="商户" value="merchant" />
      <el-option label="骑手" value="rider" />
      <el-option label="管理员" value="admin" />
    </el-select>
    <el-select
      v-model="filters.clientResult"
      clearable
      size="small"
      placeholder="客户端结果"
      style="width: 140px"
    >
      <el-option label="已点击" value="clicked" />
      <el-option label="已拉起" value="opened" />
      <el-option label="失败" value="failed" />
    </el-select>
    <el-input
      v-model.trim="filters.entryPoint"
      clearable
      size="small"
      placeholder="入口点"
      style="width: 140px"
    />
    <el-input
      v-model.trim="filters.keyword"
      clearable
      size="small"
      placeholder="手机号 / 订单号 / 房间号"
      style="width: 260px"
      @keyup.enter="handleSearch"
    />
    <el-button type="primary" size="small" @click="handleSearch">查询</el-button>
    <el-button size="small" @click="resetFilters">重置</el-button>
  </div>
</template>

<script setup>
defineProps({
  filters: {
    type: Object,
    required: true,
  },
  handleSearch: {
    type: Function,
    required: true,
  },
  resetFilters: {
    type: Function,
    required: true,
  },
});
</script>
