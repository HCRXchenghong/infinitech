<template>
  <div>
    <div class="operations-center-goods-toolbar">
      <el-button type="primary" size="small" @click="openGoodDialog()">新增商品</el-button>
    </div>

    <el-table :data="goods" size="small" stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column prop="points" label="积分" width="90" />
      <el-table-column prop="ship_fee" label="运费" width="90" />
      <el-table-column prop="tag" label="标签" width="100" />
      <el-table-column prop="type" label="类型" width="90" />
      <el-table-column prop="is_active" label="上架" width="80">
        <template #default="{ row }">
          <el-switch v-model="row.is_active" @change="toggleGood(row)" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openGoodDialog(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="deleteGood(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
          :description="loadError ? '加载失败，暂无可显示数据' : '暂无积分商品数据'"
          :image-size="90"
        />
      </template>
    </el-table>
  </div>
</template>

<script setup>
defineProps({
  goods: {
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
  openGoodDialog: {
    type: Function,
    required: true,
  },
  toggleGood: {
    type: Function,
    required: true,
  },
  deleteGood: {
    type: Function,
    required: true,
  },
});
</script>
