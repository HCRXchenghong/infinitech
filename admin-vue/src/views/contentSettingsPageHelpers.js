import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import {
  buildAdminPushMessageStats,
  extractAdminCarouselPage,
  extractAdminPushDeliveryPage,
  extractAdminPushMessagePage,
  formatPushDeliveryActionLabel,
  formatPushDeliveryError,
  formatPushDeliveryTime,
  getPushDeliveryActionTagType,
  getPushDeliveryStatusTagType,
} from '@infinitech/admin-core';
import { extractEnvelopeData, extractErrorMessage, resolveUploadAssetUrl } from '@infinitech/contracts';
import {
  compressImageTo1MB,
  createEmptyCarousel,
  createEmptyPushMessageForm,
  fillPushMessageForm,
  resetCarousel,
  resetPushMessageForm,
  validateImageFile,
} from './contentSettingsHelpers';

function normalizeCarouselRow(item = {}) {
  return {
    ...item,
    editing: false,
    editTitle: item.title || '',
    editLinkUrl: item.link_url || '',
    editSortOrder: item.sort_order || 0,
  };
}

function createPushMessagePayload(form) {
  return {
    title: form.title,
    content: form.content,
    image_url: form.image_url || null,
    is_active: form.is_active,
    scheduled_start_time: form.scheduled_start_time || null,
    scheduled_end_time: form.scheduled_end_time || null,
  };
}

export function useContentSettingsPage({ request, ElMessage, ElMessageBox }) {
  const pushMessages = ref([]);
  const pushMessageLoading = ref(false);
  const pushMessageDialogVisible = ref(false);
  const editingPushMessage = ref(null);
  const savingPushMessage = ref(false);
  const pushMessageForm = reactive(createEmptyPushMessageForm());
  const pushMessageStatsVisible = ref(false);
  const currentPushMessageStats = ref(null);
  const pushMessageDeliveryLoading = ref(false);
  const currentPushMessageDeliveries = ref([]);

  const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const loading = ref(false);
  const saving = ref(false);
  const carouselLoading = ref(false);
  const loadError = ref('');
  const carouselError = ref('');
  const pageError = computed(() => carouselError.value || loadError.value || '');
  const carouselList = ref([]);
  const carouselSettings = reactive({
    auto_play_seconds: 5,
  });
  const carouselDetailVisible = ref(false);
  const currentCarousel = ref(null);
  const addCarouselVisible = ref(false);
  const newCarousel = reactive(createEmptyCarousel());

  function syncMobileState() {
    if (typeof window === 'undefined') {
      return;
    }
    const previousIsMobile = isMobile.value;
    isMobile.value = window.innerWidth <= 768;
    if (!previousIsMobile && isMobile.value && pushMessages.value.length === 0 && !pushMessageLoading.value) {
      void loadPushMessages();
    }
  }

  async function loadAll() {
    loadError.value = '';
    carouselError.value = '';
    loading.value = true;

    try {
      const tasks = [loadCarouselList(), loadCarouselSettings()];
      if (isMobile.value) {
        tasks.push(loadPushMessages());
      }
      await Promise.allSettled(tasks);
    } catch (error) {
      loadError.value = extractErrorMessage(error, '加载内容设置失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  async function loadCarouselList() {
    carouselError.value = '';
    carouselLoading.value = true;

    try {
      const { data } = await request.get('/api/carousel');
      carouselList.value = extractAdminCarouselPage(data).items.map(normalizeCarouselRow);
    } catch (error) {
      carouselList.value = [];
      carouselError.value = extractErrorMessage(error, '加载轮播图失败，请稍后重试');
    } finally {
      carouselLoading.value = false;
    }
  }

  async function loadCarouselSettings() {
    try {
      const { data } = await request.get('/api/carousel-settings');
      const payload = extractEnvelopeData(data) || {};
      carouselSettings.auto_play_seconds = payload.auto_play_seconds || 5;
    } catch (error) {
      loadError.value = extractErrorMessage(error, '加载轮播配置失败，请稍后重试');
    }
  }

  async function saveCarouselSettings() {
    saving.value = true;
    try {
      await request.post('/api/carousel-settings', carouselSettings);
      ElMessage.success('轮播配置保存成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存轮播配置失败'));
    } finally {
      saving.value = false;
    }
  }

  function startEdit(row) {
    carouselList.value.forEach((item) => {
      if (item !== row) {
        item.editing = false;
      }
    });

    row.editing = true;
    row.editTitle = row.title || '';
    row.editLinkUrl = row.link_url || '';
    row.editSortOrder = row.sort_order || 0;
  }

  function cancelEdit(row) {
    row.editing = false;
    row.editTitle = row.title || '';
    row.editLinkUrl = row.link_url || '';
    row.editSortOrder = row.sort_order || 0;
  }

  async function finishEdit(row) {
    try {
      const payload = {
        title: row.editTitle || '',
        image_url: row.image_url,
        link_url: row.editLinkUrl || '',
        link_type: row.link_type || 'external',
        sort_order: row.editSortOrder,
        is_active: row.is_active,
      };

      await request.put(`/api/carousel/${row.id}`, payload);

      row.title = row.editTitle;
      row.link_url = row.editLinkUrl;
      row.sort_order = row.editSortOrder;
      row.editing = false;

      if (currentCarousel.value?.id === row.id) {
        currentCarousel.value = {
          ...currentCarousel.value,
          title: row.title,
          link_url: row.link_url,
          sort_order: row.sort_order,
          is_active: row.is_active,
        };
      }

      ElMessage.success('更新成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '更新轮播图失败'));
    }
  }

  async function deleteCarousel(row) {
    try {
      await ElMessageBox.confirm(
        `确定要删除轮播图"${row.title || '无标题'}"吗？此操作不可恢复。`,
        '确认删除',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning',
        },
      );

      await request.delete(`/api/carousel/${row.id}`);
      if (currentCarousel.value?.id === row.id) {
        closeCarouselDetail();
      }
      ElMessage.success('轮播图删除成功');
      await loadCarouselList();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(extractErrorMessage(error, '删除轮播图失败'));
      }
    }
  }

  function showAddCarouselDialog() {
    resetCarousel(newCarousel);
    addCarouselVisible.value = true;
  }

  function cancelAddCarousel() {
    addCarouselVisible.value = false;
    resetCarousel(newCarousel);
  }

  async function confirmAddCarousel() {
    if (!newCarousel.image_url) {
      ElMessage.warning('请先上传图片');
      return;
    }

    saving.value = true;
    try {
      await request.post('/api/carousel', {
        title: newCarousel.title || '',
        image_url: newCarousel.image_url,
        link_url: newCarousel.link_url || '',
        link_type: newCarousel.link_type,
        sort_order: newCarousel.sort_order || 0,
        is_active: newCarousel.is_active ? 1 : 0,
      });
      ElMessage.success('轮播图添加成功');
      cancelAddCarousel();
      await loadCarouselList();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '添加轮播图失败'));
    } finally {
      saving.value = false;
    }
  }

  async function uploadCarouselImage(options) {
    const formData = new FormData();
    formData.append('image', options.file);

    try {
      const { data } = await request.post('/api/upload-image', formData);
      const imageUrl = String(resolveUploadAssetUrl(data) || '').trim();

      if (!imageUrl) {
        ElMessage.error(extractErrorMessage(data, '图片上传失败'));
        return;
      }

      newCarousel.image_url = imageUrl;
      ElMessage.success('图片上传成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '图片上传失败，请重试'));
    }
  }

  function beforeCarouselUpload(file) {
    const result = validateImageFile(file, 10);
    if (!result.valid) {
      ElMessage.error(result.message);
      return false;
    }
    return true;
  }

  function showCarouselDetail(row) {
    currentCarousel.value = { ...row };
    carouselDetailVisible.value = true;
  }

  function closeCarouselDetail() {
    carouselDetailVisible.value = false;
    currentCarousel.value = null;
  }

  function editFromDetail() {
    if (!currentCarousel.value?.id) {
      return;
    }

    const row = carouselList.value.find((item) => item.id === currentCarousel.value.id);
    if (!row) {
      ElMessage.warning('当前轮播图已不存在，请刷新后重试');
      closeCarouselDetail();
      return;
    }

    startEdit(row);
    closeCarouselDetail();
  }

  async function copyToClipboard(text) {
    if (!text) {
      ElMessage.warning('没有可复制的内容');
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        if (typeof document === 'undefined') {
          throw new Error('clipboard unavailable');
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      ElMessage.success('已复制到剪贴板');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '复制失败'));
    }
  }

  async function loadPushMessages() {
    pushMessageLoading.value = true;
    try {
      const { data } = await request.get('/api/push-messages');
      pushMessages.value = extractAdminPushMessagePage(data).items;
    } catch (error) {
      loadError.value = extractErrorMessage(error, '加载推送消息失败，请稍后重试');
      pushMessages.value = [];
    } finally {
      pushMessageLoading.value = false;
    }
  }

  function showAddPushMessageDialog() {
    editingPushMessage.value = null;
    resetPushMessageForm(pushMessageForm);
    pushMessageDialogVisible.value = true;
  }

  function cancelPushMessageDialog() {
    pushMessageDialogVisible.value = false;
    editingPushMessage.value = null;
    resetPushMessageForm(pushMessageForm);
  }

  function editPushMessage(message) {
    editingPushMessage.value = message;
    fillPushMessageForm(pushMessageForm, message);
    pushMessageDialogVisible.value = true;
  }

  async function savePushMessage() {
    if (!pushMessageForm.title || !pushMessageForm.content) {
      ElMessage.warning('请填写标题和内容');
      return;
    }

    savingPushMessage.value = true;
    try {
      const payload = createPushMessagePayload(pushMessageForm);
      if (editingPushMessage.value?.id) {
        await request.put(`/api/push-messages/${editingPushMessage.value.id}`, payload);
        ElMessage.success('推送消息更新成功');
      } else {
        await request.post('/api/push-messages', payload);
        ElMessage.success('推送消息创建成功');
      }

      cancelPushMessageDialog();
      await loadPushMessages();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存推送消息失败'));
    } finally {
      savingPushMessage.value = false;
    }
  }

  async function deletePushMessage(message) {
    try {
      await ElMessageBox.confirm(
        `确定要删除推送消息"${message.title}"吗？此操作不可恢复。`,
        '确认删除',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning',
        },
      );

      await request.delete(`/api/push-messages/${message.id}`);
      ElMessage.success('推送消息删除成功');
      await loadPushMessages();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(extractErrorMessage(error, '删除推送消息失败'));
      }
    }
  }

  async function showPushMessageStats(message) {
    currentPushMessageStats.value = null;
    currentPushMessageDeliveries.value = [];
    pushMessageDeliveryLoading.value = true;

    try {
      const [{ data: stats }, { data: deliveries }] = await Promise.all([
        request.get(`/api/push-messages/${message.id}/stats`),
        request.get(`/api/push-messages/${message.id}/deliveries`, {
          params: { limit: 50 },
        }),
      ]);

      const statsPayload = extractEnvelopeData(stats) || {};
      currentPushMessageStats.value = buildAdminPushMessageStats(message, statsPayload);
      currentPushMessageDeliveries.value = extractAdminPushDeliveryPage(deliveries).items;
      pushMessageStatsVisible.value = true;
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '获取统计信息失败'));
      currentPushMessageStats.value = null;
      currentPushMessageDeliveries.value = [];
    } finally {
      pushMessageDeliveryLoading.value = false;
    }
  }

  function hidePushMessageStats() {
    pushMessageStatsVisible.value = false;
  }

  async function uploadPushMessageImage(options) {
    let fileToUpload = options.file;

    if (pushMessageForm.compress_image) {
      try {
        fileToUpload = await compressImageTo1MB(options.file);
      } catch {
        ElMessage.error('图片压缩失败，请重试');
        return;
      }
    }

    const formData = new FormData();
    formData.append('image', fileToUpload);
    formData.append('compress', pushMessageForm.compress_image ? 'true' : 'false');

    try {
      const { data } = await request.post('/api/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const imageUrl = String(resolveUploadAssetUrl(data) || '').trim();

      if (!imageUrl) {
        ElMessage.error(extractErrorMessage(data, '图片上传失败'));
        return;
      }

      pushMessageForm.image_url = imageUrl;
      ElMessage.success('图片上传成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '图片上传失败，请重试'));
    }
  }

  function beforePushMessageUpload(file) {
    const result = validateImageFile(file, 10);
    if (!result.valid) {
      ElMessage.error(result.message);
      return false;
    }
    return true;
  }

  function clearPushMessageImage() {
    pushMessageForm.image_url = '';
  }

  function insertImageTag() {
    if (typeof document === 'undefined') {
      pushMessageForm.content = `${pushMessageForm.content || ''}[图片]`;
      ElMessage.success('图片标记已追加到内容末尾');
      return;
    }

    const textarea = document.querySelector('.content-settings-push-message-dialog .el-textarea__inner');
    const text = pushMessageForm.content || '';

    if (
      typeof HTMLTextAreaElement === 'undefined'
      || !(textarea instanceof HTMLTextAreaElement)
    ) {
      pushMessageForm.content = `${text}[图片]`;
      ElMessage.success('图片标记已追加到内容末尾');
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const beforeText = text.substring(0, start);
    const afterText = text.substring(end);

    pushMessageForm.content = `${beforeText}[图片]${afterText}`;

    setTimeout(() => {
      textarea.focus();
      const nextPosition = start + '[图片]'.length;
      textarea.setSelectionRange(nextPosition, nextPosition);
    }, 0);

    ElMessage.success('图片标记已插入，可在内容中移动位置');
  }

  onMounted(() => {
    void loadAll();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', syncMobileState);
    }
  });

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', syncMobileState);
    }
  });

  return {
    addCarouselVisible,
    beforeCarouselUpload,
    beforePushMessageUpload,
    cancelAddCarousel,
    cancelEdit,
    cancelPushMessageDialog,
    carouselDetailVisible,
    carouselError,
    carouselList,
    carouselLoading,
    carouselSettings,
    clearPushMessageImage,
    closeCarouselDetail,
    confirmAddCarousel,
    copyToClipboard,
    currentCarousel,
    currentPushMessageDeliveries,
    currentPushMessageStats,
    deleteCarousel,
    deletePushMessage,
    editFromDetail,
    editPushMessage,
    editingPushMessage,
    finishEdit,
    formatPushDeliveryActionLabel,
    formatPushDeliveryError,
    formatPushDeliveryTime,
    getPushDeliveryActionTagType,
    getPushDeliveryStatusTagType,
    hidePushMessageStats,
    insertImageTag,
    isMobile,
    loadAll,
    loadCarouselList,
    loadPushMessages,
    loading,
    newCarousel,
    pageError,
    pushMessageDeliveryLoading,
    pushMessageDialogVisible,
    pushMessageForm,
    pushMessageLoading,
    pushMessageStatsVisible,
    pushMessages,
    saveCarouselSettings,
    savePushMessage,
    saving,
    savingPushMessage,
    showAddCarouselDialog,
    showAddPushMessageDialog,
    showCarouselDetail,
    showPushMessageStats,
    startEdit,
    uploadCarouselImage,
    uploadPushMessageImage,
  };
}
