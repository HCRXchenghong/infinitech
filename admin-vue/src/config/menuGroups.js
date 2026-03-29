export const MENU_GROUPS = [
  {
    id: 'overview',
    name: '总览中心',
    children: [
      { path: '/dashboard', name: '仪表盘' },
    ],
  },
  {
    id: 'account',
    name: '账号管理',
    children: [
      { path: '/management-center', name: '管理中心' },
      { path: '/users', name: '用户管理' },
      { path: '/riders', name: '骑手管理' },
      { path: '/merchants', name: '商户管理' },
    ],
  },
  {
    id: 'order-service',
    name: '订单服务',
    children: [
      { path: '/orders', name: '订单管理' },
      { path: '/after-sales', name: '售后服务' },
      { path: '/support-chat', name: '客服工作台' },
      { path: '/contact-phone-audits', name: '电话联系审计' },
    ],
  },
  {
    id: 'operation',
    name: '运营营销',
    children: [
      { path: '/operations-center', name: '运营管理' },
      { path: '/featured-products', name: '今日推荐' },
      { path: '/home-campaigns', name: '首页推广' },
      { path: '/coupon-management', name: '优惠券管理' },
      { path: '/notifications', name: '官方通知' },
      { path: '/content-settings', name: '内容设置' },
    ],
  },
  {
    id: 'finance',
    name: '财务数据',
    children: [
      { path: '/finance-center', name: '财务中心' },
      { path: '/transaction-logs', name: '财务日志' },
    ],
  },
  {
    id: 'intelligent',
    name: '智能监控',
    children: [
      { path: '/monitor-chat', name: '平台监控' },
      { path: '/blank-page', name: '空白页' },
    ],
  },
  {
    id: 'system',
    name: '系统配置',
    children: [
      { path: '/system-logs', name: '系统日志' },
      { path: '/settings', name: '系统设置' },
      { path: '/data-management', name: '数据管理' },
      { path: '/payment-info', name: '付款说明管理' },
      { path: '/api-management', name: 'API 管理' },
      { path: '/api-permissions', name: 'API 权限管理' },
      { path: '/api-documentation', name: 'API 文档' },
    ],
  },
];
