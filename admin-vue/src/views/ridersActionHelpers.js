import { useRiderReviewActionHelpers } from './ridersReviewActionHelpers';

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

  function showAddDialog() {
    newRider.value = {
      phone: '',
      name: '',
      password: ''
    };
    addDialogVisible.value = true;
  }

  function openInviteDialog() {
    inviteForm.value = {
      expires_hours: 72,
      max_uses: 1
    };
    inviteResult.value = {
      invite_url: '',
      expires_at: '',
      max_uses: 1,
      used_count: 0,
      remaining_uses: 1
    };
    inviteDialogVisible.value = true;
  }

  async function createInviteLink() {
    creatingInvite.value = true;
    try {
      const { data } = await request.post('/api/admin/onboarding/invites', {
        invite_type: 'rider',
        expires_hours: Number(inviteForm.value.expires_hours || 72),
        max_uses: Number(inviteForm.value.max_uses || 1)
      });
      const payload = data?.data || {};
      inviteResult.value = {
        invite_url: payload.invite_url || '',
        expires_at: payload.expires_at || '',
        max_uses: Number(payload.max_uses || inviteForm.value.max_uses || 1),
        used_count: Number(payload.used_count || 0),
        remaining_uses: Number(payload.remaining_uses || 0)
      };
      if (inviteResult.value.invite_url) {
        ElMessage.success('邀请链接生成成功');
      } else {
        ElMessage.error('邀请链接生成失败');
      }
    } catch (error) {
      ElMessage.error(error?.response?.data?.error || '邀请链接生成失败');
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
    if (Number.isFinite(Number(inviteResult.value.remaining_uses))) {
      return Number(inviteResult.value.remaining_uses);
    }
    const maxUses = Number(inviteResult.value.max_uses || 1);
    const usedCount = Number(inviteResult.value.used_count || 0);
    return Math.max(0, maxUses - usedCount);
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
      ElMessage.error(e.response?.data?.error || '新增骑手失败');
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
        ElMessage.error(e.response?.data?.error || 'ID重组失败');
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

        if (data.success) {
          ElMessageBox.alert(
            `骑手密码重置成功！新密码为：<strong style="font-size: 20px; color: #409eff;">${data.newPassword}</strong><br/><br/>请告知骑手使用新密码登录。`,
            '密码重置成功',
            {
              confirmButtonText: '确定',
              dangerouslyUseHTMLString: true,
              type: 'success'
            }
          );
        }
      } catch (e) {
        ElMessage.error(e.response?.data?.error || '重置骑手密码失败');
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
        const errorMessage = e.response?.data?.error || e.message || '清除订单失败';
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
        const { data } = await request.delete(`/api/users/${rider.id}`);
        if (data.success) {
          ElMessage.success('删除骑手成功');
          dataCache.value.clear();
          await loadRiders(true);
        }
      } catch (e) {
        ElMessage.error(e.response?.data?.error || '删除骑手失败');
      } finally {
        deletingRider.value = null;
      }
    } catch (e) {
      // 用户取消操作
    }
  }

  async function openDetail(row) {
    detail.value = { ...row };
    detailVisible.value = true;

    try {
      const { data } = await request.get(`/api/riders/${row.id}`);
      if (data) {
        const source = data.data || data;
        detail.value = {
          ...detail.value,
          ...source,
          rating: Number(source.rating || detail.value.rating || 0),
          rating_count: Number(source.rating_count || source.ratingCount || detail.value.rating_count || 0),
          id_card_front: source.id_card_front || source.id_card_image || '',
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
    riderEditForm.value = {
      id: detail.value.id || null,
      name: detail.value.name || '',
      phone: detail.value.phone || '',
      emergency_contact_name: detail.value.emergency_contact_name || '',
      emergency_contact_phone: detail.value.emergency_contact_phone || '',
      id_card_front: detail.value.id_card_front || detail.value.id_card_image || ''
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
      formData.append('file', raw);
      const { data } = await request.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const nextUrl = data?.url || '';
      if (!nextUrl) {
        throw new Error('上传返回地址为空');
      }
      riderEditForm.value.id_card_front = nextUrl;
      ElMessage.success('身份证照片上传成功');
    } catch (error) {
      ElMessage.error(error?.response?.data?.error || error.message || '身份证照片上传失败');
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
      ElMessage.error(error?.response?.data?.error || '保存骑手信息失败');
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
        ElMessage.error(e.response?.data?.error || '清空骑手失败');
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
