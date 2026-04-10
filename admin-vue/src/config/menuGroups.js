export const MENU_GROUPS = [
  {
    id: 'overview',
    name: '总览中心',
    sections: [
      {
        id: 'overview-dashboard',
        name: '总览视图',
        children: [
          { path: '/dashboard', name: '仪表盘' },
        ],
      },
    ],
  },
  {
    id: 'account',
    name: '账号管理',
    sections: [
      {
        id: 'account-admin',
        name: '后台与权限',
        children: [
          { path: '/management-center', name: '管理中心' },
        ],
      },
      {
        id: 'account-roles',
        name: '平台角色',
        children: [
          { path: '/users', name: '用户管理' },
          { path: '/riders', name: '骑手管理' },
          { path: '/rider-ranks', name: '骑手等级' },
          { path: '/merchants', name: '商户管理' },
        ],
      },
    ],
  },
  {
    id: 'order-service',
    name: '订单服务',
    sections: [
      {
        id: 'order-fulfillment',
        name: '履约与售后',
        children: [
          { path: '/orders', name: '订单管理' },
          { path: '/after-sales', name: '售后服务' },
        ],
      },
      {
        id: 'order-audits',
        name: '沟通与审计',
        children: [
          { path: '/support-chat', name: '客服工作台' },
          { path: '/contact-phone-audits', name: '电话联系审计' },
          { path: '/rtc-call-audits', name: 'RTC 通话审计' },
        ],
      },
    ],
  },
  {
    id: 'operation',
    name: '运营营销',
    sections: [
      {
        id: 'operation-campaign',
        name: '活动与投放',
        children: [
          { path: '/operations-center', name: '运营管理' },
          { path: '/home-entry-settings', name: '首页入口配置' },
          { path: '/errand-settings', name: '跑腿配置' },
          { path: '/dining-buddy-governance', name: '同频饭友治理' },
          { path: '/featured-products', name: '今日推荐' },
          { path: '/home-campaigns', name: '首页推广' },
          { path: '/coupon-management', name: '优惠券管理' },
        ],
      },
      {
        id: 'operation-content',
        name: '内容与触达',
        children: [
          { path: '/notifications', name: '官方通知' },
          { path: '/content-settings', name: '内容设置' },
        ],
      },
    ],
  },
  {
    id: 'finance',
    name: '财务数据',
    sections: [
      {
        id: 'finance-overview',
        name: '财务总览',
        children: [
          { path: '/finance-center', name: '财务中心' },
          { path: '/transaction-logs', name: '财务日志' },
        ],
      },
      {
        id: 'finance-payment',
        name: '支付与结算',
        children: [
          { path: '/payment-center', name: '支付中心' },
        ],
      },
    ],
  },
  {
    id: 'intelligent',
    name: '智能监控',
    sections: [
      {
        id: 'intelligent-runtime',
        name: '平台监控',
        children: [
          { path: '/monitor-chat', name: '平台监控' },
        ],
      },
      {
        id: 'intelligent-debug',
        name: '联调排障',
        children: [
          { path: '/blank-page', name: '联调工作台' },
        ],
      },
    ],
  },
  {
    id: 'system',
    name: '系统配置',
    sections: [
      {
        id: 'system-settings',
        name: '基础与平台配置',
        children: [
          { path: '/settings', name: '系统设置' },
          { path: '/merchant-taxonomy-settings', name: '商户业务字典' },
          { path: '/rider-rank-settings', name: '骑手等级配置' },
          { path: '/data-management', name: '数据管理' },
        ],
      },
      {
        id: 'system-open-platform',
        name: '开放平台',
        children: [
          { path: '/api-management', name: 'API 管理' },
          { path: '/api-permissions', name: 'API 权限管理' },
          { path: '/api-documentation', name: 'API 文档' },
        ],
      },
      {
        id: 'system-audit',
        name: '审计记录',
        children: [
          { path: '/system-logs', name: '系统日志' },
        ],
      },
    ],
  },
]
