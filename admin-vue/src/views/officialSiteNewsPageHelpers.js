import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  extractErrorMessage,
  listPublicOfficialSiteNews,
} from '@/utils/officialSiteApi'

const fallbackCovers = [
  'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=1200&h=800&fit=crop',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop',
]

export function formatOfficialSiteNewsDate(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function resolveOfficialSiteNewsCover(item, index) {
  return String(item?.cover || '').trim() || fallbackCovers[index % fallbackCovers.length]
}

export function resolveOfficialSiteNewsTagType(source) {
  const value = String(source || '').trim()
  if (value.includes('重要')) return 'danger'
  if (value.includes('通知')) return 'warning'
  return 'primary'
}

export function useOfficialSiteNewsPage({ router }) {
  const loading = ref(false)
  const records = ref([])

  onMounted(() => {
    void loadNews()
  })

  async function loadNews() {
    loading.value = true
    try {
      const data = await listPublicOfficialSiteNews({ limit: 50, page: 1 })
      records.value = data.records
    } catch (error) {
      records.value = []
      ElMessage.error(extractErrorMessage(error, '新闻资讯加载失败'))
    } finally {
      loading.value = false
    }
  }

  function openDetail(item) {
    if (!item?.id) return
    router.push(`/news/${item.id}`)
  }

  return {
    formatDate: formatOfficialSiteNewsDate,
    loading,
    openDetail,
    records,
    resolveCover: resolveOfficialSiteNewsCover,
    resolveTagType: resolveOfficialSiteNewsTagType,
  }
}
