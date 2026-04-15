<template>
  <div class="py-12 px-6 max-w-5xl mx-auto min-h-screen">
    <h2 class="text-3xl font-bold text-slate-900 mb-2">新闻与公告</h2>
    <p class="text-slate-500 mb-10 border-b border-slate-200 pb-4">掌握最新平台动态与校园资讯</p>

    <div v-if="!loading && records.length === 0" class="biz-card p-12 text-center text-slate-400">
      暂无已发布的新闻资讯
    </div>

    <div v-loading="loading" class="flex flex-col gap-6">
      <article
        v-for="(item, index) in records"
        :key="item.id"
        class="biz-card p-6 cursor-pointer hover:border-[#1976d2] border border-transparent transition-all flex flex-col md:flex-row gap-6"
        @click="openDetail(item)"
      >
        <div class="w-full md:w-56 h-36 flex-shrink-0 rounded bg-slate-100 overflow-hidden">
          <img :src="resolveCover(item, index)" class="w-full h-full object-cover" alt="news cover">
        </div>
        <div class="flex-1 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start mb-2 gap-4">
              <h3 class="font-bold text-slate-900 text-xl leading-snug line-clamp-2 pr-4">{{ item.title }}</h3>
              <el-tag size="small" :type="resolveTagType(item.source)" class="flex-shrink-0">
                {{ item.source || '官方公告' }}
              </el-tag>
            </div>
            <p class="text-slate-500 text-sm mb-4 leading-relaxed line-clamp-2">{{ item.summary || '查看详情' }}</p>
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
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { extractErrorMessage, listPublicOfficialSiteNews } from '@/utils/officialSiteApi';

const router = useRouter();
const loading = ref(false);
const records = ref([]);

const fallbackCovers = [
  'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=1200&h=800&fit=crop',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop'
];

onMounted(() => {
  void loadNews();
});

async function loadNews() {
  loading.value = true;
  try {
    const data = await listPublicOfficialSiteNews({ limit: 50, page: 1 });
    records.value = data.records;
  } catch (error) {
    records.value = [];
    ElMessage.error(extractErrorMessage(error, '新闻资讯加载失败'));
  } finally {
    loading.value = false;
  }
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveCover(item, index) {
  return String(item?.cover || '').trim() || fallbackCovers[index % fallbackCovers.length];
}

function resolveTagType(source) {
  const value = String(source || '').trim();
  if (value.includes('重要')) return 'danger';
  if (value.includes('通知')) return 'warning';
  return 'primary';
}

function openDetail(item) {
  if (!item?.id) return;
  router.push(`/news/${item.id}`);
}
</script>
