import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  officialSiteExposureProcessLabel,
  officialSiteExposureProcessTagType,
} from '@infinitech/admin-core';
import {
  createOfficialSiteExposure,
  extractErrorMessage,
  formatCurrency,
  listPublicOfficialSiteExposures,
  uploadOfficialSiteFile,
} from '@/utils/officialSiteApi';

function createExposureForm() {
  return {
    content: '',
    amount: undefined,
    contact_phone: '',
    appeal: '',
    photo_urls: [],
  };
}

export function useOfficialSiteExposureBoardPage({ route, router, ElMessage }) {
  const uploadRef = ref(null);
  const loading = ref(false);
  const submitting = ref(false);
  const showForm = ref(false);
  const records = ref([]);
  const form = reactive(createExposureForm());

  const shouldOpenForm = computed(
    () => route.name === 'site-expose-submit' || route.query.compose === '1',
  );

  watch(
    shouldOpenForm,
    (value) => {
      showForm.value = value;
    },
    { immediate: true },
  );

  onMounted(() => {
    void loadRecords();
  });

  async function loadRecords() {
    loading.value = true;
    try {
      const data = await listPublicOfficialSiteExposures();
      records.value = Array.isArray(data?.records) ? data.records : [];
    } catch (error) {
      records.value = [];
      ElMessage.error(extractErrorMessage(error, '曝光板加载失败'));
    } finally {
      loading.value = false;
    }
  }

  function formatDate(value) {
    if (!value) {
      return '--';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function resolveExposureCover(item) {
    if (Array.isArray(item?.photo_urls)) {
      return (
        item.photo_urls
          .map((value) => String(value || '').trim())
          .find(Boolean) || ''
      );
    }
    if (typeof item?.photo_urls === 'string') {
      return String(item.photo_urls).trim();
    }
    return '';
  }

  function statusLabel(status) {
    if (status === 'resolved') {
      return '维权已解决';
    }
    return officialSiteExposureProcessLabel(status);
  }

  const statusTagType = officialSiteExposureProcessTagType;

  function openDetail(item) {
    if (!item?.id) {
      return;
    }
    router.push(`/expose/${item.id}`);
  }

  function openForm() {
    router.push('/expose/submit');
  }

  function setFormVisible(value) {
    showForm.value = Boolean(value);
  }

  function closeForm() {
    setFormVisible(false);
  }

  function handleDialogClosed() {
    if (route.name === 'site-expose-submit') {
      router.replace('/expose');
    }
  }

  function setUploadRef(element) {
    uploadRef.value = element ?? null;
  }

  function beforePhotoUpload(file) {
    const isImage =
      String(file.type || '').startsWith('image/') ||
      /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(file.name || '');
    if (!isImage) {
      ElMessage.warning('仅支持上传图片文件');
      return false;
    }
    return true;
  }

  async function handlePhotoUpload(options) {
    try {
      const data = await uploadOfficialSiteFile(options.file);
      options.onSuccess(data);
    } catch (error) {
      options.onError(error);
    }
  }

  function handlePhotoSuccess(_response, _file, uploadFiles) {
    syncPhotoUrls(uploadFiles);
  }

  function handlePhotoRemove(_file, uploadFiles) {
    syncPhotoUrls(uploadFiles);
  }

  function handlePhotoExceed() {
    ElMessage.warning('最多上传 6 张图片');
  }

  function syncPhotoUrls(uploadFiles) {
    form.photo_urls = uploadFiles
      .map((item) => item.response?.url || item.url)
      .filter(Boolean);
  }

  async function submitExpose() {
    if (!form.content.trim()) {
      ElMessage.warning('请填写事件描述');
      return;
    }
    if (!form.contact_phone.trim()) {
      ElMessage.warning('请填写电话');
      return;
    }
    if (!form.appeal.trim()) {
      ElMessage.warning('请填写诉求');
      return;
    }

    submitting.value = true;
    try {
      await createOfficialSiteExposure({
        content: form.content,
        amount: Number(form.amount || 0),
        contact_phone: form.contact_phone,
        appeal: form.appeal,
        photo_urls: form.photo_urls,
      });
      ElMessage.success('提交成功，已转交后台人工审核');
      resetForm();
      setFormVisible(false);
      await loadRecords();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '提交失败'));
    } finally {
      submitting.value = false;
    }
  }

  function resetForm() {
    Object.assign(form, createExposureForm());
    uploadRef.value?.clearFiles?.();
  }

  return {
    beforePhotoUpload,
    closeForm,
    form,
    formatCurrency,
    formatDate,
    handleDialogClosed,
    handlePhotoExceed,
    handlePhotoRemove,
    handlePhotoSuccess,
    handlePhotoUpload,
    loading,
    openDetail,
    openForm,
    records,
    resolveExposureCover,
    setFormVisible,
    setUploadRef,
    showForm,
    statusLabel,
    statusTagType,
    submitExpose,
    submitting,
  };
}
