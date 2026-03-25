<template>
  <div class="notifications-page">
    <div class="page-header">
      <div class="title-wrap">
        <span class="page-title">官方通知</span>
        <span class="page-subtitle">发布和管理官方通知公告</span>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="createNotification">
          <el-icon><Plus /></el-icon>
          新建通知
        </el-button>
        <el-button @click="loadNotifications" :loading="loading">
          <el-icon><RefreshRight /></el-icon>
          刷新
        </el-button>
      </div>
    </div>
    <PageStateAlert :message="loadError" />

    <el-card class="list-card">
      <el-table :data="notifications" v-loading="loading" stripe>
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.cover"
              :src="row.cover"
              fit="cover"
              style="width: 60px; height: 40px; border-radius: 4px;"
              :preview-src-list="[row.cover]"
            />
            <span v-else style="color: #999; font-size: 12px;">无封面</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_published ? 'success' : 'info'">
              {{ row.is_published ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="120" />
        <el-table-column prop="created_at" label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="previewNotification(row)" :disabled="deletingId === row.id">预览</el-button>
            <el-button size="small" type="primary" @click="editNotification(row)" :disabled="deletingId === row.id">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteNotification(row)" :loading="deletingId === row.id">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无通知'" :image-size="90" />
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, RefreshRight } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import PageStateAlert from '@/components/PageStateAlert.vue'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const notifications = ref([])
const deletingId = ref(null)

// 加载通知列表
const loadNotifications = async () => {
  loadError.value = ''
  loading.value = true
  try {
    const res = await axios.get('/api/notifications/admin/all')
    notifications.value = res.data || []
  } catch (error) {
    notifications.value = []
    loadError.value = error?.response?.data?.error || error?.response?.data?.message || error?.message || '加载通知失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 创建通知
const createNotification = () => {
  router.push('/notifications/edit')
}

// 编辑通知
const editNotification = (row) => {
  router.push(`/notifications/edit/${row.id}`)
}

// 预览通知
const previewNotification = (row) => {
  router.push(`/notifications/preview/${row.id}`)
}

// 删除通知
const deleteNotification = async (row) => {
  if (deletingId.value) return
  deletingId.value = row.id
  try {
    await ElMessageBox.confirm(
      `确定要删除通知"${row.title}"吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await axios.delete(`/api/notifications/admin/${row.id}`)
    ElMessage.success('删除成功')
    loadNotifications()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.error || error?.response?.data?.message || error?.message || '删除失败')
    }
  } finally {
    deletingId.value = null
  }
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadNotifications()
})
</script>

<style scoped lang="css">
.notifications-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.page-subtitle {
  font-size: 13px;
  color: #6b7280;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.list-card :deep(.el-card__body) {
  padding: 0;
}
</style>
