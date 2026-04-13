<template>
  <div class="py-12 px-6 max-w-5xl mx-auto min-h-screen">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-slate-200 pb-6 gap-4">
      <div>
        <h2 class="text-3xl font-bold text-slate-900">校园维权曝光板</h2>
        <p class="text-slate-500 mt-2">平台专员介入审核，已解决事件将在 30 天后自动归档隐匿。</p>
      </div>
      <el-button type="danger" class="!px-6 !h-12 !text-base font-bold !rounded shadow-sm" @click="openForm">
        发起维权曝光
      </el-button>
    </div>

    <div v-if="!loading && records.length === 0" class="biz-card p-16 text-center mt-4">
      <div class="text-slate-300 text-4xl mb-4">✓</div>
      <h3 class="text-lg text-slate-700 font-bold">暂无曝光记录</h3>
      <p class="text-slate-500 text-sm mt-1">目前校园商业环境良好</p>
    </div>

    <div v-loading="loading" class="flex flex-col gap-6">
      <article
        v-for="item in records"
        :key="item.id"
        class="biz-card p-6 cursor-pointer hover:border-[#1976d2] border border-transparent transition-all flex flex-col md:flex-row gap-6 group"
        @click="openDetail(item)"
      >
        <div v-if="resolveExposureCover(item)" class="w-full md:w-56 h-36 flex-shrink-0 rounded bg-slate-100 overflow-hidden relative">
          <img :src="resolveExposureCover(item)" class="w-full h-full object-cover transition duration-500 group-hover:scale-105" alt="曝光图片">
          <div class="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md text-white text-xs rounded shadow-sm">实名举报</div>
        </div>

        <div class="flex-1 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start mb-2 gap-4">
              <h3 class="font-bold text-slate-900 text-xl leading-snug line-clamp-1 pr-4">{{ item.content }}</h3>
              <el-tag size="small" :type="item.process_status === 'resolved' ? 'success' : 'danger'" class="flex-shrink-0">
                {{ item.process_status === 'resolved' ? '维权已解决' : statusLabel(item.process_status) }}
              </el-tag>
            </div>
            <p class="text-slate-500 text-sm mb-4 leading-relaxed line-clamp-2">用户核心诉求：{{ item.appeal }}</p>
          </div>

          <div class="flex items-center text-sm text-slate-400 justify-between border-t border-slate-50 pt-3">
            <div class="flex items-center gap-6">
              <span>{{ formatDate(item.created_at) }}</span>
              <span class="font-bold text-red-500">￥{{ formatCurrency(item.amount) }}</span>
            </div>
            <span class="text-[#1976d2] flex items-center font-medium group-hover:underline">查看进度详情</span>
          </div>
        </div>
      </article>
    </div>

    <el-dialog v-model="showForm" title="提交维权信息" width="500px" destroy-on-close class="!rounded-lg" @closed="handleDialogClosed">
      <el-form label-position="top">
        <el-form-item label="证据截图/照片 (选填)">
          <el-upload
            ref="uploadRef"
            action="#"
            list-type="picture-card"
            multiple
            :limit="6"
            accept="image/*"
            :http-request="handlePhotoUpload"
            :before-upload="beforePhotoUpload"
            :on-success="handlePhotoSuccess"
            :on-remove="handlePhotoRemove"
            :on-exceed="handlePhotoExceed"
          >
            <div class="text-slate-400 text-xs">上传证据</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="事件描述">
          <el-input v-model="form.content" type="textarea" :rows="4" placeholder="客观、详实地描述发生的经过..." />
        </el-form-item>
        <div class="flex gap-4">
          <el-form-item label="涉及金额(元)" class="flex-1">
            <el-input-number v-model="form.amount" :min="0" :precision="2" class="!w-full" :controls="false" placeholder="0.00" />
          </el-form-item>
          <el-form-item label="您的电话(平台严格保密)" class="flex-1">
            <el-input v-model="form.contact_phone" placeholder="仅用于核实" />
          </el-form-item>
        </div>
        <el-form-item label="您的诉求">
          <el-input v-model="form.appeal" placeholder="如：退款并按食安法赔偿" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeForm">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitExpose">提交审核</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  createOfficialSiteExposure,
  extractErrorMessage,
  formatCurrency,
  listPublicOfficialSiteExposures,
  uploadOfficialSiteFile
} from '@/utils/officialSiteApi';

const route = useRoute();
const router = useRouter();
const uploadRef = ref(null);
const loading = ref(false);
const submitting = ref(false);
const showForm = ref(false);
const records = ref([]);

const form = reactive({
  content: '',
  amount: undefined,
  contact_phone: '',
  appeal: '',
  photo_urls: []
});

const shouldOpenForm = computed(() => route.name === 'site-expose-submit' || route.query.compose === '1');

watch(shouldOpenForm, (value) => {
  showForm.value = value;
}, { immediate: true });

onMounted(() => {
  void loadRecords();
});

async function loadRecords() {
  loading.value = true;
  try {
    const data = await listPublicOfficialSiteExposures();
    records.value = Array.isArray(data.records) ? data.records : [];
  } catch (error) {
    records.value = [];
    ElMessage.error(extractErrorMessage(error, '曝光板加载失败'));
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

function resolveExposureCover(item) {
  if (Array.isArray(item?.photo_urls)) {
    return item.photo_urls
      .map((value) => String(value || '').trim())
      .find(Boolean) || '';
  }
  if (typeof item?.photo_urls === 'string') {
    return String(item.photo_urls).trim();
  }
  return '';
}

function statusLabel(status) {
  if (status === 'resolved') return '维权已解决';
  if (status === 'processing') return '平台处理中';
  return '待处理';
}

function openDetail(item) {
  if (!item?.id) return;
  router.push(`/expose/${item.id}`);
}

function openForm() {
  router.push('/expose/submit');
}

function closeForm() {
  showForm.value = false;
}

function handleDialogClosed() {
  if (route.name === 'site-expose-submit') {
    router.replace('/expose');
  }
}

function beforePhotoUpload(file) {
  const isImage = String(file.type || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(file.name || '');
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
      photo_urls: form.photo_urls
    });
    ElMessage.success('提交成功，已转交后台人工审核');
    resetForm();
    showForm.value = false;
    await loadRecords();
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '提交失败'));
  } finally {
    submitting.value = false;
  }
}

function resetForm() {
  form.content = '';
  form.amount = undefined;
  form.contact_phone = '';
  form.appeal = '';
  form.photo_urls = [];
  uploadRef.value?.clearFiles?.();
}
</script>
