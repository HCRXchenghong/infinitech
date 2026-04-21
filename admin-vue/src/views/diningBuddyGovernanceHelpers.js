import { computed, onMounted, reactive, ref } from 'vue';
import { extractErrorMessage } from '@infinitech/contracts';
import {
  buildDiningBuddyMessageDeletePayload,
  buildDiningBuddyPartyActionPayload,
  buildDiningBuddyPartyListQuery,
  buildDiningBuddyReportActionPayload,
  buildDiningBuddyReportListQuery,
  buildDiningBuddyRestrictionPayload,
  buildDiningBuddyRuntimePayload,
  buildDiningBuddySensitivePayload,
  createDiningBuddyPartyFilterState,
  createDiningBuddyReportFilterState,
  createDiningBuddyRestrictionForm,
  createDiningBuddyRuntimeForm,
  createDiningBuddyRuntimeQuestion,
  createDiningBuddySensitiveForm,
  DINING_BUDDY_PARTY_CATEGORY_OPTIONS,
  DINING_BUDDY_PARTY_STATUS_OPTIONS,
  DINING_BUDDY_REPORT_STATUS_OPTIONS,
  DINING_BUDDY_RESTRICTION_TYPE_OPTIONS,
  extractDiningBuddyAuditLogList,
  extractDiningBuddyMessageList,
  extractDiningBuddyPartyDetail,
  extractDiningBuddyPartyList,
  extractDiningBuddyReportList,
  extractDiningBuddyRestrictionList,
  extractDiningBuddyRuntimeSettings,
  extractDiningBuddySensitiveWordList,
  getDiningBuddyPartyActionLabel,
  getDiningBuddyReportActionLabel,
  getDiningBuddyRestrictionDialogTitle,
  getDiningBuddySensitiveDialogTitle,
  sortDiningBuddyRuntimeCategories,
  validateDiningBuddyRestrictionForm,
  validateDiningBuddyRuntimeForm,
  validateDiningBuddySensitiveForm,
} from '@infinitech/admin-core';

function buildRefreshParams(forceRefresh = false) {
  return forceRefresh ? { _t: Date.now() } : undefined;
}

export function useDiningBuddyGovernancePage({ request, ElMessage, ElMessageBox }) {
  const activeTab = ref('runtime');
  const pageLoading = ref(false);
  const pageError = ref('');

  const runtimeLoading = ref(false);
  const runtimeSaving = ref(false);
  const runtimeForm = reactive(createDiningBuddyRuntimeForm());

  const partiesLoading = ref(false);
  const parties = ref([]);
  const partyFilters = reactive(createDiningBuddyPartyFilterState());

  const reportsLoading = ref(false);
  const reports = ref([]);
  const reportFilters = reactive(createDiningBuddyReportFilterState());

  const sensitiveLoading = ref(false);
  const sensitiveWords = ref([]);
  const sensitiveDialogVisible = ref(false);
  const sensitiveSaving = ref(false);
  const sensitiveForm = reactive(createDiningBuddySensitiveForm());

  const restrictionsLoading = ref(false);
  const restrictions = ref([]);
  const restrictionDialogVisible = ref(false);
  const restrictionSaving = ref(false);
  const restrictionForm = reactive(createDiningBuddyRestrictionForm());

  const auditLoading = ref(false);
  const auditLogs = ref([]);

  const partyDrawerVisible = ref(false);
  const partyDetail = ref(null);

  const messageDrawerVisible = ref(false);
  const activePartyForMessages = ref(null);
  const messagesLoading = ref(false);
  const messages = ref([]);

  const sortedRuntimeCategories = computed(() =>
    sortDiningBuddyRuntimeCategories(runtimeForm.categories),
  );

  function handleTaskError(error, fallbackMessage, options = {}) {
    const message = extractErrorMessage(error, fallbackMessage);
    if (options.notify !== false) {
      ElMessage.error(message);
    }
    if (options.throwOnError) {
      throw error;
    }
    return message;
  }

  function applyRuntimeSettings(payload = {}) {
    Object.assign(runtimeForm, createDiningBuddyRuntimeForm(payload));
  }

  function addQuestion() {
    runtimeForm.questions.push(createDiningBuddyRuntimeQuestion({
      question: '新的问卷题目',
      options: [{ text: '选项一', icon: '✨' }],
    }));
  }

  function removeQuestion(index) {
    runtimeForm.questions.splice(index, 1);
  }

  function addQuestionOption(index) {
    runtimeForm.questions[index]?.options?.push(createDiningBuddyRuntimeQuestion({
      options: [{ text: '', icon: '' }],
    }).options[0]);
  }

  function removeQuestionOption(questionIndex, optionIndex) {
    runtimeForm.questions[questionIndex]?.options?.splice(optionIndex, 1);
  }

  async function loadRuntimeSettings(forceRefresh = false, options = {}) {
    runtimeLoading.value = true;
    try {
      const { data } = await request.get('/api/dining-buddy-settings', {
        params: buildRefreshParams(forceRefresh),
      });
      applyRuntimeSettings(extractDiningBuddyRuntimeSettings(data));
    } catch (error) {
      const message = handleTaskError(error, '加载同频饭友运行配置失败', options);
      if (!options.throwOnError) {
        pageError.value = message;
      }
    } finally {
      runtimeLoading.value = false;
    }
  }

  async function saveRuntimeSettings() {
    const validationMessage = validateDiningBuddyRuntimeForm(runtimeForm);
    if (validationMessage) {
      ElMessage.warning(validationMessage);
      return;
    }

    try {
      await ElMessageBox.confirm(
        '保存后前台问卷、分类与限流规则会立即生效，确认继续吗？',
        '确认保存',
        { type: 'warning' },
      );
    } catch (_error) {
      return;
    }

    runtimeSaving.value = true;
    try {
      const payload = buildDiningBuddyRuntimePayload(runtimeForm);
      const { data } = await request.post('/api/dining-buddy-settings', payload);
      applyRuntimeSettings(extractDiningBuddyRuntimeSettings(data || payload));
      ElMessage.success('同频饭友运行配置已保存');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存同频饭友运行配置失败'));
    } finally {
      runtimeSaving.value = false;
    }
  }

  async function loadParties(forceRefresh = false, options = {}) {
    partiesLoading.value = true;
    try {
      const { data } = await request.get('/api/admin/dining-buddy/parties', {
        params: {
          ...buildDiningBuddyPartyListQuery(partyFilters),
          ...buildRefreshParams(forceRefresh),
        },
      });
      parties.value = extractDiningBuddyPartyList(data);
    } catch (error) {
      handleTaskError(error, '加载组局列表失败', options);
    } finally {
      partiesLoading.value = false;
    }
  }

  async function openPartyDrawer(row) {
    partyDrawerVisible.value = true;
    try {
      const { data } = await request.get(
        `/api/admin/dining-buddy/parties/${encodeURIComponent(row.id)}`,
      );
      partyDetail.value = extractDiningBuddyPartyDetail(data, row);
    } catch (error) {
      partyDetail.value = extractDiningBuddyPartyDetail(null, row);
      ElMessage.error(extractErrorMessage(error, '加载组局详情失败'));
    }
  }

  async function loadMessages(partyId, forceRefresh = false, options = {}) {
    if (!partyId) return;

    messagesLoading.value = true;
    try {
      const { data } = await request.get(
        `/api/admin/dining-buddy/parties/${encodeURIComponent(partyId)}/messages`,
        { params: buildRefreshParams(forceRefresh) },
      );
      messages.value = extractDiningBuddyMessageList(data);
    } catch (error) {
      handleTaskError(error, '加载消息列表失败', options);
    } finally {
      messagesLoading.value = false;
    }
  }

  async function openMessageDrawer(row) {
    activePartyForMessages.value = row;
    messageDrawerVisible.value = true;
    await loadMessages(row.id, true);
  }

  async function changePartyStatus(row, action) {
    const actionLabel = getDiningBuddyPartyActionLabel(action);
    let reason = '';

    try {
      const promptResult = await ElMessageBox.prompt(
        `请输入${actionLabel}组局原因`,
        `${actionLabel}组局`,
        {
          inputValue: '',
          confirmButtonText: '确认',
          cancelButtonText: '取消',
        },
      );
      reason = promptResult.value || '';
    } catch (_error) {
      return;
    }

    try {
      await request.post(
        `/api/admin/dining-buddy/parties/${encodeURIComponent(row.id)}/${action}`,
        buildDiningBuddyPartyActionPayload(reason),
      );
      ElMessage.success(`组局已${actionLabel}`);
      await Promise.all([loadParties(true), loadAuditLogs(true)]);
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, `${actionLabel}组局失败`));
    }
  }

  async function loadReports(forceRefresh = false, options = {}) {
    reportsLoading.value = true;
    try {
      const { data } = await request.get('/api/admin/dining-buddy/reports', {
        params: {
          ...buildDiningBuddyReportListQuery(reportFilters),
          ...buildRefreshParams(forceRefresh),
        },
      });
      reports.value = extractDiningBuddyReportList(data);
    } catch (error) {
      handleTaskError(error, '加载举报列表失败', options);
    } finally {
      reportsLoading.value = false;
    }
  }

  function pickResolveAction() {
    return new Promise((resolve) => {
      ElMessageBox.prompt(
        '请输入处理动作标识，如 close_party / delete_message / mute_user',
        '处理动作',
        {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
        },
      )
        .then((result) => resolve(result.value || 'manual_review'))
        .catch(() => resolve(''));
    });
  }

  async function handleReport(row, action) {
    const actionLabel = getDiningBuddyReportActionLabel(action);
    let resolutionNote = '';
    let resolutionAction = row.resolution_action || '';

    try {
      const promptResult = await ElMessageBox.prompt(
        action === 'resolve' ? '请输入处理说明' : '请输入驳回原因',
        `${actionLabel}举报`,
        {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
        },
      );
      resolutionNote = promptResult.value || '';
    } catch (_error) {
      return;
    }

    if (action === 'resolve') {
      resolutionAction = await pickResolveAction();
      if (!resolutionAction) {
        return;
      }
    }

    try {
      await request.post(
        `/api/admin/dining-buddy/reports/${encodeURIComponent(row.id)}/${action}`,
        buildDiningBuddyReportActionPayload(action, {
          resolutionNote,
          resolutionAction,
        }),
      );
      ElMessage.success(`举报已${actionLabel}`);
      await Promise.all([loadReports(true), loadAuditLogs(true)]);
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '处理举报失败'));
    }
  }

  async function loadSensitiveWords(forceRefresh = false, options = {}) {
    sensitiveLoading.value = true;
    try {
      const { data } = await request.get('/api/admin/dining-buddy/sensitive-words', {
        params: buildRefreshParams(forceRefresh),
      });
      sensitiveWords.value = extractDiningBuddySensitiveWordList(data);
    } catch (error) {
      handleTaskError(error, '加载敏感词失败', options);
    } finally {
      sensitiveLoading.value = false;
    }
  }

  function openSensitiveDialog(row = null) {
    Object.assign(sensitiveForm, createDiningBuddySensitiveForm(row || {}));
    sensitiveDialogVisible.value = true;
  }

  async function saveSensitiveWord() {
    const validationMessage = validateDiningBuddySensitiveForm(sensitiveForm);
    if (validationMessage) {
      ElMessage.warning(validationMessage);
      return;
    }

    sensitiveSaving.value = true;
    try {
      if (sensitiveForm.id) {
        await request.put(
          `/api/admin/dining-buddy/sensitive-words/${encodeURIComponent(sensitiveForm.id)}`,
          buildDiningBuddySensitivePayload(sensitiveForm),
        );
      } else {
        await request.post(
          '/api/admin/dining-buddy/sensitive-words',
          buildDiningBuddySensitivePayload(sensitiveForm),
        );
      }
      sensitiveDialogVisible.value = false;
      ElMessage.success('敏感词已保存');
      await Promise.all([loadSensitiveWords(true), loadAuditLogs(true)]);
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存敏感词失败'));
    } finally {
      sensitiveSaving.value = false;
    }
  }

  async function deleteSensitiveWord(row) {
    try {
      await ElMessageBox.confirm(
        '删除敏感词会立即影响前台内容校验，确认继续吗？',
        '确认删除',
        { type: 'warning' },
      );
    } catch (_error) {
      return;
    }

    try {
      await request.delete(
        `/api/admin/dining-buddy/sensitive-words/${encodeURIComponent(row.id)}`,
      );
      ElMessage.success('敏感词已删除');
      await Promise.all([loadSensitiveWords(true), loadAuditLogs(true)]);
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '删除敏感词失败'));
    }
  }

  async function loadRestrictions(forceRefresh = false, options = {}) {
    restrictionsLoading.value = true;
    try {
      const { data } = await request.get('/api/admin/dining-buddy/user-restrictions', {
        params: buildRefreshParams(forceRefresh),
      });
      restrictions.value = extractDiningBuddyRestrictionList(data);
    } catch (error) {
      handleTaskError(error, '加载用户限制失败', options);
    } finally {
      restrictionsLoading.value = false;
    }
  }

  function openRestrictionDialog(row = null) {
    Object.assign(restrictionForm, createDiningBuddyRestrictionForm(row || {}));
    restrictionDialogVisible.value = true;
  }

  async function saveRestriction() {
    const validationMessage = validateDiningBuddyRestrictionForm(restrictionForm);
    if (validationMessage) {
      ElMessage.warning(validationMessage);
      return;
    }

    restrictionSaving.value = true;
    try {
      await request.post(
        '/api/admin/dining-buddy/user-restrictions',
        buildDiningBuddyRestrictionPayload(restrictionForm),
      );
      restrictionDialogVisible.value = false;
      ElMessage.success('用户限制已保存');
      await Promise.all([loadRestrictions(true), loadAuditLogs(true)]);
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存用户限制失败'));
    } finally {
      restrictionSaving.value = false;
    }
  }

  async function loadAuditLogs(forceRefresh = false, options = {}) {
    auditLoading.value = true;
    try {
      const { data } = await request.get('/api/admin/dining-buddy/audit-logs', {
        params: buildRefreshParams(forceRefresh),
      });
      auditLogs.value = extractDiningBuddyAuditLogList(data);
    } catch (error) {
      handleTaskError(error, '加载审计日志失败', options);
    } finally {
      auditLoading.value = false;
    }
  }

  async function deleteMessage(row) {
    let reason = '';

    try {
      const promptResult = await ElMessageBox.prompt('请输入删除消息原因', '删除消息', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
      });
      reason = promptResult.value || '';
    } catch (_error) {
      return;
    }

    try {
      await request.delete(
        `/api/admin/dining-buddy/messages/${encodeURIComponent(row.id)}`,
        { data: buildDiningBuddyMessageDeletePayload(reason) },
      );
      ElMessage.success('消息已删除');
      await Promise.all([
        loadMessages(activePartyForMessages.value?.id, true),
        loadReports(true),
        loadAuditLogs(true),
      ]);
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '删除消息失败'));
    }
  }

  async function loadAll(forceRefresh = false) {
    pageLoading.value = true;
    pageError.value = '';

    const results = await Promise.allSettled([
      loadRuntimeSettings(forceRefresh, { notify: false, throwOnError: true }),
      loadParties(forceRefresh, { notify: false, throwOnError: true }),
      loadReports(forceRefresh, { notify: false, throwOnError: true }),
      loadSensitiveWords(forceRefresh, { notify: false, throwOnError: true }),
      loadRestrictions(forceRefresh, { notify: false, throwOnError: true }),
      loadAuditLogs(forceRefresh, { notify: false, throwOnError: true }),
    ]);

    if (results.some((item) => item.status === 'rejected')) {
      pageError.value = '部分同频饭友治理数据加载失败，请稍后重试';
    }

    pageLoading.value = false;
  }

  onMounted(() => {
    void loadAll();
  });

  return {
    activePartyForMessages,
    activeTab,
    addQuestion,
    addQuestionOption,
    auditLoading,
    auditLogs,
    changePartyStatus,
    deleteMessage,
    deleteSensitiveWord,
    DINING_BUDDY_PARTY_CATEGORY_OPTIONS,
    DINING_BUDDY_PARTY_STATUS_OPTIONS,
    DINING_BUDDY_REPORT_STATUS_OPTIONS,
    DINING_BUDDY_RESTRICTION_TYPE_OPTIONS,
    getDiningBuddyRestrictionDialogTitle,
    getDiningBuddySensitiveDialogTitle,
    handleReport,
    loadAll,
    loadAuditLogs,
    loadMessages,
    loadParties,
    loadReports,
    loadRestrictions,
    loadSensitiveWords,
    loadRuntimeSettings,
    messageDrawerVisible,
    messages,
    messagesLoading,
    openMessageDrawer,
    openPartyDrawer,
    openRestrictionDialog,
    openSensitiveDialog,
    pageError,
    pageLoading,
    parties,
    partiesLoading,
    partyDetail,
    partyDrawerVisible,
    partyFilters,
    removeQuestion,
    removeQuestionOption,
    reportFilters,
    reports,
    reportsLoading,
    restrictionDialogVisible,
    restrictionForm,
    restrictions,
    restrictionsLoading,
    restrictionSaving,
    runtimeForm,
    runtimeLoading,
    runtimeSaving,
    saveRestriction,
    saveRuntimeSettings,
    saveSensitiveWord,
    sensitiveDialogVisible,
    sensitiveForm,
    sensitiveLoading,
    sensitiveSaving,
    sensitiveWords,
    sortedRuntimeCategories,
  };
}
