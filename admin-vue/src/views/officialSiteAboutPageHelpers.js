const heroMetrics = [
  {
    label: '平台定位',
    description: '不是单一展示页，而是把校园服务、平台内容与运营动作统一到一套产品链路里。',
  },
  {
    label: '协同方式',
    description: '由燧石创想工作室与联合运营主体共同推进，兼顾产品迭代、履约效率与服务落地。',
  },
  {
    label: '服务场景',
    description: '围绕团购、外卖、跑腿与社交等真实校园场景，持续优化使用体验与平台响应能力。',
  },
]

const heroFeatureItems = [
  {
    dotClass: 'bg-[#1976d2]',
    title: '技术驱动',
    description: '燧石创想工作室持续负责平台架构、产品迭代与体验优化。',
  },
  {
    dotClass: 'bg-slate-300',
    title: '联合运营',
    description: '烟台英菲尼信息科技有限公司与泓策融鑫科贸（烟台）有限公司共同参与运营协同与服务落地。',
  },
  {
    dotClass: 'bg-slate-300',
    title: '长期目标',
    description: '把校园生态服务做得更稳定、更可信，让平台长期具备真实的使用价值与运营能力。',
  },
]

const heroFooterStats = [
  {
    label: '核心方向',
    value: '校园生态服务',
  },
  {
    label: '服务重点',
    value: '体验与回应效率',
  },
  {
    label: '工作方式',
    value: '技术与运营协同',
  },
]

const heroPerspectiveCards = [
  {
    label: '服务视角',
    description: '先解决校园里最真实的使用需求，再去谈平台的扩展能力。',
  },
  {
    label: '工作节奏',
    description: '用持续迭代和长期运营，把官网、服务与落地体验一起做好。',
  },
]

const founders = [
  {
    initial: '万',
    role: '创始人 / 高级工程师',
    name: '万蕾',
    description: '负责产品业务逻辑设计、前端体验优化与高校商务资源拓展。',
  },
  {
    initial: '魏',
    role: '创始人 / 新领人才',
    name: '魏可信',
    description: '主导平台底层技术架构与数据库设计，把控核心代码质量。',
  },
]

const partners = [
  {
    name: '烟台英菲尼信息科技有限公司',
    badge: '运营与资金主体',
    description: '作为平台的强力后盾，英菲尼科技全权负责平台的整体合规化运营，建立严密高效的走账审核与资金流转机制，全方位保障每一笔交易的安全。',
  },
  {
    name: '泓策融鑫科贸（烟台）有限公司',
    badge: '技术与运力调度',
    description: '专注于线下资源整合与线上底层架构搭建，提供全套系统技术支持开发，并负责外卖、跑腿等线下骑手体系的日常调配与精细化管理。',
  },
]

const complianceItems = [
  {
    code: 'ICP',
    codeClass: 'text-[#1976d2]',
    label: 'ICP 增值电信许可',
  },
  {
    code: 'EDI',
    codeClass: 'text-[#1976d2]',
    label: 'EDI 在线数据处理许可',
  },
  {
    code: '食',
    codeClass: 'text-green-600',
    label: '网络食品经营许可',
  },
]

export function useOfficialSiteAboutPage() {
  return {
    complianceItems,
    founders,
    heroFeatureItems,
    heroFooterStats,
    heroMetrics,
    heroPerspectiveCards,
    partners,
  }
}
