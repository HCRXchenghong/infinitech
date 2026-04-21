import { computed, onMounted, ref } from 'vue'
import { extractEnvelopeData, extractErrorMessage, resolveUploadAssetUrl } from '@infinitech/contracts'
import {
  buildPayload,
  createBlock,
  createDefaultEditorForm,
  moveBlock,
  parseContent,
  sanitizeBlocks,
} from './notificationEditorPageHelpers'

export function useNotificationEditorPage({ route, router, request, ElMessage }) {
  const saving = ref(false)
  const publishing = ref(false)
  const uploadingCover = ref(false)
  const uploadingBlockMap = ref({})
  const form = ref(createDefaultEditorForm())

  const notificationId = computed(() => route.params.id)
  const isPreview = computed(() => route.path.startsWith('/notifications/preview/'))
  const isEdit = computed(() => route.path.startsWith('/notifications/edit/') && !!notificationId.value)

  const nowText = computed(() => {
    const current = new Date()
    const year = current.getFullYear()
    const month = String(current.getMonth() + 1).padStart(2, '0')
    const day = String(current.getDate()).padStart(2, '0')
    const hours = String(current.getHours()).padStart(2, '0')
    const minutes = String(current.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  })

  const titleText = computed(() => {
    if (isPreview.value) return '通知预览'
    if (isEdit.value) return '编辑通知'
    return '新建通知'
  })

  function ensureInitialBlock() {
    if (!form.value.blocks.length && !isPreview.value) {
      form.value.blocks = [createBlock('p')]
    }
  }

  async function loadNotification() {
    if (!notificationId.value) {
      ensureInitialBlock()
      return
    }

    try {
      const { data } = await request.get(`/api/notifications/admin/${notificationId.value}`)
      const payload = extractEnvelopeData(data) || {}
      form.value = {
        title: payload.title || '',
        source: payload.source || '悦享e食',
        cover: payload.cover || '',
        blocks: parseContent(payload.content),
      }
      ensureInitialBlock()
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '加载通知失败'))
      ensureInitialBlock()
    }
  }

  function addBlock(type) {
    form.value.blocks.push(createBlock(type))
  }

  function removeBlock(index) {
    form.value.blocks.splice(index, 1)
    ensureInitialBlock()
  }

  function moveBlockUp(index) {
    moveBlock(form.value.blocks, index, -1)
  }

  function moveBlockDown(index) {
    moveBlock(form.value.blocks, index, 1)
  }

  function addListItem(blockIndex) {
    form.value.blocks[blockIndex].items.push('')
  }

  function removeListItem(blockIndex, itemIndex) {
    const block = form.value.blocks[blockIndex]
    if (!block || !Array.isArray(block.items)) return
    if (block.items.length <= 1) {
      block.items[0] = ''
      return
    }
    block.items.splice(itemIndex, 1)
  }

  async function uploadNotificationImage(file) {
    const formData = new FormData()
    formData.append('image', file)
    const { data } = await request.post('/api/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const imageUrl = String(resolveUploadAssetUrl(data) || '').trim()
    if (!imageUrl) {
      throw new Error('no image url')
    }
    return imageUrl
  }

  async function uploadCover(option) {
    uploadingCover.value = true
    try {
      form.value.cover = await uploadNotificationImage(option.file)
      ElMessage.success('封面上传成功')
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '封面上传失败'))
    } finally {
      uploadingCover.value = false
    }
  }

  async function uploadBlockImage(option, blockIndex) {
    const block = form.value.blocks[blockIndex]
    if (!block?.key) return
    uploadingBlockMap.value = {
      ...uploadingBlockMap.value,
      [block.key]: true,
    }
    try {
      form.value.blocks[blockIndex].url = await uploadNotificationImage(option.file)
      ElMessage.success('内容图上传成功')
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '内容图上传失败'))
    } finally {
      const nextUploadingState = { ...uploadingBlockMap.value }
      delete nextUploadingState[block.key]
      uploadingBlockMap.value = nextUploadingState
    }
  }

  async function submitNotification(published) {
    if (!form.value.title.trim()) {
      ElMessage.warning('请输入通知标题')
      return false
    }

    const blocks = sanitizeBlocks(form.value.blocks)
    if (blocks.length === 0) {
      ElMessage.warning('请至少添加一个有效内容块')
      return false
    }

    const payload = buildPayload(form.value, published)

    if (isEdit.value) {
      await request.put(`/api/notifications/admin/${notificationId.value}`, payload)
      return true
    }

    const { data } = await request.post('/api/notifications/admin', payload)
    const created = extractEnvelopeData(data) || {}
    if (created?.id) {
      router.replace(`/notifications/edit/${created.id}`)
    }
    return true
  }

  async function saveDraft() {
    if (saving.value || publishing.value) return
    saving.value = true
    try {
      const ok = await submitNotification(false)
      if (ok) {
        ElMessage.success('草稿已保存')
      }
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存失败'))
    } finally {
      saving.value = false
    }
  }

  async function publish() {
    if (publishing.value || saving.value) return
    publishing.value = true
    try {
      const ok = await submitNotification(true)
      if (ok) {
        ElMessage.success('发布成功')
        router.push('/notifications')
      }
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '发布失败'))
    } finally {
      publishing.value = false
    }
  }

  function goBack() {
    router.push('/notifications')
  }

  onMounted(() => {
    void loadNotification()
  })

  return {
    addBlock,
    addListItem,
    form,
    goBack,
    isPreview,
    moveBlockDown,
    moveBlockUp,
    nowText,
    publish,
    publishing,
    removeBlock,
    removeListItem,
    saveDraft,
    saving,
    titleText,
    uploadingBlockMap,
    uploadingCover,
    uploadBlockImage,
    uploadCover,
  }
}
