<template>
  <article v-loading="loading" class="news-detail-article">
    <div class="border-b border-slate-200 pb-8 site-article-hero">
      <div class="flex items-center gap-3 mb-4">
        <el-tag size="small" type="primary">{{ article.source || '官方公告' }}</el-tag>
        <span class="text-sm text-slate-400">{{ formatDateTime(article.created_at) }}</span>
      </div>
      <h1 class="text-4xl font-bold text-slate-900 leading-tight">
        {{ article.title || '未命名新闻' }}
      </h1>
      <p class="mt-5 text-lg leading-relaxed text-slate-500">
        {{ article.summary || '查看详情' }}
      </p>
    </div>

    <div v-if="article.cover" class="news-detail-cover">
      <img
        :src="article.cover"
        class="news-detail-cover-image"
        alt="news cover"
      >
    </div>

    <div class="official-site-article news-detail-body">
      <template v-for="(block, index) in blocks" :key="`block_${index}`">
        <p v-if="block.type === 'p'" class="p-block">{{ block.text }}</p>
        <h2 v-else-if="block.type === 'h2'" class="h2-block">{{ block.text }}</h2>
        <blockquote v-else-if="block.type === 'quote'" class="quote-block">{{ block.text }}</blockquote>
        <ul v-else-if="block.type === 'ul'" class="ul-block">
          <li v-for="(item, itemIndex) in block.items" :key="`li_${itemIndex}`">{{ item }}</li>
        </ul>
        <figure v-else-if="block.type === 'img'" class="img-block">
          <img v-if="block.url" :src="block.url" alt="block image">
          <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
        </figure>
      </template>
    </div>
  </article>
</template>

<script setup>
import { formatDateTime } from '@/utils/officialSiteApi'

defineProps({
  article: {
    type: Object,
    required: true,
  },
  blocks: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})
</script>
