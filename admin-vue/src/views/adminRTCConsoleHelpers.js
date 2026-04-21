import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  buildAdminRTCCallAuditQuery,
  createAdminRTCCallAuditSummary,
  createAdminRTCCallForm,
  createAdminRTCTargetSearchForm,
  extractRTCCallAuditPage,
  filterAdminRTCTargets,
  formatAdminCommunicationAuditDateTime,
  formatAdminRTCCallDuration,
  getAdminCommunicationRoleLabel,
  getAdminRTCCallComplaintLabel,
  getAdminRTCCallComplaintTagType,
  getAdminRTCCallStatusLabel,
  getAdminRTCCallStatusTagType,
} from '@infinitech/admin-core';
import { extractErrorMessage } from '@infinitech/contracts';

import {
  acceptAdminRTCCall,
  adminRTCState,
  cancelAdminRTCCall,
  canStartAdminRTCCall,
  dismissAdminRTCCallDialog,
  endAdminRTCCall,
  ensureAdminRTCBridge,
  isFinalStatus,
  isWaitingStatus,
  rejectAdminRTCCall,
  searchAdminRTCTargets,
  startAdminRTCCall,
} from '@/utils/adminRtc';

export function useAdminRTCConsolePage({ request, ElMessage }) {
  const router = useRouter();

  const searchForm = reactive(createAdminRTCTargetSearchForm());
  const callForm = reactive(createAdminRTCCallForm());

  const targetsLoading = ref(false);
  const targetsError = ref('');
  const targets = ref([]);
  const selectedTarget = ref(null);
  const startingCall = ref(false);

  const recentAudits = ref([]);
  const auditsLoading = ref(false);
  const auditsError = ref('');
  const auditSummary = reactive(createAdminRTCCallAuditSummary());

  const filteredTargets = computed(() => filterAdminRTCTargets(targets.value, searchForm.role));
  const canCallSelected = computed(() => canStartAdminRTCCall(selectedTarget.value || {}));
  const currentCallActive = computed(() =>
    Boolean(adminRTCState.callId) && !isFinalStatus(adminRTCState.status),
  );
  const currentTargetText = computed(() =>
    adminRTCState.targetPhone || adminRTCState.targetName || adminRTCState.targetId || '--',
  );
  const currentBizText = computed(() =>
    [adminRTCState.conversationId || '--', adminRTCState.orderId || '--'].join(' / '),
  );
  const showAccept = computed(() =>
    adminRTCState.mode === 'incoming' && isWaitingStatus(adminRTCState.status),
  );
  const showReject = computed(() =>
    adminRTCState.mode === 'incoming' && isWaitingStatus(adminRTCState.status),
  );
  const showCancel = computed(() =>
    adminRTCState.mode === 'outgoing' && isWaitingStatus(adminRTCState.status),
  );
  const showEnd = computed(() => adminRTCState.status === 'accepted');
  const canCloseCurrentCall = computed(() =>
    !adminRTCState.callId || isFinalStatus(adminRTCState.status),
  );

  function selectTarget(target) {
    selectedTarget.value = target;
    callForm.conversationId = target.chatId || '';
  }

  async function searchTargets() {
    if (!searchForm.keyword) {
      targets.value = [];
      selectedTarget.value = null;
      targetsError.value = '';
      return;
    }

    targetsLoading.value = true;
    targetsError.value = '';
    try {
      const list = await searchAdminRTCTargets(searchForm.keyword);
      targets.value = filterAdminRTCTargets(list);

      if (targets.value.length > 0) {
        selectTarget(targets.value[0]);
      } else {
        selectedTarget.value = null;
      }
    } catch (error) {
      targets.value = [];
      selectedTarget.value = null;
      targetsError.value = extractErrorMessage(error, '搜索 RTC 联系人失败');
      ElMessage.error(targetsError.value);
    } finally {
      targetsLoading.value = false;
    }
  }

  async function loadRecentAudits() {
    auditsLoading.value = true;
    auditsError.value = '';
    try {
      const { data } = await request.get('/api/rtc-call-audits', {
        params: buildAdminRTCCallAuditQuery({}, { page: 1, limit: 8 }),
      });
      const payload = extractRTCCallAuditPage(data);
      recentAudits.value = payload.items;
      Object.assign(auditSummary, createAdminRTCCallAuditSummary(payload.summary));
    } catch (error) {
      recentAudits.value = [];
      Object.assign(auditSummary, createAdminRTCCallAuditSummary());
      auditsError.value = extractErrorMessage(error, '加载 RTC 通话记录失败');
      ElMessage.error(auditsError.value);
    } finally {
      auditsLoading.value = false;
    }
  }

  async function startCall() {
    if (!selectedTarget.value) {
      ElMessage.warning('请先选择联系人');
      return;
    }

    startingCall.value = true;
    try {
      await startAdminRTCCall({
        role: selectedTarget.value.role,
        chatId: callForm.conversationId || selectedTarget.value.chatId,
        conversationId: callForm.conversationId || selectedTarget.value.chatId,
        targetId: selectedTarget.value.id || selectedTarget.value.chatId,
        targetLegacyId: selectedTarget.value.legacyId,
        phone: selectedTarget.value.phone,
        name: selectedTarget.value.name,
        orderId: callForm.orderId,
        entryPoint: callForm.entryPoint || 'admin_rtc_console',
        scene: callForm.scene || 'admin_support',
      });
      ElMessage.success('RTC 呼叫已发起');
      await loadRecentAudits();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '发起 RTC 呼叫失败'));
    } finally {
      startingCall.value = false;
    }
  }

  async function handleAccept() {
    try {
      await acceptAdminRTCCall();
      ElMessage.success('已接听 RTC 通话');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '接听 RTC 通话失败'));
    }
  }

  async function handleReject() {
    try {
      await rejectAdminRTCCall();
      ElMessage.success('已拒绝 RTC 来电');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '拒绝 RTC 来电失败'));
    }
  }

  async function handleCancel() {
    try {
      await cancelAdminRTCCall();
      ElMessage.success('已取消 RTC 呼叫');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '取消 RTC 呼叫失败'));
    }
  }

  async function handleEnd() {
    try {
      await endAdminRTCCall();
      ElMessage.success('RTC 通话已结束');
      await loadRecentAudits();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '结束 RTC 通话失败'));
    }
  }

  function handleCloseCall() {
    if (!dismissAdminRTCCallDialog()) {
      ElMessage.warning('请先结束当前 RTC 通话');
      return;
    }
    ElMessage.success('已关闭当前通话状态');
  }

  function goToAudits() {
    router.push('/rtc-call-audits');
  }

  function goToChatConsole() {
    router.push('/support-chat');
  }

  onMounted(() => {
    void ensureAdminRTCBridge();
    void loadRecentAudits();
  });

  return {
    adminRTCState,
    auditsError,
    auditsLoading,
    auditSummary,
    callForm,
    canCallSelected,
    canCloseCurrentCall,
    complaintLabel: getAdminRTCCallComplaintLabel,
    complaintTagType: getAdminRTCCallComplaintTagType,
    currentBizText,
    currentCallActive,
    currentTargetText,
    filteredTargets,
    formatDateTime: formatAdminCommunicationAuditDateTime,
    formatDuration: formatAdminRTCCallDuration,
    goToAudits,
    goToChatConsole,
    handleAccept,
    handleCancel,
    handleCloseCall,
    handleEnd,
    handleReject,
    loadRecentAudits,
    recentAudits,
    roleLabel: getAdminCommunicationRoleLabel,
    searchForm,
    searchTargets,
    selectTarget,
    selectedTarget,
    showAccept,
    showCancel,
    showEnd,
    showReject,
    startCall,
    startingCall,
    statusLabel: getAdminRTCCallStatusLabel,
    statusTagType: getAdminRTCCallStatusTagType,
    targetsError,
    targetsLoading,
  };
}
