import { useRiderReviewActionHelpers } from './ridersReviewActionHelpers';
import { extractTemporaryCredential } from '@infinitech/admin-core';
import {
  createDefaultInviteLinkForm,
  createEmptyInviteLinkResult,
  createOnboardingInviteApi,
  getInviteRemainingUses as resolveInviteRemainingUses,
} from '@infinitech/client-sdk';
import { extractEnvelopeData, extractErrorMessage, extractUploadAsset } from '@infinitech/contracts';
import { loadAuthorizedBlobUrl, revokeBlobUrl } from '@/utils/privateAsset';
import { downloadCredentialReceipt } from '@/utils/credentialReceipt';

export function useRiderActionHelpers(ctx) {
  const {
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
  } = ctx;
  const onboardingInviteApi = createOnboardingInviteApi({
    get: (url, config) => request.get(url, config),
    post: (url, payload, config) => request.post(url, payload, config),
  });

  async function resolvePrivatePreviewUrl(candidate, fallback = '') {
    const url = String(candidate || '').trim();
    if (!url) {
      return String(fallback || '').trim();
    }
    if (!url.startsWith('/api/riders/')) {
      return url;
    }
    return loadAuthorizedBlobUrl(url);
  }

  function replacePreviewUrl(target, key, nextUrl) {
    revokeBlobUrl(target?.[key]);
    target[key] = nextUrl;
  }

  function showAddDialog() {
    newRider.value = {
      phone: '',
      name: '',
      password: ''
    };
    addDialogVisible.value = true;
  }

  function openInviteDialog() {
    inviteForm.value = createDefaultInviteLinkForm();
    inviteResult.value = createEmptyInviteLinkResult();
    inviteDialogVisible.value = true;
  }

  async function createInviteLink() {
    creatingInvite.value = true;
    try {
      inviteResult.value = await onboardingInviteApi.createAdminInvite({
        invite_type: 'rider',
        expires_hours: Number(inviteForm.value.expires_hours || 72),
        max_uses: Number(inviteForm.value.max_uses || 1)
      });
      if (inviteResult.value.invite_url) {
        ElMessage.success('邀请链接生成成功');
      } else {
        ElMessage.error('邀请链接生成失败');
      }
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '邀请链接生成失败'));
    } finally {
      creatingInvite.value = false;
    }
  }

  async function copyInviteUrl() {
    const url = inviteResult.value.invite_url;
    if (!url) {
      ElMessage.warning('请先生成邀请链接');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      ElMessage.success('邀请链接已复制');
    } catch (error) {
      ElMessage.error('复制失败，请手动复制');
    }
  }

  function formatInviteDateTime(value) {
    if (!value) {
      return '-';
    }
    return formatTime(value);
  }

  function getInviteRemainingUses() {
    return resolveInviteRemainingUses(inviteResult.value);
  }

  async function handleAddRider() {
    if (!newRider.value.phone || !newRider.value.name || !newRider.value.password) {
      ElMessage.warning('请填写完整信息');
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(newRider.value.phone)) {
      ElMessage.warning('请输入正确的手机号');
      return;
    }

    if (newRider.value.password.length < 6) {
      ElMessage.warning('密码至少需要6位');
      return;
    }

    addingRider.value = true;
    try {
      const { data } = await request.post('/api/riders', {
        phone: newRider.value.phone,
        name: newRider.value.name,
        password: newRider.value.password
      });

      if (data.success) {
        ElMessage.success('新增骑手成功');
        addDialogVisible.value = false;
        dataCache.value.clear();
        await loadRiders(true);
      }
    } catch (e) {
      ElMessage.error(extractErrorMessage(e, '新增骑手失败'));
    } finally {
      addingRider.value = false;
    }
  }

  async function handleReorganizeIds() {
    try {
      await ElMessageBox.confirm(
        '此操作将重新排列所有骑手的ID（从1开始），按注册时间排序。是否继续？',
        '确认ID重组',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      );

      reorganizing.value = true;
      try {
        const { data } = await request.post('/api/reorganize-role-ids/rider');

        if (data.success) {
          ElMessage.success(data.message || 'ID重组成功');
          dataCache.value.clear();
          await loadRiders(true);
        }
      } catch (e) {
        ElMessage.error(extractErrorMessage(e, 'ID重组失败'));
      } finally {
        reorganizing.value = false;
      }
    } catch (e) {
      // 用户取消操作
    }
  }

  async function handleResetPassword(rider) {
    try {
      await ElMessageBox.confirm(
        `确定要重置骑手"${rider.name || rider.phone}"的密码吗？`,
        '确认重置密码',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      );

      resettingPassword.value = rider.id;
      try {
        const { data } = await request.post(`/api/riders/${rider.id}/reset-password`);
        const credential = extractTemporaryCredential(data);
        if (!data.success || !credential) {
          throw new Error('后端未返回一次性临时口令');
        }
        const filename = downloadCredentialReceipt({
          scene: 'rider-reset-password',
          subject: `骑手 ${rider.name || rider.phone || rider.id}`,
          account: rider.phone || String(rider.id || ''),
          temporaryPassword: credential.temporaryPassword,
        });
        ElMessage.success(`骑手密码已重置，并已下载安全回执 ${filename}`);
      } catch (e) {
        ElMessage.error(extractErrorMessage(e, '重置骑手密码失败'));
      } finally {
        resettingPassword.value = null;
      }
    } catch (e) {
      // 用户取消操作
    }
  }

  async function handleDeleteRiderOrders(rider) {
    try {
      await ElMessageBox.confirm(
        `确定要清除骑手"${rider.name || rider.phone}"的所有相关订单吗？此操作不可恢复！`,
        '确认清除订单',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      );

      deletingOrders.value = rider.id;
      try {
        const { data } = await request.post(`/api/riders/${rider.id}/delete-orders`);
        if (data.success) {
          ElMessage.success(data.message || `成功清除 ${data.deleted} 条订单`);
        } else {
          ElMessage.error(data.error || '清除订单失败');
        }
      } catch (e) {
        const errorMessage = extractErrorMessage(e, '清除订单失败');
        ElMessage.error(errorMessage);
      } finally {
        deletingOrders.value = null;
      }
    } catch (e) {
      // 用户取消操作
    }
  }

  async function handleDeleteRider(rider) {
    try {
      await ElMessageBox.confirm(
        `确定要删除骑手"${rider.name || rider.phone}"吗？此操作不可恢复！`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      );

      deletingRider.value = rider.id;
      try {
        const { data } = await request.delete(`/api/riders/${rider.id}`);
        if (data.success) {
          ElMessage.success('删除骑手成功');
          dataCache.value.clear();
          await loadRiders(true);
        }
      } catch (e) {
        ElMessage.error(extractErrorMessage(e, '删除骑手失败'));
      } finally {
        deletingRider.value = null;
      }
    } catch (e) {
      // 用户取消操作
    }
  }

  async function openDetail(row) {
    replacePreviewUrl(detail.value, 'id_card_front_preview_url', '');
    detail.value = { ...row };
    detailVisible.value = true;

    try {
      const { data } = await request.get(`/api/riders/${row.id}`);
      if (data) {
        const source = extractEnvelopeData(data) || {};
        const detailPreviewUrl = await resolvePrivatePreviewUrl(
          source.id_card_front_preview_url,
          source.id_card_front || source.id_card_image || '',
        );
        detail.value = {
          ...detail.value,
          ...source,
          rating: Number(source.rating || detail.value.rating || 0),
          rating_count: Number(source.rating_count || source.ratingCount || detail.value.rating_count || 0),
          id_card_front: source.id_card_front || source.id_card_image || '',
          id_card_front_preview_url: detailPreviewUrl,
          emergency_contact_name: source.emergency_contact_name || '',
          emergency_contact_phone: source.emergency_contact_phone || '',
          onboarding_info: source.onboarding_info || null
        };
      }
    } catch (error) {
      // ignore detail loading failures
    }
  }

  function openRiderEditDialog() {
    replacePreviewUrl(riderEditForm.value, 'id_card_front_preview_url', '');
    riderEditForm.value = {
      id: detail.value.id || null,
      name: detail.value.name || '',
      phone: detail.value.phone || '',
      emergency_contact_name: detail.value.emergency_contact_name || '',
      emergency_contact_phone: detail.value.emergency_contact_phone || '',
      id_card_front: detail.value.id_card_front || detail.value.id_card_image || '',
      id_card_front_preview_url: detail.value.id_card_front_preview_url || detail.value.id_card_front || detail.value.id_card_image || ''
    };
    riderEditVisible.value = true;
  }

  async function handleRiderIdCardChange(uploadFile) {
    const raw = uploadFile?.raw;
    if (!raw) return;
    if (!raw.type?.startsWith('image/')) {
      ElMessage.warning('请上传图片格式的身份证照片');
      return;
    }

    uploadingRiderIdCard.value = true;
    try {
      const formData = new FormData();
      formData.append('image', raw);
      formData.append('field', 'id_card_front');
      const { data } = await request.post(`/api/riders/${riderEditForm.value.id}/cert`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const asset = extractUploadAsset(data);
      const nextRef = String(asset?.asset_id || data?.assetRef || data?.imageUrl || '').trim();
      const previewSource = String(asset?.asset_url || data?.previewUrl || '').trim();
      if (!nextRef || !previewSource) {
        throw new Error('上传返回的证件资源信息不完整');
      }
      const previewUrl = await resolvePrivatePreviewUrl(previewSource);
      riderEditForm.value.id_card_front = nextRef;
      replacePreviewUrl(riderEditForm.value, 'id_card_front_preview_url', previewUrl);
      replacePreviewUrl(detail.value, 'id_card_front_preview_url', previewUrl);
      detail.value.id_card_front = nextRef;
      ElMessage.success('身份证照片上传成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '身份证照片上传失败'));
    } finally {
      uploadingRiderIdCard.value = false;
    }
  }

  async function saveRiderEdit() {
    if (!riderEditForm.value.id) {
      ElMessage.error('骑手ID无效');
      return;
    }
    if (!riderEditForm.value.name || !riderEditForm.value.phone) {
      ElMessage.warning('请填写姓名和手机号');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(String(riderEditForm.value.phone || ''))) {
      ElMessage.warning('请输入正确的手机号');
      return;
    }
    if (riderEditForm.value.emergency_contact_phone && !/^1[3-9]\d{9}$/.test(String(riderEditForm.value.emergency_contact_phone || ''))) {
      ElMessage.warning('请输入正确的紧急联系人电话');
      return;
    }

    savingRiderEdit.value = true;
    try {
      await request.put(`/api/riders/${riderEditForm.value.id}`, {
        name: riderEditForm.value.name,
        phone: riderEditForm.value.phone,
        emergency_contact_name: riderEditForm.value.emergency_contact_name,
        emergency_contact_phone: riderEditForm.value.emergency_contact_phone,
        id_card_front: riderEditForm.value.id_card_front
      });
      ElMessage.success('骑手信息已保存');
      riderEditVisible.value = false;
      dataCache.value.clear();
      await loadRiders(true);
      await openDetail({ id: riderEditForm.value.id });
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存骑手信息失败'));
    } finally {
      savingRiderEdit.value = false;
    }
  }

  function formatOnboardingSource(source) {
    if (source === 'invite') return '邀请链接';
    if (source === 'manual') return '管理端手动创建';
    return source || '-';
  }

  function formatOnboardingType(inviteType) {
    if (inviteType === 'merchant') return '商户邀请';
    if (inviteType === 'rider') return '骑手邀请';
    return inviteType || '-';
  }

  async function handleClearAllRiders() {
    try {
      await ElMessageBox.confirm(
        '确定要清空所有骑手吗？此操作将删除所有骑手账户，不可恢复！',
        '确认清空',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      );

      clearing.value = true;
      try {
        const { data } = await request.post('/api/riders/delete-all');
        if (data.success) {
          ElMessage.success(`成功清空 ${data.deleted || 0} 个骑手`);
          dataCache.value.clear();
          await loadRiders(true);
        }
      } catch (e) {
        ElMessage.error(extractErrorMessage(e, '清空骑手失败'));
      } finally {
        clearing.value = false;
      }
    } catch (e) {
      // 用户取消操作
    }
  }

  const reviewActions = useRiderReviewActionHelpers({
    request,
    ElMessage,
    ElMessageBox,
    reviewManageVisible,
    reviewTargetRider,
    riderReviewsLoading,
    riderReviews,
    riderReviewDialogVisible,
    riderReviewEditingId,
    riderReviewSaving,
    uploadingRiderReviewImage,
    riderReviewForm,
    riders,
    detail,
    buildEmptyRiderReviewForm,
    normalizeImageArray,
  });

  return {
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
    ...reviewActions,
    handleClearAllRiders,
  };
}
