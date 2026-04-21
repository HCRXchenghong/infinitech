import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { ElMessage } from 'element-plus';
import {
  buildAdminOfficialSiteCooperationListQuery,
  buildAdminOfficialSiteCooperationUpdatePayload,
  buildAdminOfficialSiteExposureListQuery,
  buildAdminOfficialSiteExposureUpdatePayload,
  buildAdminOfficialSiteSupportListQuery,
  buildAdminOfficialSiteSupportReplyPayload,
  buildAdminOfficialSiteSupportSessionPayload,
  buildAdminOfficialSiteSupportSummaryCards,
  createAdminOfficialSiteCooperationFilters,
  createAdminOfficialSiteExposureDraft,
  createAdminOfficialSiteExposureFilters,
  createAdminOfficialSiteSupportFilters,
  mergeOfficialSiteSupportMessages,
  mergeOfficialSiteSupportSession,
  reconcileOfficialSiteSupportSelection,
  upsertOfficialSiteSupportSessions,
} from '@infinitech/admin-core';
import socketService from '@/utils/socket';
import {
  appendAdminOfficialSiteSupportMessage,
  extractErrorMessage,
  getAdminOfficialSiteSupportMessages,
  listAdminOfficialSiteCooperations,
  listAdminOfficialSiteExposures,
  listAdminOfficialSiteSupportSessions,
  updateAdminOfficialSiteCooperation,
  updateAdminOfficialSiteExposure,
  updateAdminOfficialSiteSupportSession,
} from '@/utils/officialSiteApi';
import {
  OFFICIAL_SITE_SUPPORT_MESSAGE_EVENT,
  OFFICIAL_SITE_SUPPORT_SESSION_EVENT,
} from '@/utils/officialSiteRealtime';

const POLL_INTERVAL_MS = 20000;
const READ_SYNC_DELAY_MS = 320;
const REFRESH_DEBOUNCE_MS = 220;
const NOTIFY_NAMESPACE = '/notify';

export function useOfficialSiteCenterPage() {
  const activeTab = ref('support');

  const supportLoading = ref(false);
  const supportMessagesLoading = ref(false);
  const supportSaving = ref(false);
  const supportSending = ref(false);
  const supportRealtimeConnected = ref(false);
  const supportSessions = ref([]);
  const selectedSupportId = ref('');
  const selectedSupportSession = ref(null);
  const supportMessages = ref([]);
  const supportReply = ref('');
  const supportFilters = reactive(createAdminOfficialSiteSupportFilters());

  const exposureLoading = ref(false);
  const exposureSaving = ref(false);
  const exposures = ref([]);
  const exposureFilters = reactive(createAdminOfficialSiteExposureFilters());
  const exposureDialogVisible = ref(false);
  const exposureDraft = reactive(createAdminOfficialSiteExposureDraft());

  const cooperationLoading = ref(false);
  const cooperations = ref([]);
  const cooperationFilters = reactive(createAdminOfficialSiteCooperationFilters());

  const supportSummaryCards = computed(() =>
    buildAdminOfficialSiteSupportSummaryCards({
      sessions: supportSessions.value,
      realtimeConnected: supportRealtimeConnected.value,
      selectedSession: selectedSupportSession.value,
    }),
  );

  let supportPollTimer = 0;
  let supportReadSyncTimer = 0;
  let supportRefreshTimer = 0;
  let supportNotifySocket = null;

  onMounted(() => {
    refreshCurrent();
    startSupportPolling();
    void connectSupportRealtime();
  });

  onBeforeUnmount(() => {
    stopSupportPolling();
    clearSupportReadSyncTimer();
    clearSupportRefreshTimer();
    disconnectSupportRealtime();
  });

  watch(activeTab, (tab) => {
    refreshCurrent();
    if (tab === 'support') {
      startSupportPolling();
      return;
    }
    stopSupportPolling();
  });

  function notifyError(error, fallback) {
    ElMessage.error(extractErrorMessage(error, fallback));
  }

  function refreshCurrent() {
    if (activeTab.value === 'support') {
      void loadSupportSessions();
      return;
    }
    if (activeTab.value === 'exposures') {
      void loadExposures();
      return;
    }
    void loadCooperations();
  }

  function startSupportPolling() {
    stopSupportPolling();
    supportPollTimer = window.setInterval(() => {
      if (activeTab.value !== 'support') return;
      void loadSupportSessions(true);
      if (selectedSupportId.value) {
        void loadSelectedSupportMessages(true);
      }
    }, POLL_INTERVAL_MS);
  }

  function stopSupportPolling() {
    if (supportPollTimer) {
      window.clearInterval(supportPollTimer);
      supportPollTimer = 0;
    }
  }

  async function connectSupportRealtime() {
    try {
      supportNotifySocket = await socketService.connect(NOTIFY_NAMESPACE);
      if (!supportNotifySocket) {
        supportRealtimeConnected.value = false;
        return;
      }

      supportRealtimeConnected.value = Boolean(supportNotifySocket.connected);
      supportNotifySocket.on('connect', handleSupportSocketConnect);
      supportNotifySocket.on('disconnect', handleSupportSocketDisconnect);
      supportNotifySocket.on('connect_error', handleSupportSocketError);
      socketService.on(
        OFFICIAL_SITE_SUPPORT_MESSAGE_EVENT,
        handleSupportRealtimeMessage,
        NOTIFY_NAMESPACE,
      );
      socketService.on(
        OFFICIAL_SITE_SUPPORT_SESSION_EVENT,
        handleSupportRealtimeSession,
        NOTIFY_NAMESPACE,
      );
    } catch (_error) {
      supportRealtimeConnected.value = false;
    }
  }

  function disconnectSupportRealtime() {
    socketService.off(
      OFFICIAL_SITE_SUPPORT_MESSAGE_EVENT,
      handleSupportRealtimeMessage,
      NOTIFY_NAMESPACE,
    );
    socketService.off(
      OFFICIAL_SITE_SUPPORT_SESSION_EVENT,
      handleSupportRealtimeSession,
      NOTIFY_NAMESPACE,
    );
    if (supportNotifySocket) {
      supportNotifySocket.off('connect', handleSupportSocketConnect);
      supportNotifySocket.off('disconnect', handleSupportSocketDisconnect);
      supportNotifySocket.off('connect_error', handleSupportSocketError);
      supportNotifySocket = null;
    }
    socketService.disconnect(NOTIFY_NAMESPACE);
    supportRealtimeConnected.value = false;
  }

  function handleSupportSocketConnect() {
    supportRealtimeConnected.value = true;
  }

  function handleSupportSocketDisconnect() {
    supportRealtimeConnected.value = false;
  }

  function handleSupportSocketError() {
    supportRealtimeConnected.value = false;
  }

  function clearSupportReadSyncTimer() {
    if (supportReadSyncTimer) {
      window.clearTimeout(supportReadSyncTimer);
      supportReadSyncTimer = 0;
    }
  }

  function clearSupportRefreshTimer() {
    if (supportRefreshTimer) {
      window.clearTimeout(supportRefreshTimer);
      supportRefreshTimer = 0;
    }
  }

  function scheduleSupportSessionsRefresh() {
    clearSupportRefreshTimer();
    supportRefreshTimer = window.setTimeout(() => {
      supportRefreshTimer = 0;
      if (activeTab.value === 'support') {
        void loadSupportSessions(true);
      }
    }, REFRESH_DEBOUNCE_MS);
  }

  function scheduleSelectedSupportSync() {
    if (!selectedSupportId.value || activeTab.value !== 'support') {
      return;
    }
    clearSupportReadSyncTimer();
    supportReadSyncTimer = window.setTimeout(() => {
      supportReadSyncTimer = 0;
      void loadSelectedSupportMessages(true);
    }, READ_SYNC_DELAY_MS);
  }

  function handleSupportRealtimeMessage(payload) {
    const sessionPayload = payload?.session || null;
    if (!sessionPayload?.id) {
      return;
    }

    upsertSupportSession(sessionPayload);
    if (selectedSupportId.value === sessionPayload.id) {
      selectedSupportSession.value = mergeOfficialSiteSupportSession(
        selectedSupportSession.value,
        sessionPayload,
      );
      if (payload?.message) {
        supportMessages.value = mergeOfficialSiteSupportMessages(
          supportMessages.value,
          [payload.message],
        );
      }
      if (payload?.message?.sender_type === 'visitor') {
        scheduleSelectedSupportSync();
      }
    }

    scheduleSupportSessionsRefresh();
  }

  function handleSupportRealtimeSession(payload) {
    const sessionPayload = payload?.session || null;
    if (!sessionPayload?.id) {
      return;
    }

    upsertSupportSession(sessionPayload);
    if (selectedSupportId.value === sessionPayload.id) {
      selectedSupportSession.value = mergeOfficialSiteSupportSession(
        selectedSupportSession.value,
        sessionPayload,
      );
    }

    scheduleSupportSessionsRefresh();
  }

  async function loadSupportSessions(silent = false) {
    if (!silent) {
      supportLoading.value = true;
    }
    try {
      const data = await listAdminOfficialSiteSupportSessions({
        ...buildAdminOfficialSiteSupportListQuery(supportFilters),
      });
      supportSessions.value = data.records;

      const nextSelection = reconcileOfficialSiteSupportSelection(
        supportSessions.value,
        selectedSupportId.value,
        selectedSupportSession.value,
      );
      selectedSupportId.value = nextSelection.selectedId;
      selectedSupportSession.value = nextSelection.selectedSession;
      if (nextSelection.shouldClearMessages) {
        supportMessages.value = [];
      }
      if (nextSelection.shouldLoadMessages) {
        await loadSelectedSupportMessages(true);
      }
    } catch (error) {
      if (!silent) {
        notifyError(error, '官网客服会话加载失败');
      }
    } finally {
      supportLoading.value = false;
    }
  }

  async function selectSupportSession(id) {
    if (!id || id === selectedSupportId.value) return;
    selectedSupportId.value = id;
    await loadSelectedSupportMessages();
  }

  async function loadSelectedSupportMessages(silent = false) {
    if (!selectedSupportId.value) return;
    if (!silent) {
      supportMessagesLoading.value = true;
    }
    try {
      const data = await getAdminOfficialSiteSupportMessages(selectedSupportId.value);
      selectedSupportSession.value = data?.session || null;
      supportMessages.value = data?.messages || [];
      upsertSupportSession(selectedSupportSession.value);
    } catch (error) {
      if (!silent) {
        notifyError(error, '官网客服消息加载失败');
      }
    } finally {
      supportMessagesLoading.value = false;
    }
  }

  async function saveSupportSession() {
    if (!selectedSupportSession.value?.id) return;
    supportSaving.value = true;
    try {
      const data = await updateAdminOfficialSiteSupportSession(
        selectedSupportSession.value.id,
        {
          ...buildAdminOfficialSiteSupportSessionPayload(
            selectedSupportSession.value,
          ),
        },
      );
      selectedSupportSession.value = {
        ...selectedSupportSession.value,
        ...data,
      };
      await loadSupportSessions(true);
      ElMessage.success('会话状态已保存');
    } catch (error) {
      notifyError(error, '保存会话失败');
    } finally {
      supportSaving.value = false;
    }
  }

  async function sendSupportReply() {
    const content = supportReply.value.trim();
    if (!content || !selectedSupportId.value) {
      return;
    }
    supportSending.value = true;
    try {
      await appendAdminOfficialSiteSupportMessage(
        selectedSupportId.value,
        buildAdminOfficialSiteSupportReplyPayload(content),
      );
      supportReply.value = '';
      await loadSelectedSupportMessages(true);
      await loadSupportSessions(true);
      ElMessage.success('回复已发送');
    } catch (error) {
      notifyError(error, '发送回复失败');
    } finally {
      supportSending.value = false;
    }
  }

  async function loadExposures() {
    exposureLoading.value = true;
    try {
      const data = await listAdminOfficialSiteExposures({
        ...buildAdminOfficialSiteExposureListQuery(exposureFilters),
      });
      exposures.value = data.records;
    } catch (error) {
      notifyError(error, '曝光记录加载失败');
    } finally {
      exposureLoading.value = false;
    }
  }

  function openExposureDialog(row) {
    Object.assign(exposureDraft, createAdminOfficialSiteExposureDraft(row));
    exposureDialogVisible.value = true;
  }

  async function saveExposure() {
    if (!exposureDraft.id) return;
    exposureSaving.value = true;
    try {
      await updateAdminOfficialSiteExposure(
        exposureDraft.id,
        buildAdminOfficialSiteExposureUpdatePayload(exposureDraft),
      );
      exposureDialogVisible.value = false;
      await loadExposures();
      ElMessage.success('曝光处理结果已保存');
    } catch (error) {
      notifyError(error, '曝光处理保存失败');
    } finally {
      exposureSaving.value = false;
    }
  }

  async function loadCooperations() {
    cooperationLoading.value = true;
    try {
      const data = await listAdminOfficialSiteCooperations({
        ...buildAdminOfficialSiteCooperationListQuery(cooperationFilters),
      });
      cooperations.value = data.records;
    } catch (error) {
      notifyError(error, '官网商务合作加载失败');
    } finally {
      cooperationLoading.value = false;
    }
  }

  async function saveCooperation(row) {
    try {
      await updateAdminOfficialSiteCooperation(
        row.id,
        buildAdminOfficialSiteCooperationUpdatePayload(row),
      );
      ElMessage.success('合作线索状态已更新');
    } catch (error) {
      notifyError(error, '更新失败');
      await loadCooperations();
    }
  }

  function upsertSupportSession(payload) {
    supportSessions.value = upsertOfficialSiteSupportSessions(
      supportSessions.value,
      payload,
    );
  }

  return {
    activeTab,
    cooperationFilters,
    cooperationLoading,
    cooperations,
    exposureDialogVisible,
    exposureDraft,
    exposureFilters,
    exposureLoading,
    exposureSaving,
    exposures,
    loadCooperations,
    loadExposures,
    loadSelectedSupportMessages,
    loadSupportSessions,
    openExposureDialog,
    refreshCurrent,
    saveCooperation,
    saveExposure,
    saveSupportSession,
    selectedSupportId,
    selectedSupportSession,
    sendSupportReply,
    supportFilters,
    supportLoading,
    supportMessages,
    supportMessagesLoading,
    supportRealtimeConnected,
    supportReply,
    supportSaving,
    supportSending,
    supportSessions,
    supportSummaryCards,
    selectSupportSession,
  };
}
