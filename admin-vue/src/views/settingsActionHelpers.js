import { clearAdminSessionStorage } from '@/utils/runtime';

export function useSettingsActionHelpers({ router, ElMessage, ElMessageBox }) {
  function handleLogout() {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      clearAdminSessionStorage();
      router.push('/login');
      ElMessage.success('已退出登录');
    }).catch(() => {
      // 用户取消操作
    });
  }

  return {
    handleLogout,
  };
}
