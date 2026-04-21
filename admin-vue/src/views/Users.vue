<template src="./Users.template.html"></template>
<script setup>
import { Search, Refresh, More, Delete, Sort, Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import { formatRoleId } from '@/utils/format';
import { downloadCredentialReceipt } from '@/utils/credentialReceipt';
import PageStateAlert from '@/components/PageStateAlert.vue';
import ResponsiveActions from '@/components/ResponsiveActions.vue';
import { useUsersPage } from './usersPageHelpers';

const {
  addDialogVisible,
  addingUser,
  clearing,
  copyInviteUrl,
  createInviteLink,
  creatingInvite,
  currentPage,
  deletingOrders,
  deletingUser,
  detail,
  detailVisible,
  formatInviteDateTime,
  formatTime,
  getInviteRemainingUses,
  handleAddUser,
  handleClearAllUsers,
  handleDeleteUser,
  handleDeleteUserOrders,
  handleMobileAction,
  handlePageChange,
  handleReorganizeIds,
  handleResetPassword,
  handleSearch,
  handleSizeChange,
  inviteDialogVisible,
  inviteForm,
  inviteResult,
  isMobile,
  loadError,
  loadUsers,
  loading,
  newUser,
  openDetail,
  openInviteDialog,
  pageSize,
  reorganizing,
  resettingPassword,
  searchKeyword,
  showAddDialog,
  total,
  users,
  vipLabel,
  vipTagType,
  handleAddDialogClosed,
  handleInviteDialogClosed,
} = useUsersPage({
  request,
  ElMessage,
  ElMessageBox,
  downloadCredentialReceipt,
  navigatorClipboard: globalThis.navigator?.clipboard ?? null,
});
</script>

<style scoped lang="css" src="./Users.css"></style>
