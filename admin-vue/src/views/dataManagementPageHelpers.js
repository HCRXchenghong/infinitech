import { computed, onMounted } from 'vue';
import { useDataManagementPage as useDataManagementRuntimePage } from './dataManagementHelpers';

export function useDataManagementPage() {
  const page = useDataManagementRuntimePage();

  const businessCards = computed(() => [
    {
      key: 'users',
      title: '用户数据管理',
      exportLabel: '导出用户数据',
      importLabel: '导入用户数据',
      exportTip: '导出当前用户核心字段快照，可用于业务恢复和批量迁移。',
      importTip: '自动按用户记录覆盖或创建，支持恢复已删除的业务数据。',
      exportLoading: page.exporting.value,
      importLoading: page.importing.value,
      onExport: page.exportUsers,
    },
    {
      key: 'riders',
      title: '骑手数据管理',
      exportLabel: '导出骑手数据',
      importLabel: '导入骑手数据',
      exportTip: '导出当前骑手核心字段快照，可用于账号与履约资料恢复。',
      importTip: '自动按骑手记录覆盖或创建，支持恢复已删除的业务数据。',
      exportLoading: page.exportingRiders.value,
      importLoading: page.importingRiders.value,
      onExport: page.exportRiders,
    },
    {
      key: 'orders',
      title: '订单数据管理',
      exportLabel: '导出订单数据',
      importLabel: '导入订单数据',
      exportTip: '导出当前订单核心字段快照，可用于回溯与批量导入。',
      importTip: '自动按订单记录覆盖或创建，支持恢复已删除的业务数据。',
      exportLoading: page.exportingOrders.value,
      importLoading: page.importingOrders.value,
      onExport: page.exportOrders,
    },
    {
      key: 'merchants',
      title: '商户数据管理',
      exportLabel: '导出商户数据',
      importLabel: '导入商户数据',
      exportTip: '导出当前商户核心字段快照，可用于账号与资质信息恢复。',
      importTip: '自动按商户记录覆盖或创建，支持恢复已删除的业务数据。',
      exportLoading: page.exportingMerchants.value,
      importLoading: page.importingMerchants.value,
      onExport: page.exportMerchants,
    },
  ]);

  const configCards = computed(() => [
    {
      key: 'system_settings',
      title: '系统配置',
      description: '包含调试模式、服务开关、公益设置、会员设置、金币比例和 App 下载配置。',
      exportLabel: '导出系统配置',
      importLabel: '导入系统配置',
      exportLoading: page.exportingSystemSettings.value,
      importLoading: page.importingSystemSettings.value,
      importTip: '用于保留并恢复管理端生效中的系统配置快照。',
      onExport: page.exportSystemSettings,
    },
    {
      key: 'content_config',
      title: '内容运营',
      description: '包含轮播设置、轮播图、推送消息和首页投放活动数据。',
      exportLabel: '导出内容配置',
      importLabel: '导入内容配置',
      exportLoading: page.exportingContentConfig.value,
      importLoading: page.importingContentConfig.value,
      importTip: '适合备份并恢复首页运营位和消息推送素材配置。',
      onExport: page.exportContentConfig,
    },
    {
      key: 'api_config',
      title: 'API 配置',
      description: '包含短信、天气、微信登录和开放 API Key 配置。',
      exportLabel: '导出 API 配置',
      importLabel: '导入 API 配置',
      exportLoading: page.exportingApiConfig.value,
      importLoading: page.importingApiConfig.value,
      importTip: '此导出包含密钥与接口凭证，请按敏感文件妥善保管。',
      warning: true,
      onExport: page.exportApiConfig,
    },
    {
      key: 'payment_config',
      title: '支付配置',
      description: '包含支付模式、微信支付、支付宝和支付提示文案。',
      exportLabel: '导出支付配置',
      importLabel: '导入支付配置',
      exportLoading: page.exportingPaymentConfig.value,
      importLoading: page.importingPaymentConfig.value,
      importTip: '此导出包含支付密钥与回调配置，请按敏感文件妥善保管。',
      warning: true,
      onExport: page.exportPaymentConfig,
    },
  ]);

  onMounted(() => {
    page.refreshAll(false);
  });

  return {
    ...page,
    businessCards,
    configCards,
  };
}
