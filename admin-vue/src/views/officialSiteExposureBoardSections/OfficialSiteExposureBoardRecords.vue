<template>
  <template v-if="!loading && records.length === 0">
    <div class="biz-card p-16 text-center mt-4">
      <div class="official-site-exposure-board-empty-check">✓</div>
      <h3 class="text-lg text-slate-700 font-bold">暂无曝光记录</h3>
      <p class="text-slate-500 text-sm mt-1">目前校园商业环境良好</p>
    </div>
  </template>

  <div v-loading="loading" class="flex flex-col gap-6">
    <article
      v-for="item in records"
      :key="item.id"
      class="biz-card p-6 cursor-pointer hover:border-[#1976d2] border border-transparent transition-all flex flex-col md:flex-row gap-6 group"
      @click="openDetail(item)"
    >
      <div
        v-if="resolveExposureCover(item)"
        class="w-full md:w-56 h-36 flex-shrink-0 rounded bg-slate-100 overflow-hidden relative"
      >
        <img
          :src="resolveExposureCover(item)"
          class="w-full h-full object-cover transition duration-500 group-hover:scale-105"
          alt="曝光图片"
        >
        <div
          class="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md text-white text-xs rounded shadow-sm"
        >
          实名举报
        </div>
      </div>

      <div class="flex-1 flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-start mb-2 gap-4">
            <h3 class="font-bold text-slate-900 text-xl leading-snug line-clamp-1 pr-4">
              {{ item.content }}
            </h3>
            <el-tag
              size="small"
              :type="statusTagType(item.process_status)"
              class="flex-shrink-0"
            >
              {{ statusLabel(item.process_status) }}
            </el-tag>
          </div>
          <p class="text-slate-500 text-sm mb-4 leading-relaxed line-clamp-2">
            用户核心诉求：{{ item.appeal }}
          </p>
        </div>

        <div class="flex items-center text-sm text-slate-400 justify-between border-t border-slate-50 pt-3">
          <div class="flex items-center gap-6">
            <span>{{ formatDate(item.created_at) }}</span>
            <span class="font-bold text-red-500">￥{{ formatCurrency(item.amount) }}</span>
          </div>
          <span class="text-[#1976d2] flex items-center font-medium group-hover:underline">
            查看进度详情
          </span>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
defineProps({
  formatCurrency: {
    type: Function,
    required: true,
  },
  formatDate: {
    type: Function,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  openDetail: {
    type: Function,
    required: true,
  },
  records: {
    type: Array,
    default: () => [],
  },
  resolveExposureCover: {
    type: Function,
    required: true,
  },
  statusLabel: {
    type: Function,
    required: true,
  },
  statusTagType: {
    type: Function,
    required: true,
  },
});
</script>
