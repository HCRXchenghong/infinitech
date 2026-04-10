function trimValue(value) {
  return String(value || '').trim()
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function cloneStringList(values = []) {
  return (Array.isArray(values) ? values : []).map((item) => trimValue(item)).filter(Boolean)
}

function buildEmojiIcon(emoji = '✨', background = '#F3F4F6') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="${background}"/><text x="24" y="32" font-size="26" text-anchor="middle">${emoji}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export const DEFAULT_HOME_ENTRY_SETTINGS = {
  entries: [
    { key: 'food', label: '美食', icon: '🍜', icon_type: 'emoji', bg_color: '#FFF7ED', sort_order: 10, enabled: true, client_scopes: ['user-vue', 'app-mobile'], city_scopes: [], route_type: 'category', route_value: 'food', badge_text: '' },
    { key: 'groupbuy', label: '团购', icon: '🏷️', icon_type: 'emoji', bg_color: '#FFFBEB', sort_order: 20, enabled: true, client_scopes: ['user-vue', 'app-mobile'], city_scopes: [], route_type: 'category', route_value: 'groupbuy', badge_text: '' },
    { key: 'dessert_drinks', label: '甜点饮品', icon: '🧋', icon_type: 'emoji', bg_color: '#FFF1F2', sort_order: 30, enabled: true, client_scopes: ['user-vue', 'app-mobile'], city_scopes: [], route_type: 'category', route_value: 'dessert_drinks', badge_text: '' },
    { key: 'supermarket_convenience', label: '超市便利', icon: '🛒', icon_type: 'emoji', bg_color: '#EFF6FF', sort_order: 40, enabled: true, client_scopes: ['user-vue', 'app-mobile'], city_scopes: [], route_type: 'category', route_value: 'supermarket_convenience', badge_text: '' },
    { key: 'leisure_entertainment', label: '休闲娱乐', icon: '🎮', icon_type: 'emoji', bg_color: '#F0FDF4', sort_order: 50, enabled: true, client_scopes: ['user-vue', 'app-mobile'], city_scopes: [], route_type: 'category', route_value: 'leisure_entertainment', badge_text: '' },
    { key: 'medicine', label: '看病买药', icon: '💊', icon_type: 'emoji', bg_color: '#ECFEFF', sort_order: 60, enabled: true, client_scopes: ['user-vue', 'app-mobile'], city_scopes: [], route_type: 'feature', route_value: 'medicine', badge_text: '' },
    { key: 'errand', label: '跑腿代购', icon: '🏃', icon_type: 'emoji', bg_color: '#EEF2FF', sort_order: 70, enabled: true, client_scopes: ['user-vue', 'app-mobile'], city_scopes: [], route_type: 'feature', route_value: 'errand', badge_text: '' },
    { key: 'life_services', label: '生活服务', icon: '🔧', icon_type: 'emoji', bg_color: '#F3F4F6', sort_order: 80, enabled: true, client_scopes: ['user-vue', 'app-mobile'], city_scopes: [], route_type: 'category', route_value: 'life_services', badge_text: '' },
    { key: 'dining_buddy', label: '同频饭友', icon: '👫', icon_type: 'emoji', bg_color: '#FEF3C7', sort_order: 90, enabled: true, client_scopes: ['user-vue', 'app-mobile'], city_scopes: [], route_type: 'feature', route_value: 'dining_buddy', badge_text: '' },
    { key: 'charity', label: '悦享公益', icon: '💚', icon_type: 'emoji', bg_color: '#DCFCE7', sort_order: 100, enabled: true, client_scopes: ['user-vue', 'app-mobile'], city_scopes: [], route_type: 'feature', route_value: 'charity', badge_text: '' }
  ]
}

export const DEFAULT_ERRAND_SETTINGS = {
  page_title: '跑腿',
  hero_title: '同城跑腿',
  hero_desc: '帮买、帮送、帮取、帮办统一走真实订单链路',
  detail_tip: '订单金额、距离、重量和服务复杂度会影响最终费用，请以下单页实时展示为准。',
  services: [
    { key: 'buy', label: '帮我买', desc: '代买商品', icon: '购', color: '#ff6b00', enabled: true, sort_order: 10, route: '/pages/errand/buy/index', service_fee_hint: '按距离与商品重量综合计费' },
    { key: 'deliver', label: '帮我送', desc: '同城配送', icon: '送', color: '#009bf5', enabled: true, sort_order: 20, route: '/pages/errand/deliver/index', service_fee_hint: '按寄送距离与时效计费' },
    { key: 'pickup', label: '帮我取', desc: '快递代取', icon: '取', color: '#10b981', enabled: true, sort_order: 30, route: '/pages/errand/pickup/index', service_fee_hint: '按取件点距离与件数计费' },
    { key: 'do', label: '帮我办', desc: '排队代办', icon: '办', color: '#8b5cf6', enabled: true, sort_order: 40, route: '/pages/errand/do/index', service_fee_hint: '按预估耗时与代办复杂度计费' }
  ]
}

export const DEFAULT_DINING_BUDDY_SETTINGS = {
  enabled: true,
  welcome_title: '同频饭友',
  welcome_subtitle: '约饭、聊天、学习，快速找到同频搭子。',
  categories: [
    { id: 'chat', label: '聊天', icon: '/static/icons/chat-bubble.svg', icon_type: 'image', enabled: true, sort_order: 10, color: '#ec4899' },
    { id: 'food', label: '约饭', icon: '/static/icons/food-bowl.svg', icon_type: 'image', enabled: true, sort_order: 20, color: '#f97316' },
    { id: 'study', label: '学习', icon: '/static/icons/study-book.svg', icon_type: 'image', enabled: true, sort_order: 30, color: '#6366f1' }
  ],
  questions: [
    {
      question: '你更想先从哪种搭子开始？',
      options: [{ text: '先找个能聊天的人', icon: '💬' }, { text: '先约一顿饭最直接', icon: '🍜' }, { text: '先找学习监督搭子', icon: '📚' }]
    },
    {
      question: '你希望这场局有多少人？',
      options: [{ text: '2 人就够，直接高效', icon: '🫶' }, { text: '3-4 人，刚好不冷场', icon: '✨' }, { text: '5-6 人，更热闹一点', icon: '🎉' }]
    },
    {
      question: '如果现场节奏不一致，你更偏向？',
      options: [{ text: '先听听大家意见', icon: '🤝' }, { text: '商量一个折中方案', icon: '🗣️' }, { text: '我会先把偏好说清楚', icon: '✅' }]
    }
  ],
  publish_limit_per_day: 5,
  message_rate_limit_per_minute: 20,
  default_max_people: 4,
  max_max_people: 6,
  auto_close_expired_hours: 24
}

export const DEFAULT_MERCHANT_TAXONOMY_SETTINGS = {
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

export const DEFAULT_RIDER_RANK_SETTINGS = {
  levels: [
    { level: 1, key: 'bronze_knight', name: '青铜骑士', icon: '🥉', desc: '新手上路', progress_template: '累计{{totalOrders}}/100单，升级白银骑士', threshold_rules: ['累计完成 100 单'] },
    { level: 2, key: 'silver_knight', name: '白银骑士', icon: '🥈', desc: '稳定履约', progress_template: '累计{{totalOrders}}/300单，升级黄金骑士', threshold_rules: ['累计完成 300 单'] },
    { level: 3, key: 'gold_knight', name: '黄金骑士', icon: '🥇', desc: '高频骑手', progress_template: '本周{{weekOrders}}/100单，升级钻石骑士', threshold_rules: ['本周完成 100 单'] },
    { level: 4, key: 'diamond_knight', name: '钻石骑士', icon: '💎', desc: '高质量履约', progress_template: '本周{{weekOrders}}/150单，升级王者骑士', threshold_rules: ['本周完成 150 单'] },
    { level: 5, key: 'king_knight', name: '王者骑士', icon: '👑', desc: '稳定冲榜', progress_template: '保持高评分与连续周表现，升级传奇骑士', threshold_rules: ['连续 3 周保持钻石及以上'] },
    { level: 6, key: 'legend_knight', name: '传奇骑士', icon: '🌟', desc: '平台顶尖骑手', progress_template: '保持传奇骑士段位', threshold_rules: ['高评分、低异常、稳定履约'] }
  ]
}

export function normalizeHomeEntrySettings(payload = {}) {
  const input = Array.isArray(payload.entries) && payload.entries.length
    ? payload.entries
    : DEFAULT_HOME_ENTRY_SETTINGS.entries

  const seen = new Set()
  const entries = input
    .map((item, index) => {
      const source = item && typeof item === 'object' ? item : {}
      const key = trimValue(source.key)
      if (!key || seen.has(key)) return null
      seen.add(key)
      const fallback = DEFAULT_HOME_ENTRY_SETTINGS.entries.find((entry) => entry.key === key) || {}
      const bgColor = trimValue(source.bg_color || fallback.bg_color || '#F3F4F6')
      const icon = trimValue(source.icon || fallback.icon || '✨')
      const iconType = trimValue(source.icon_type || fallback.icon_type || 'emoji') || 'emoji'
      return {
        key,
        label: trimValue(source.label || fallback.label || key),
        icon,
        icon_type: iconType,
        bg_color: bgColor,
        sort_order: toNumber(source.sort_order, toNumber(fallback.sort_order, (index + 1) * 10)),
        enabled: source.enabled !== false,
        city_scopes: cloneStringList(source.city_scopes),
        client_scopes: cloneStringList(source.client_scopes).length ? cloneStringList(source.client_scopes) : cloneStringList(fallback.client_scopes || ['user-vue', 'app-mobile']),
        route_type: trimValue(source.route_type || fallback.route_type || 'page'),
        route_value: trimValue(source.route_value || fallback.route_value),
        badge_text: trimValue(source.badge_text),
        image: iconType === 'image' || iconType === 'external' ? icon : buildEmojiIcon(icon, bgColor)
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.sort_order - right.sort_order)

  return {
    entries: entries.length ? entries : DEFAULT_HOME_ENTRY_SETTINGS.entries.map((item) => ({
      ...item,
      image: buildEmojiIcon(item.icon, item.bg_color)
    }))
  }
}

export function normalizeErrandSettings(payload = {}) {
  const services = (Array.isArray(payload.services) && payload.services.length ? payload.services : DEFAULT_ERRAND_SETTINGS.services)
    .map((item, index) => {
      const source = item && typeof item === 'object' ? item : {}
      const fallback = DEFAULT_ERRAND_SETTINGS.services.find((service) => service.key === trimValue(source.key)) || {}
      return {
        key: trimValue(source.key || fallback.key),
        label: trimValue(source.label || fallback.label),
        desc: trimValue(source.desc || fallback.desc),
        icon: trimValue(source.icon || fallback.icon),
        color: trimValue(source.color || fallback.color || '#d1d5db'),
        enabled: source.enabled !== false,
        sort_order: toNumber(source.sort_order, toNumber(fallback.sort_order, (index + 1) * 10)),
        route: trimValue(source.route || fallback.route),
        service_fee_hint: trimValue(source.service_fee_hint || fallback.service_fee_hint)
      }
    })
    .filter((item) => item.key)
    .sort((left, right) => left.sort_order - right.sort_order)

  return {
    page_title: trimValue(payload.page_title || DEFAULT_ERRAND_SETTINGS.page_title),
    hero_title: trimValue(payload.hero_title || DEFAULT_ERRAND_SETTINGS.hero_title),
    hero_desc: trimValue(payload.hero_desc || DEFAULT_ERRAND_SETTINGS.hero_desc),
    detail_tip: trimValue(payload.detail_tip || DEFAULT_ERRAND_SETTINGS.detail_tip),
    services
  }
}

export function normalizeDiningBuddySettings(payload = {}) {
  const categories = (Array.isArray(payload.categories) && payload.categories.length ? payload.categories : DEFAULT_DINING_BUDDY_SETTINGS.categories)
    .map((item, index) => {
      const source = item && typeof item === 'object' ? item : {}
      const fallback = DEFAULT_DINING_BUDDY_SETTINGS.categories.find((category) => category.id === trimValue(source.id)) || {}
      return {
        id: trimValue(source.id || fallback.id),
        label: trimValue(source.label || fallback.label),
        icon: trimValue(source.icon || fallback.icon),
        icon_type: trimValue(source.icon_type || fallback.icon_type || 'image'),
        enabled: source.enabled !== false,
        sort_order: toNumber(source.sort_order, toNumber(fallback.sort_order, (index + 1) * 10)),
        color: trimValue(source.color || fallback.color || '#9ca3af')
      }
    })
    .filter((item) => item.id)
    .sort((left, right) => left.sort_order - right.sort_order)

  const questions = (Array.isArray(payload.questions) && payload.questions.length ? payload.questions : DEFAULT_DINING_BUDDY_SETTINGS.questions)
    .map((item) => {
      const source = item && typeof item === 'object' ? item : {}
      return {
        question: trimValue(source.question),
        options: (Array.isArray(source.options) ? source.options : [])
          .map((option) => {
            const optionSource = option && typeof option === 'object' ? option : {}
            return {
              text: trimValue(optionSource.text),
              icon: trimValue(optionSource.icon)
            }
          })
          .filter((option) => option.text)
      }
    })
    .filter((item) => item.question && item.options.length)

  return {
    enabled: payload.enabled !== false,
    welcome_title: trimValue(payload.welcome_title || DEFAULT_DINING_BUDDY_SETTINGS.welcome_title),
    welcome_subtitle: trimValue(payload.welcome_subtitle || DEFAULT_DINING_BUDDY_SETTINGS.welcome_subtitle),
    categories,
    questions: questions.length ? questions : DEFAULT_DINING_BUDDY_SETTINGS.questions.map((item) => ({
      question: item.question,
      options: item.options.map((option) => ({ ...option }))
    })),
    publish_limit_per_day: toNumber(payload.publish_limit_per_day, DEFAULT_DINING_BUDDY_SETTINGS.publish_limit_per_day),
    message_rate_limit_per_minute: toNumber(payload.message_rate_limit_per_minute, DEFAULT_DINING_BUDDY_SETTINGS.message_rate_limit_per_minute),
    default_max_people: toNumber(payload.default_max_people, DEFAULT_DINING_BUDDY_SETTINGS.default_max_people),
    max_max_people: toNumber(payload.max_max_people, DEFAULT_DINING_BUDDY_SETTINGS.max_max_people),
    auto_close_expired_hours: toNumber(payload.auto_close_expired_hours, DEFAULT_DINING_BUDDY_SETTINGS.auto_close_expired_hours)
  }
}

function normalizeTaxonomyOptions(items = [], fallbackItems = []) {
  const source = Array.isArray(items) && items.length ? items : fallbackItems
  return source
    .map((item, index) => {
      const sourceItem = item && typeof item === 'object' ? item : {}
      const fallback = fallbackItems.find((candidate) => candidate.key === trimValue(sourceItem.key)) || {}
      return {
        key: trimValue(sourceItem.key || fallback.key),
        label: trimValue(sourceItem.label || fallback.label),
        enabled: sourceItem.enabled !== false,
        sort_order: toNumber(sourceItem.sort_order, toNumber(fallback.sort_order, (index + 1) * 10)),
        aliases: cloneStringList(sourceItem.aliases).length ? cloneStringList(sourceItem.aliases) : cloneStringList(fallback.aliases)
      }
    })
    .filter((item) => item.key)
    .sort((left, right) => left.sort_order - right.sort_order)
}

export function normalizeMerchantTaxonomySettings(payload = {}) {
  return {
    merchant_types: normalizeTaxonomyOptions(payload.merchant_types, DEFAULT_MERCHANT_TAXONOMY_SETTINGS.merchant_types),
    business_categories: normalizeTaxonomyOptions(payload.business_categories, DEFAULT_MERCHANT_TAXONOMY_SETTINGS.business_categories)
  }
}

export function normalizeRiderRankSettings(payload = {}) {
  const levels = (Array.isArray(payload.levels) && payload.levels.length ? payload.levels : DEFAULT_RIDER_RANK_SETTINGS.levels)
    .map((item, index) => {
      const source = item && typeof item === 'object' ? item : {}
      const fallback = DEFAULT_RIDER_RANK_SETTINGS.levels.find((candidate) => Number(candidate.level) === Number(source.level)) || {}
      return {
        level: toNumber(source.level, toNumber(fallback.level, index + 1)),
        key: trimValue(source.key || fallback.key),
        name: trimValue(source.name || fallback.name),
        icon: trimValue(source.icon || fallback.icon),
        desc: trimValue(source.desc || fallback.desc),
        progress_template: trimValue(source.progress_template || fallback.progress_template),
        threshold_rules: cloneStringList(source.threshold_rules).length
          ? cloneStringList(source.threshold_rules)
          : cloneStringList(fallback.threshold_rules)
      }
    })
    .filter((item) => item.level)
    .sort((left, right) => left.level - right.level)

  return { levels }
}

export function normalizePlatformRuntimeSettings(payload = {}) {
  return {
    homeEntrySettings: normalizeHomeEntrySettings(payload.home_entry_settings || payload.homeEntrySettings || {}),
    errandSettings: normalizeErrandSettings(payload.errand_settings || payload.errandSettings || {}),
    diningBuddySettings: normalizeDiningBuddySettings(payload.dining_buddy_settings || payload.diningBuddySettings || {}),
    merchantTaxonomySettings: normalizeMerchantTaxonomySettings(payload.merchant_taxonomy_settings || payload.merchantTaxonomySettings || {}),
    riderRankSettings: normalizeRiderRankSettings(payload.rider_rank_settings || payload.riderRankSettings || {})
  }
}

export function buildHomeCategoriesForClient(runtimeSettings, clientScope) {
  const normalizedRuntime = normalizePlatformRuntimeSettings(runtimeSettings || {})
  return normalizedRuntime.homeEntrySettings.entries
    .filter((entry) => entry.enabled)
    .filter((entry) => !entry.client_scopes.length || entry.client_scopes.includes(clientScope))
    .map((entry) => ({
      id: entry.key,
      key: entry.key,
      name: entry.label,
      label: entry.label,
      bg: entry.bg_color,
      image: entry.image,
      icon: entry.icon,
      iconType: entry.icon_type,
      routeType: entry.route_type,
      routeValue: entry.route_value,
      badgeText: entry.badge_text,
      cityScopes: cloneStringList(entry.city_scopes),
      clientScopes: cloneStringList(entry.client_scopes)
    }))
}

export function isRuntimeRouteEnabled(runtimeSettings, routeType, routeValue, clientScope) {
  const normalizedRuntime = normalizePlatformRuntimeSettings(runtimeSettings || {})
  const enabledEntry = normalizedRuntime.homeEntrySettings.entries.find((entry) => (
    entry.enabled &&
    entry.route_type === trimValue(routeType) &&
    entry.route_value === trimValue(routeValue) &&
    (!entry.client_scopes.length || entry.client_scopes.includes(clientScope))
  ))
  if (!enabledEntry) {
    return false
  }
  if (trimValue(routeType) === 'feature' && trimValue(routeValue) === 'dining_buddy') {
    return normalizedRuntime.diningBuddySettings.enabled !== false
  }
  return true
}

export function isErrandServiceEnabled(runtimeSettings, serviceKey, clientScope) {
  const normalizedRuntime = normalizePlatformRuntimeSettings(runtimeSettings || {})
  if (!isRuntimeRouteEnabled(normalizedRuntime, 'feature', 'errand', clientScope)) {
    return false
  }
  return normalizedRuntime.errandSettings.services.some((item) => item.key === trimValue(serviceKey) && item.enabled)
}

export function findRiderRankLevel(runtimeSettings, level) {
  const normalizedRuntime = normalizePlatformRuntimeSettings(runtimeSettings || {})
  return normalizedRuntime.riderRankSettings.levels.find((item) => Number(item.level) === Number(level)) || normalizedRuntime.riderRankSettings.levels[0] || null
}

export function createPlatformRuntimeLoader(fetcher) {
  let cachedSettings = normalizePlatformRuntimeSettings({})
  let hasLoaded = false
  let loadingPromise = null

  function getCachedPlatformRuntimeSettings() {
    return normalizePlatformRuntimeSettings(cachedSettings)
  }

  async function loadPlatformRuntimeSettings(force = false) {
    if (hasLoaded && !force) {
      return getCachedPlatformRuntimeSettings()
    }
    if (loadingPromise && !force) {
      return loadingPromise
    }

    loadingPromise = Promise.resolve()
      .then(() => fetcher())
      .then((payload) => {
        cachedSettings = normalizePlatformRuntimeSettings(payload || {})
        hasLoaded = true
        return getCachedPlatformRuntimeSettings()
      })
      .catch(() => getCachedPlatformRuntimeSettings())
      .finally(() => {
        loadingPromise = null
      })

    return loadingPromise
  }

  return {
    getCachedPlatformRuntimeSettings,
    loadPlatformRuntimeSettings
  }
}
