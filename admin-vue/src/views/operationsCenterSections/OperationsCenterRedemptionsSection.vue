<template>
  <el-table :data="redemptions" size="small" stripe v-loading="loading">
    <el-table-column prop="id" label="ID" width="70" />
    <el-table-column prop="user_id" label="用户ID" width="140" />
    <el-table-column prop="user_phone" label="手机号" width="140" />
    <el-table-column prop="good_name" label="兑换商品" min-width="160" />
    <el-table-column prop="points" label="积分" width="90" />
    <el-table-column prop="ship_fee" label="运费" width="90" />
    <el-table-column prop="created_at" label="兑换时间" width="160" />
    <el-table-column label="状态" width="140">
      <template #default="{ row }">
        <el-select v-model="row.status" size="small" @change="updateRedemption(row)">
          <el-option
            v-for="option in redemptionStatusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </template>
    </el-table-column>
    <template #empty>
      <el-empty
        :description="loadError ? '加载失败，暂无可显示数据' : '暂无积分兑换记录'"
        :image-size="90"
      />
    </template>
  </el-table>
</template>

<script setup>
defineProps({
  redemptions: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadError: {
    type: String,
    default: '',
  },
  redemptionStatusOptions: {
    type: Array,
    default: () => [],
  },
  updateRedemption: {
    type: Function,
    required: true,
  },
});
</script>
