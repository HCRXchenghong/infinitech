<template src="./ContentSettings.template.html"></template>
<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh, More } from '@element-plus/icons-vue';
import request from '@/utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';
import {
  createEmptyPushMessageForm,
  resetPushMessageForm,
  fillPushMessageForm,
  createEmptyCarousel,
  resetCarousel,
  validateImageFile,
  compressImageTo1MB
} from './contentSettingsHelpers';

// 推送消息管理相关
const pushMessages = ref([]);
const pushMessageLoading = ref(false);
const pushMessageDialogVisible = ref(false);
const editingPushMessage = ref(null);
const savingPushMessage = ref(false);
const pushMessageForm = reactive(createEmptyPushMessageForm());
const pushMessageStatsVisible = ref(false);
const currentPushMessageStats = ref(null);

// 移动端检测
const isMobile = ref(window.innerWidth <= 768);

const handleResize = () => {
  isMobile.value = window.innerWidth <= 768;
};

const loading = ref(false);
const saving = ref(false);
const carouselLoading = ref(false);
const loadError = ref('');
const carouselError = ref('');
const pageError = computed(() => carouselError.value || loadError.value || '');
const paymentTab = ref('delivery');
const paymentNotices = reactive({
  delivery: '',
  phone_film: '',
  massage: '',
  coffee: ''
});
const carouselList = ref([]);
const carouselSettings = reactive({
  auto_play_seconds: 5
});
const carouselDetailVisible = ref(false);
const currentCarousel = ref(null);
const addCarouselVisible = ref(false);
const newCarousel = reactive(createEmptyCarousel());

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;
}

onMounted(() => {
  loadAll();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

async function loadAll() {
  loadError.value = '';
  carouselError.value = '';
  loading.value = true;
  try {
    const promises = [
      loadPaymentNotices(),
      loadCarouselList(),
      loadCarouselSettings()
    ];
    // 只在移动端加载推送消息
    if (isMobile.value) {
      promises.push(loadPushMessages());
    }
    await Promise.allSettled(promises);
  } catch (error) {
    loadError.value = extractErrorMessage(error, '加载内容设置失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

async function loadPaymentNotices() {
  try {
    const resp = await request.get('/api/payment-notices');
    Object.assign(paymentNotices, resp?.data || {});
  } catch (error) {
    loadError.value = extractErrorMessage(error, '加载付款说明失败，请稍后重试');
  }
}

async function savePaymentNotices() {
  saving.value = true;
  try {
    await request.post('/api/payment-notices', paymentNotices);
    ElMessage.success('付款说明保存成功');
  } catch (error) {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
}

// 轮播图相关函数
async function loadCarouselList() {
  carouselError.value = '';
  carouselLoading.value = true;
  try {
    const { data } = await request.get('/api/carousel');
    carouselList.value = Array.isArray(data) ? data : [];
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
    if (data) {
      carouselSettings.auto_play_seconds = data.auto_play_seconds || 5;
    }
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
    ElMessage.error('保存配置失败');
  } finally {
    saving.value = false;
  }
}

function startEdit(row) {
  carouselList.value.forEach(item => {
    if (item !== row) {
      item.editing = false;
    }
  });

  row.editing = true;
  row.editTitle = row.title || '';
  row.editLinkUrl = row.link_url || '';
  row.editSortOrder = row.sort_order || 0;
}

async function finishEdit(row) {
  try {
    const data = {
      title: row.editTitle || '',
      image_url: row.image_url,
      link_url: row.editLinkUrl || '',
      link_type: row.link_type || 'external',
      sort_order: row.editSortOrder,
      is_active: row.is_active
    };

    await request.put(`/api/carousel/${row.id}`, data);
    ElMessage.success('更新成功');

    row.title = row.editTitle;
    row.link_url = row.editLinkUrl;
    row.sort_order = row.editSortOrder;
    row.editing = false;
  } catch (error) {
    ElMessage.error('更新失败');
  }
}

function cancelEdit(row) {
  row.editing = false;
}

async function deleteCarousel(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除轮播图"${row.title || '无标题'}"吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await request.delete(`/api/carousel/${row.id}`);
    ElMessage.success('轮播图删除成功');
    loadCarouselList();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
}

function showAddDialog() {
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
      is_active: newCarousel.is_active ? 1 : 0
    });
    ElMessage.success('轮播图添加成功');
    addCarouselVisible.value = false;
    loadCarouselList();
    cancelAddCarousel();
  } catch (error) {
    ElMessage.error('添加失败: ' + (error?.response?.data?.error || error.message));
  } finally {
    saving.value = false;
  }
}

async function handleUpload(options) {
  const formData = new FormData();
  formData.append('image', options.file);
  
  try {
    const response = await request.post('/api/upload-image', formData);
    
    if (response.data.success && response.data.imageUrl) {
      newCarousel.image_url = response.data.imageUrl;
      ElMessage.success('图片上传成功');
    } else {
      ElMessage.error(response.data.error || '图片上传失败');
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '图片上传失败，请重试');
  }
}

function beforeUpload(file) {
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

function editFromDetail() {
  if (currentCarousel.value) {
    startEdit(currentCarousel.value);
    carouselDetailVisible.value = false;
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板');
  }).catch(() => {
    ElMessage.error('复制失败');
  });
}

// 推送消息管理相关函数
async function loadPushMessages() {
  pushMessageLoading.value = true;
  try {
    const { data } = await request.get('/api/push-messages');
    pushMessages.value = Array.isArray(data) ? data : [];
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
    const data = {
      title: pushMessageForm.title,
      content: pushMessageForm.content,
      image_url: pushMessageForm.image_url || null,
      is_active: pushMessageForm.is_active,
      scheduled_start_time: pushMessageForm.scheduled_start_time || null,
      scheduled_end_time: pushMessageForm.scheduled_end_time || null
    };

    if (editingPushMessage.value) {
      await request.put(`/api/push-messages/${editingPushMessage.value.id}`, data);
      ElMessage.success('推送消息更新成功');
    } else {
      await request.post('/api/push-messages', data);
      ElMessage.success('推送消息创建成功');
    }

    pushMessageDialogVisible.value = false;
    loadPushMessages();
  } catch (error) {
    ElMessage.error('保存失败: ' + (error?.response?.data?.error || error.message));
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
        type: 'warning'
      }
    );

    await request.delete(`/api/push-messages/${message.id}`);
    ElMessage.success('推送消息删除成功');
    loadPushMessages();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + (error?.response?.data?.error || error.message));
    }
  }
}

async function showPushMessageStats(message) {
  try {
    const { data } = await request.get(`/api/push-messages/${message.id}/stats`);
    currentPushMessageStats.value = {
      ...message,
      ...data
    };
    pushMessageStatsVisible.value = true;
  } catch (error) {
    ElMessage.error('获取统计信息失败: ' + (error?.response?.data?.error || error.message));
  }
}

// 推送消息图片上传
async function handlePushMessageUpload(options) {
  let fileToUpload = options.file;
  
  // 如果选择了压缩，先压缩图片
  if (pushMessageForm.compress_image) {
    try {
      fileToUpload = await compressImageTo1MB(options.file);
    } catch (error) {
      console.error('压缩图片失败:', error);
      ElMessage.error('图片压缩失败，请重试');
      return;
    }
  }
  
  const formData = new FormData();
  formData.append('image', fileToUpload);
  formData.append('compress', pushMessageForm.compress_image ? 'true' : 'false');
  
  try {
    const response = await request.post('/api/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if (response.data.success && response.data.imageUrl) {
      pushMessageForm.image_url = response.data.imageUrl;
      ElMessage.success('图片上传成功');
    } else {
      ElMessage.error(response.data.error || '图片上传失败');
    }
  } catch (error) {
    console.error('上传失败:', error);
    ElMessage.error(error.response?.data?.error || '图片上传失败，请重试');
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

// 插入图片标记到内容中
function insertImageTag() {
  const textarea = document.querySelector('.el-textarea__inner');
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = pushMessageForm.content;
    const beforeText = text.substring(0, start);
    const afterText = text.substring(end, text.length);
    pushMessageForm.content = beforeText + '[图片]' + afterText;
    
    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + '[图片]'.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
    
    ElMessage.success('图片标记已插入，可在内容中移动位置');
  }
}
</script>

<style scoped lang="css" src="./ContentSettings.css"></style>
