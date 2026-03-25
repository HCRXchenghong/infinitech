export function useRiderReviewActionHelpers(ctx) {
  const {
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
  } = ctx;

  async function openRiderReviewManage(rider) {
    if (!rider?.id) return;
    reviewTargetRider.value = {
      ...rider,
      rating: Number(rider.rating || 0),
      rating_count: Number(rider.rating_count || rider.ratingCount || 0)
    };
    reviewManageVisible.value = true;
    await loadRiderReviews(rider.id);
  }

  async function loadRiderReviews(riderId) {
    if (!riderId) return;
    riderReviewsLoading.value = true;
    try {
      const { data } = await request.get(`/api/riders/${riderId}/reviews`, {
        params: { page: 1, pageSize: 200 }
      });
      const list = Array.isArray(data?.list) ? data.list : [];
      riderReviews.value = list.map((item) => ({
        ...item,
        rating: Number(item.rating || 0)
      }));

      const nextRating = Number(data?.rating || reviewTargetRider.value.rating || 0);
      const nextRatingCount = Number(data?.rating_count || data?.ratingCount || reviewTargetRider.value.rating_count || 0);
      reviewTargetRider.value = {
        ...reviewTargetRider.value,
        rating: nextRating,
        rating_count: nextRatingCount
      };

      riders.value = riders.value.map((item) => item.id === riderId ? {
        ...item,
        rating: nextRating,
        rating_count: nextRatingCount
      } : item);
      if (String(detail.value.id || '') === String(riderId || '')) {
        detail.value = {
          ...detail.value,
          rating: nextRating,
          rating_count: nextRatingCount
        };
      }
    } catch (error) {
      riderReviews.value = [];
      ElMessage.error(error?.response?.data?.error || '加载骑手评论失败');
    } finally {
      riderReviewsLoading.value = false;
    }
  }

  function openCreateRiderReviewDialog() {
    riderReviewEditingId.value = '';
    riderReviewForm.value = buildEmptyRiderReviewForm();
    riderReviewDialogVisible.value = true;
  }

  function openEditRiderReviewDialog(row) {
    riderReviewEditingId.value = String(row.id || '');
    riderReviewForm.value = {
      userName: row.userName || row.user_name || '匿名用户',
      rating: Number(row.rating || 5),
      userId: String(row.userId || row.user_id || ''),
      orderId: String(row.orderId || row.order_id || ''),
      userAvatar: row.userAvatar || row.user_avatar || '',
      content: row.content || '',
      images: normalizeImageArray(row.images)
    };
    riderReviewDialogVisible.value = true;
  }

  async function handleRiderReviewImageChange(uploadFile) {
    const raw = uploadFile?.raw;
    if (!raw) return;
    if (!raw.type?.startsWith('image/')) {
      ElMessage.warning('请上传图片格式文件');
      return;
    }

    uploadingRiderReviewImage.value = true;
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
      if (!Array.isArray(riderReviewForm.value.images)) {
        riderReviewForm.value.images = [];
      }
      riderReviewForm.value.images = [...riderReviewForm.value.images, nextUrl];
      ElMessage.success('评论图片上传成功');
    } catch (error) {
      ElMessage.error(error?.response?.data?.error || error.message || '评论图片上传失败');
    } finally {
      uploadingRiderReviewImage.value = false;
    }
  }

  function removeRiderReviewImage(index) {
    const list = Array.isArray(riderReviewForm.value.images) ? [...riderReviewForm.value.images] : [];
    if (index < 0 || index >= list.length) return;
    list.splice(index, 1);
    riderReviewForm.value.images = list;
  }

  async function saveRiderReview() {
    if (!reviewTargetRider.value?.id) return;
    if (!riderReviewForm.value.content || !riderReviewForm.value.content.trim()) {
      ElMessage.warning('评论内容不能为空');
      return;
    }
    const rating = Number(riderReviewForm.value.rating || 0);
    if (rating <= 0 || rating > 5) {
      ElMessage.warning('评分范围必须在 1 - 5 之间');
      return;
    }

    const payload = {
      riderId: String(reviewTargetRider.value.id || '').trim(),
      userId: String(riderReviewForm.value.userId || '').trim(),
      orderId: String(riderReviewForm.value.orderId || '').trim(),
      userName: riderReviewForm.value.userName || '匿名用户',
      userAvatar: riderReviewForm.value.userAvatar || '',
      rating,
      content: riderReviewForm.value.content || '',
      images: Array.isArray(riderReviewForm.value.images) ? riderReviewForm.value.images : []
    };

    riderReviewSaving.value = true;
    try {
      if (riderReviewEditingId.value) {
        await request.put(`/api/rider-reviews/${riderReviewEditingId.value}`, payload);
        ElMessage.success('评论更新成功');
      } else {
        await request.post('/api/rider-reviews', payload);
        ElMessage.success('评论新增成功');
      }
      riderReviewDialogVisible.value = false;
      await loadRiderReviews(reviewTargetRider.value.id);
    } catch (error) {
      ElMessage.error(error?.response?.data?.error || '保存骑手评论失败');
    } finally {
      riderReviewSaving.value = false;
    }
  }

  async function handleDeleteRiderReview(row) {
    try {
      await ElMessageBox.confirm('确认删除这条评论吗？删除后不可恢复。', '删除评论', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      });
      await request.delete(`/api/rider-reviews/${row.id}`);
      ElMessage.success('评论已删除');
      await loadRiderReviews(reviewTargetRider.value.id);
    } catch (error) {
      if (error === 'cancel') return;
      ElMessage.error(error?.response?.data?.error || '删除骑手评论失败');
    }
  }

  function getRankName(level) {
    const ranks = {
      1: '青铜骑士',
      2: '白银骑士',
      3: '黄金骑士',
      4: '钻石骑士',
      5: '王者骑士',
      6: '传奇大佬'
    };
    return ranks[level] || '青铜骑士';
  }

  function getRankType(level) {
    if (level >= 6) return 'danger';
    if (level >= 5) return 'warning';
    if (level >= 4) return 'success';
    if (level >= 3) return 'primary';
    return 'info';
  }

  return {
    openRiderReviewManage,
    loadRiderReviews,
    openCreateRiderReviewDialog,
    openEditRiderReviewDialog,
    handleRiderReviewImageChange,
    removeRiderReviewImage,
    saveRiderReview,
    handleDeleteRiderReview,
    getRankName,
    getRankType,
  };
}
