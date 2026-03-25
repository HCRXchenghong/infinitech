// 主题配置
export const THEMES = {
  nebula: {
    id: 'nebula',
    name: '管理白',
    type: 'light',
    bg: '#f3f4f6',
    bgGradient: 'linear-gradient(to bottom, #f8fafc, #f3f4f6)',
    text: '#111827',
    textSub: '#6b7280',
    panel: '#ffffff',
    nav: '#ffffff',
    border: '#e5e7eb',
    accent: '#2563eb',
    accentText: '#ffffff',
    radius: '24rpx',
    blur: '0px'
  },
  polar: {
    id: 'polar',
    name: '极地白',
    type: 'light',
    bg: '#f8fafc',
    bgGradient: 'linear-gradient(to bottom, #f8fafc, #eef2ff)',
    text: '#0f172a',
    textSub: '#64748b',
    panel: '#ffffff',
    nav: '#ffffff',
    border: '#e5e7eb',
    accent: '#2563eb',
    accentText: '#ffffff',
    radius: '24rpx',
    blur: '0px'
  }
};

export const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
];

export const INITIAL_TASKS = [
  { id: 1, title: 'Q4 品牌升级战略书', status: 'done', priority: 'high', assigneeId: 'admin', dept: 'Marketing', deadline: 'Today', progress: 100, okr: '提升品牌溢价', desc: '根据董事会要求，针对Q4季度的高端市场进行品牌定位升级。' },
  { id: 2, title: '社交媒体海报设计', status: 'in-progress', priority: 'medium', assigneeId: 'admin', dept: 'Marketing', deadline: 'Tomorrow', progress: 45, okr: '用户增长', desc: '针对双十一预热活动的系列海报。' },
  { id: 3, title: '服务器扩容成本评估', status: 'todo', priority: 'high', assigneeId: 'admin', dept: 'Tech', deadline: 'Next Week', progress: 0, okr: '基础设施稳定性', desc: '现有集群负载已达85%。' },
];

export const INITIAL_CHATS = [
  { id: 1, name: '产品研发群', time: '10:42', msg: '新版本提测了吗？', unread: 2, avatar: AVATARS[0], type: 'group', messages: [
     { id: 1, text: '各位，新版本打包好了。', sender: 'Dev', self: false },
     { id: 2, text: '收到，马上安排测试。', sender: 'QA', self: false },
  ]},
  { id: 2, name: '财务-Lisa', time: 'Yesterday', msg: '报销单已审批。', unread: 0, avatar: AVATARS[0], type: 'p2p', messages: [
     { id: 1, text: 'Lisa, 上周的报销进度如何？', sender: 'Me', self: true },
     { id: 2, text: '报销单已审批，预计周五打款。', sender: 'Lisa', self: false },
  ]},
];
