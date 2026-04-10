import request from '@/utils/request'

const DEFAULT_MERCHANT_TAXONOMY_SETTINGS = {
  merchant_types: [
    { key: 'takeout', label: '外卖', enabled: true, sort_order: 10, aliases: ['外卖', '外卖类'] },
    { key: 'groupbuy', label: '团购', enabled: true, sort_order: 20, aliases: ['团购', '团购类'] },
    { key: 'hybrid', label: '混合', enabled: true, sort_order: 30, aliases: ['混合', '混合类'] }
  ],
  business_categories: [
    { key: 'food', label: '美食', enabled: true, sort_order: 10, aliases: ['美食'] },
    { key: 'groupbuy', label: '团购', enabled: true, sort_order: 20, aliases: ['团购'] },
    { key: 'dessert_drinks', label: '甜点饮品', enabled: true, sort_order: 30, aliases: ['甜点饮品'] },
    { key: 'supermarket_convenience', label: '超市便利', enabled: true, sort_order: 40, aliases: ['超市便利'] },
    { key: 'leisure_entertainment', label: '休闲娱乐', enabled: true, sort_order: 50, aliases: ['休闲娱乐', '休闲玩乐'] },
    { key: 'life_services', label: '生活服务', enabled: true, sort_order: 60, aliases: ['生活服务'] }
  ]
}

const DEFAULT_RIDER_RANK_SETTINGS = {
  levels: [
    { level: 1, key: 'bronze_knight', name: '青铜骑士', icon: '🥉', desc: '新手上路', progress_template: '累计{{totalOrders}}/100单，升级白银骑士', threshold_rules: ['累计完成 100 单'] },
    { level: 2, key: 'silver_knight', name: '白银骑士', icon: '🥈', desc: '稳定履约', progress_template: '累计{{totalOrders}}/300单，升级黄金骑士', threshold_rules: ['累计完成 300 单'] },
    { level: 3, key: 'gold_knight', name: '黄金骑士', icon: '🥇', desc: '高频骑手', progress_template: '本周{{weekOrders}}/100单，升级钻石骑士', threshold_rules: ['本周完成 100 单'] },
    { level: 4, key: 'diamond_knight', name: '钻石骑士', icon: '💎', desc: '高质量履约', progress_template: '本周{{weekOrders}}/150单，升级王者骑士', threshold_rules: ['本周完成 150 单'] },
    { level: 5, key: 'king_knight', name: '王者骑士', icon: '👑', desc: '稳定冲榜', progress_template: '保持高评分与连续周表现，升级传奇骑士', threshold_rules: ['连续 3 周保持钻石及以上'] },
    { level: 6, key: 'legend_knight', name: '传奇骑士', icon: '🌟', desc: '平台顶尖骑手', progress_template: '保持传奇骑士段位', threshold_rules: ['高评分、低异常、稳定履约'] }
  ]
}

let merchantTaxonomyCache = normalizeMerchantTaxonomySettings()
let merchantTaxonomyPromise = null
let merchantTaxonomyLoaded = false
let riderRankCache = normalizeRiderRankSettings()
let riderRankPromise = null
let riderRankLoaded = false

function toText(value) {
  return String(value || '').trim()
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function normalizeStringList(values = []) {
  return (Array.isArray(values) ? values : []).map((item) => toText(item)).filter(Boolean)
}

function normalizeTaxonomyOptions(source, fallbackItems) {
  const input = Array.isArray(source) && source.length ? source : fallbackItems
  return input
    .map((item, index) => {
      const key = toText(item?.key)
      const fallback = fallbackItems.find((candidate) => candidate.key === key) || fallbackItems[index] || {}
      return {
        key: key || toText(fallback.key),
        label: toText(item?.label || fallback.label),
        enabled: item?.enabled !== false,
        sort_order: toNumber(item?.sort_order, toNumber(fallback.sort_order, (index + 1) * 10)),
        aliases: normalizeStringList(item?.aliases).length
          ? normalizeStringList(item?.aliases)
          : normalizeStringList(fallback.aliases)
      }
    })
    .filter((item) => item.key && item.label)
    .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
}

function legacyOrderTypeLabelForKey(key) {
  const normalized = toText(key).toLowerCase()
  if (normalized === 'groupbuy') return '团购类'
  if (normalized === 'hybrid') return '混合类'
  return '外卖类'
}

export function normalizeMerchantTaxonomySettings(payload = {}) {
  return {
    merchant_types: normalizeTaxonomyOptions(payload.merchant_types, DEFAULT_MERCHANT_TAXONOMY_SETTINGS.merchant_types),
    business_categories: normalizeTaxonomyOptions(payload.business_categories, DEFAULT_MERCHANT_TAXONOMY_SETTINGS.business_categories)
  }
}

export function normalizeRiderRankSettings(payload = {}) {
  const source = Array.isArray(payload.levels) && payload.levels.length ? payload.levels : DEFAULT_RIDER_RANK_SETTINGS.levels
  return {
    levels: source
      .map((item, index) => {
        const level = toNumber(item?.level, index + 1)
        const fallback = DEFAULT_RIDER_RANK_SETTINGS.levels.find((candidate) => Number(candidate.level) === level) || DEFAULT_RIDER_RANK_SETTINGS.levels[index] || {}
        return {
          level,
          key: toText(item?.key || fallback.key),
          name: toText(item?.name || fallback.name),
          icon: toText(item?.icon || fallback.icon),
          desc: toText(item?.desc || fallback.desc),
          progress_template: toText(item?.progress_template || fallback.progress_template),
          threshold_rules: normalizeStringList(item?.threshold_rules).length
            ? normalizeStringList(item?.threshold_rules)
            : normalizeStringList(fallback.threshold_rules)
        }
      })
      .filter((item) => item.level > 0)
      .sort((left, right) => left.level - right.level)
  }
}

export function getCachedMerchantTaxonomySettings() {
  return normalizeMerchantTaxonomySettings(merchantTaxonomyCache)
}

export async function loadMerchantTaxonomySettings(forceRefresh = false) {
  if (!forceRefresh && merchantTaxonomyPromise) {
    return merchantTaxonomyPromise
  }
  if (!forceRefresh && merchantTaxonomyLoaded) {
    return getCachedMerchantTaxonomySettings()
  }

  merchantTaxonomyPromise = request.get('/api/merchant-taxonomy-settings', {
    params: forceRefresh ? { _t: Date.now() } : undefined
  })
    .then(({ data }) => {
      merchantTaxonomyCache = normalizeMerchantTaxonomySettings(data || {})
      merchantTaxonomyLoaded = true
      return getCachedMerchantTaxonomySettings()
    })
    .catch(() => getCachedMerchantTaxonomySettings())
    .finally(() => {
      merchantTaxonomyPromise = null
    })

  return merchantTaxonomyPromise
}

export function getCachedRiderRankSettings() {
  return normalizeRiderRankSettings(riderRankCache)
}

export async function loadRiderRankSettings(forceRefresh = false) {
  if (!forceRefresh && riderRankPromise) {
    return riderRankPromise
  }
  if (!forceRefresh && riderRankLoaded) {
    return getCachedRiderRankSettings()
  }

  riderRankPromise = request.get('/api/rider-rank-settings', {
    params: forceRefresh ? { _t: Date.now() } : undefined
  })
    .then(({ data }) => {
      riderRankCache = normalizeRiderRankSettings(data || {})
      riderRankLoaded = true
      return getCachedRiderRankSettings()
    })
    .catch(() => getCachedRiderRankSettings())
    .finally(() => {
      riderRankPromise = null
    })

  return riderRankPromise
}

export function buildMerchantTypeOptions(settings = null) {
  const normalized = normalizeMerchantTaxonomySettings(settings || getCachedMerchantTaxonomySettings())
  return normalized.merchant_types
    .filter((item) => item.enabled !== false)
    .map((item) => {
      const orderTypeLabel = item.label.endsWith('类') ? item.label : `${item.label}类`
      const legacyOrderTypeLabel = legacyOrderTypeLabelForKey(item.key)
      return {
        ...item,
        orderTypeLabel,
        legacyOrderTypeLabel,
        matchValues: [
          item.key,
          item.label,
          orderTypeLabel,
          legacyOrderTypeLabel,
          ...normalizeStringList(item.aliases)
        ].map((entry) => toText(entry).toLowerCase())
      }
    })
}

export function buildBusinessCategoryOptions(settings = null) {
  const normalized = normalizeMerchantTaxonomySettings(settings || getCachedMerchantTaxonomySettings())
  return normalized.business_categories
    .filter((item) => item.enabled !== false)
    .map((item) => ({
      ...item,
      matchValues: [
        item.key,
        item.label,
        ...normalizeStringList(item.aliases)
      ].map((entry) => toText(entry).toLowerCase())
    }))
}

export function resolveMerchantTypeOption(value, settings = null) {
  const options = buildMerchantTypeOptions(settings)
  const normalizedValue = toText(value).toLowerCase()
  return options.find((item) => item.matchValues.includes(normalizedValue)) || options[0] || {
    ...DEFAULT_MERCHANT_TAXONOMY_SETTINGS.merchant_types[0],
    orderTypeLabel: '外卖类',
    legacyOrderTypeLabel: '外卖类',
    matchValues: []
  }
}

export function resolveBusinessCategoryOption(value, settings = null) {
  const options = buildBusinessCategoryOptions(settings)
  const normalizedValue = toText(value).toLowerCase()
  return options.find((item) => item.matchValues.includes(normalizedValue)) || options[0] || {
    ...DEFAULT_MERCHANT_TAXONOMY_SETTINGS.business_categories[0],
    matchValues: []
  }
}

export function getRiderRankLevel(level, settings = null) {
  const normalized = normalizeRiderRankSettings(settings || getCachedRiderRankSettings())
  return normalized.levels.find((item) => Number(item.level) === Number(level)) || normalized.levels[0] || DEFAULT_RIDER_RANK_SETTINGS.levels[0]
}

export function getRiderRankName(level, settings = null) {
  return getRiderRankLevel(level, settings).name
}
