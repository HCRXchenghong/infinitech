<template>
  <div>
    <div
      v-if="!loading && records.length === 0"
      class="biz-card news-empty-state"
    >
      暂无已发布的新闻资讯
    </div>

    <div v-loading="loading" class="news-list">
      <article
        v-for="(item, index) in records"
        :key="item.id"
        class="biz-card biz-card-hover flex cursor-pointer flex-col gap-6 border border-transparent p-6 transition-all md:flex-row"
        @click="openDetail(item)"
      >
        <div class="h-36 w-full flex-shrink-0 overflow-hidden rounded bg-slate-100 md:w-56">
          <img
            :src="resolveCover(item, index)"
            class="h-full w-full object-cover"
            alt="news cover"
          >
        </div>
        <div class="flex flex-1 flex-col justify-between">
          <div>
            <div class="mb-2 flex items-start justify-between gap-4">
              <h3 class="line-clamp-2 pr-4 text-xl font-bold leading-snug text-slate-900">
                {{ item.title }}
              </h3>
              <el-tag
                size="small"
                :type="resolveTagType(item.source)"
                class="flex-shrink-0"
              >
                {{ item.source || '官方公告' }}
              </el-tag>
            </div>
            <p class="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500">
              {{ item.summary || '查看详情' }}
            </p>
          </div>
          <div class="flex items-center text-xs text-slate-400">
            <span class="mr-6">{{ formatDate(item.created_at) }}</span>
            <span>{{ item.source || '官方公告' }}</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
defineProps({
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
    required: true,
  },
  resolveCover: {
    type: Function,
    required: true,
  },
  resolveTagType: {
    type: Function,
    required: true,
  },
})
</script>
