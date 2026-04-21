<template>
  <div class="filters">
    <el-select v-model="filters.callerRole" clearable size="small" placeholder="发起方角色" style="width: 140px">
      <el-option label="用户" value="user" />
      <el-option label="商户" value="merchant" />
      <el-option label="骑手" value="rider" />
      <el-option label="管理员" value="admin" />
    </el-select>
    <el-select v-model="filters.calleeRole" clearable size="small" placeholder="接收方角色" style="width: 140px">
      <el-option label="用户" value="user" />
      <el-option label="商户" value="merchant" />
      <el-option label="骑手" value="rider" />
      <el-option label="管理员" value="admin" />
    </el-select>
    <el-select v-model="filters.status" clearable size="small" placeholder="通话状态" style="width: 140px">
      <el-option label="发起中" value="initiated" />
      <el-option label="振铃中" value="ringing" />
      <el-option label="已接通" value="accepted" />
      <el-option label="已结束" value="ended" />
      <el-option label="已拒接" value="rejected" />
      <el-option label="忙线" value="busy" />
      <el-option label="已取消" value="cancelled" />
      <el-option label="超时" value="timeout" />
      <el-option label="失败" value="failed" />
    </el-select>
    <el-select v-model="filters.clientKind" clearable size="small" placeholder="终端类型" style="width: 140px">
      <el-option label="App" value="app" />
      <el-option label="H5" value="h5" />
      <el-option label="uni-user" value="uni-user" />
      <el-option label="uni-app-mobile" value="uni-app-mobile" />
    </el-select>
    <el-select
      v-model="filters.complaintStatus"
      clearable
      size="small"
      placeholder="投诉状态"
      style="width: 140px"
    >
      <el-option label="无投诉" value="none" />
      <el-option label="投诉中" value="reported" />
      <el-option label="已处理" value="resolved" />
    </el-select>
    <el-input
      v-model.trim="filters.keyword"
      clearable
      size="small"
      placeholder="通话 ID / 订单号 / 会话号 / 手机号"
      style="width: 300px"
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
})
</script>
