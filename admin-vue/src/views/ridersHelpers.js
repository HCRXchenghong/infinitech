import { ref, onMounted, onUnmounted } from 'vue';
import request from '@/utils/request';
import { ElMessage, ElMessageBox } from 'element-plus';
import { formatRoleId } from '@/utils/format';
import { useResponsiveListPage } from '@/composables/useResponsiveListPage';
import { useRiderActionHelpers } from './ridersActionHelpers';

export function useRidersPage() {
  const loading = ref(false);
  const loadError = ref('');
  const riders = ref([]);
  const currentPage = ref(1);
  const { isMobile, pageSize } = useResponsiveListPage({
    onModeChange: () => {
      currentPage.value = 1;
      dataCache.value.clear();
      loadRiders();
    }
  });
  const total = ref(0);
  const searchKeyword = ref('');
  const deletingRider = ref(null);
  const deletingOrders = ref(null);
  const resettingPassword = ref(null);
  const addDialogVisible = ref(false);
  const addingRider = ref(false);
  const reorganizing = ref(false);
  const clearing = ref(false);
  const detailVisible = ref(false);
  const detail = ref({});
  const riderEditVisible = ref(false);
  const savingRiderEdit = ref(false);
  const uploadingRiderIdCard = ref(false);
  const riderEditForm = ref({
    id: null,
    name: '',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    id_card_front: ''
  });
  const newRider = ref({
    phone: '',
    name: '',
    password: ''
  });
  const inviteDialogVisible = ref(false);
  const creatingInvite = ref(false);
  const inviteForm = ref({
    expires_hours: 72,
    max_uses: 1
  });
  const inviteResult = ref({
    invite_url: '',
    expires_at: '',
    max_uses: 1,
    used_count: 0,
    remaining_uses: 1
  });
  const reviewManageVisible = ref(false);
  const reviewTargetRider = ref({});
  const riderReviewsLoading = ref(false);
  const riderReviews = ref([]);
  const riderReviewDialogVisible = ref(false);
  const riderReviewEditingId = ref('');
  const riderReviewSaving = ref(false);
  const uploadingRiderReviewImage = ref(false);
  const riderReviewForm = ref(buildEmptyRiderReviewForm());
  let refreshTimer = null;

  function buildEmptyRiderReviewForm() {
    return {
      userName: '匿名用户',
      rating: 5,
      userId: '',
      orderId: '',
      userAvatar: '',
      content: '',
      images: []
    };
  }

  function normalizeImageArray(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (!value) return [];
    return String(value)
      .split(/[\n,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const dataCache = ref(new Map());
  const cacheKey = () => {
    return `${currentPage.value}-${pageSize.value}-${searchKeyword.value || ''}`;
  };

  onMounted(async () => {
    loadRiders(true);
    refreshTimer = setInterval(() => {
      loadRiders(true);
    }, 10000);
  });

  onUnmounted(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  });

  async function loadRiders(forceRefresh = false) {
    loadError.value = '';
    const key = cacheKey();
    if (!forceRefresh && dataCache.value.has(key)) {
      const cached = dataCache.value.get(key);
      riders.value = cached.riders;
      total.value = cached.total;
      return;
    }

    loading.value = true;
    try {
      const params = {
        page: currentPage.value,
        limit: pageSize.value
      };

      if (searchKeyword.value) {
        params.search = searchKeyword.value;
      }

      const { data } = await request.get('/api/riders', { params });
      if (data && data.riders) {
        riders.value = data.riders.map((rider) => ({
          ...rider,
          is_online: rider.is_online === 1 || rider.is_online === true,
          rating: Number(rider.rating || 0),
          rating_count: Number(rider.rating_count || rider.ratingCount || 0)
        }));
        total.value = data.total || 0;
        dataCache.value.set(key, {
          riders: [...riders.value],
          total: data.total || 0
        });
        if (dataCache.value.size > 20) {
          const firstKey = dataCache.value.keys().next().value;
          dataCache.value.delete(firstKey);
        }
      } else {
        riders.value = [];
        total.value = 0;
      }
    } catch (e) {
      loadError.value = e?.response?.data?.error || e?.message || '加载骑手失败，请稍后重试';
      riders.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  function formatTime(timeStr) {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  function formatRating(value) {
    const rating = Number(value || 0);
    return rating > 0 ? rating.toFixed(1) : '0.0';
  }

  const riderActions = useRiderActionHelpers({
    request,
    ElMessage,
    ElMessageBox,
    addDialogVisible,
    newRider,
    inviteDialogVisible,
    creatingInvite,
    inviteForm,
    inviteResult,
    addingRider,
    reorganizing,
    resettingPassword,
    deletingOrders,
    deletingRider,
    detailVisible,
    detail,
    riderEditVisible,
    savingRiderEdit,
    uploadingRiderIdCard,
    riderEditForm,
    reviewManageVisible,
    reviewTargetRider,
    riderReviewsLoading,
    riderReviews,
    riderReviewDialogVisible,
    riderReviewEditingId,
    riderReviewSaving,
    uploadingRiderReviewImage,
    riderReviewForm,
    clearing,
    dataCache,
    loadRiders,
    riders,
    buildEmptyRiderReviewForm,
    normalizeImageArray,
    formatTime,
  });

  const {
    showAddDialog,
    openInviteDialog,
    createInviteLink,
    copyInviteUrl,
    formatInviteDateTime,
    getInviteRemainingUses,
    handleAddRider,
    handleReorganizeIds,
    handleResetPassword,
    handleDeleteRiderOrders,
    handleDeleteRider,
    openDetail,
    openRiderEditDialog,
    handleRiderIdCardChange,
    saveRiderEdit,
    formatOnboardingSource,
    formatOnboardingType,
    openRiderReviewManage,
    loadRiderReviews,
    openCreateRiderReviewDialog,
    openEditRiderReviewDialog,
    handleRiderReviewImageChange,
    removeRiderReviewImage,
    saveRiderReview,
    handleDeleteRiderReview,
    handleClearAllRiders,
    getRankName,
    getRankType,
  } = riderActions;

  function handleSearch() {
    currentPage.value = 1;
    dataCache.value.clear();
    loadRiders();
  }

  function handlePageChange(page) {
    currentPage.value = page;
    loadRiders();
  }

  function handleSizeChange(size) {
    pageSize.value = size;
    currentPage.value = 1;
    dataCache.value.clear();
    loadRiders();
  }

  function handleMobileAction(command) {
    switch (command) {
      case 'reorganize':
        handleReorganizeIds();
        break;
      case 'add':
        showAddDialog();
        break;
      case 'invite':
        openInviteDialog();
        break;
      case 'clear':
        handleClearAllRiders();
        break;
    }
  }

  return {
    isMobile,
    pageSize,
    loading,
    loadError,
    riders,
    currentPage,
    total,
    searchKeyword,
    deletingRider,
    deletingOrders,
    resettingPassword,
    addDialogVisible,
    addingRider,
    reorganizing,
    clearing,
    detailVisible,
    detail,
    riderEditVisible,
    savingRiderEdit,
    uploadingRiderIdCard,
    riderEditForm,
    newRider,
    inviteDialogVisible,
    creatingInvite,
    inviteForm,
    inviteResult,
    reviewManageVisible,
    reviewTargetRider,
    riderReviewsLoading,
    riderReviews,
    riderReviewDialogVisible,
    riderReviewEditingId,
    riderReviewSaving,
    uploadingRiderReviewImage,
    riderReviewForm,
    formatRoleId,
    loadRiders,
    handleSearch,
    handlePageChange,
    handleSizeChange,
    handleMobileAction,
    formatTime,
    formatRating,
    showAddDialog,
    openInviteDialog,
    createInviteLink,
    copyInviteUrl,
    formatInviteDateTime,
    getInviteRemainingUses,
    handleAddRider,
    handleReorganizeIds,
    handleResetPassword,
    handleDeleteRiderOrders,
    handleDeleteRider,
    openDetail,
    openRiderEditDialog,
    handleRiderIdCardChange,
    saveRiderEdit,
    formatOnboardingSource,
    formatOnboardingType,
    openRiderReviewManage,
    loadRiderReviews,
    openCreateRiderReviewDialog,
    openEditRiderReviewDialog,
    handleRiderReviewImageChange,
    removeRiderReviewImage,
    saveRiderReview,
    handleDeleteRiderReview,
    handleClearAllRiders,
    getRankName,
    getRankType
  };
}
