<template>
  <section class="py-20 max-w-6xl mx-auto px-6">
    <div class="flex justify-between items-end mb-10 border-b border-slate-200 pb-4 gap-4">
      <div>
        <h2 class="text-3xl font-bold text-slate-900">平台动态</h2>
        <p class="text-slate-500 mt-2">Latest News</p>
      </div>
      <el-button link class="!text-[#1976d2] text-base" @click="openNewsListPage">
        查看更多新闻
      </el-button>
    </div>

    <div v-loading="loading" class="grid grid-cols-1 md:grid-cols-2 gap-12">
      <div v-if="featuredNews" class="group cursor-pointer" @click="openNews(featuredNews)">
        <div class="overflow-hidden rounded-lg mb-6">
          <img
            :src="resolveNewsCover(featuredNews, 0)"
            class="w-full h-72 object-cover transform group-hover:scale-105 transition duration-500"
            alt="news cover"
          >
        </div>
        <div class="flex items-center gap-3 mb-3">
          <span class="text-xs font-bold text-[#1976d2] uppercase tracking-wider">
            {{ featuredNews.source || '官方公告' }}
          </span>
          <span class="text-sm text-slate-400">{{ formatDate(featuredNews.created_at) }}</span>
        </div>
        <h3 class="text-2xl font-bold text-slate-900 mb-3 group-hover:text-[#1976d2] transition">
          {{ featuredNews.title }}
        </h3>
        <p class="text-slate-500 leading-relaxed">{{ featuredNews.summary || '暂无摘要' }}</p>
      </div>

      <div v-else class="biz-card p-8 flex items-center justify-center text-slate-400">
        暂无已发布平台动态
      </div>

      <div class="flex flex-col justify-between">
        <div
          v-for="(item, index) in secondaryNews"
          :key="item.id"
          class="flex gap-6 pb-6 mb-6 border-b border-slate-100 last:border-0 last:pb-0 last:mb-0 cursor-pointer group"
          @click="openNews(item)"
        >
          <div class="w-40 h-28 flex-shrink-0 overflow-hidden rounded">
            <img
              :src="resolveNewsCover(item, index + 1)"
              class="w-full h-full object-cover transform group-hover:scale-105 transition duration-500"
              alt="news cover"
            >
          </div>
          <div class="flex flex-col justify-center">
            <div class="text-xs font-bold text-[#1976d2] mb-1">{{ item.source || '官方公告' }}</div>
            <h4
              class="text-lg font-bold text-slate-800 mb-2 group-hover:text-[#1976d2] transition line-clamp-2"
            >
              {{ item.title }}
            </h4>
            <span class="text-sm text-slate-400">{{ formatDate(item.created_at) }}</span>
          </div>
        </div>

        <div
          v-if="!loading && secondaryNews.length === 0 && featuredNews"
          class="biz-card p-8 text-slate-400"
        >
          更多平台动态正在整理中
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  featuredNews: {
    type: Object,
    default: null,
  },
  formatDate: {
    type: Function,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  openNews: {
    type: Function,
    required: true,
  },
  openNewsListPage: {
    type: Function,
    required: true,
  },
  resolveNewsCover: {
    type: Function,
    required: true,
  },
  secondaryNews: {
    type: Array,
    default: () => [],
  },
});
</script>
