<template>
  <div class="section-card">
    <div class="section-head">
      <span>标签与优惠</span>
      <el-button type="primary" text size="small" @click="openTagDialog">编辑</el-button>
    </div>
    <div class="tag-block">
      <div class="line-title">店铺标签</div>
      <el-tag
        v-for="(tag, index) in tagList"
        :key="`tag-${index}`"
        size="small"
        class="mini-tag"
      >
        {{ tag }}
      </el-tag>
      <span v-if="tagList.length === 0" class="empty-tip">未设置标签</span>
    </div>
    <div class="tag-block">
      <div class="line-title">优惠信息</div>
      <el-tag
        v-for="(discount, index) in discountList"
        :key="`discount-${index}`"
        type="success"
        size="small"
        class="mini-tag"
      >
        {{ discount }}
      </el-tag>
      <span v-if="discountList.length === 0" class="empty-tip">未设置优惠</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  discountList: {
    type: Array,
    default: () => [],
  },
  openTagDialog: {
    type: Function,
    required: true,
  },
  tagList: {
    type: Array,
    default: () => [],
  },
});
</script>
