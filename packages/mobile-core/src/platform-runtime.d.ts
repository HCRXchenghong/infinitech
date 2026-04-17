export interface PlatformHomeEntry {
  key: string
  label: string
  icon: string
  icon_type: string
  bg_color: string
  sort_order: number
  enabled: boolean
  client_scopes: string[]
  city_scopes: string[]
  route_type: string
  route_value: string
  badge_text: string
  image?: string
}

export interface PlatformErrandService {
  key: string
  label: string
  desc: string
  icon: string
  color: string
  enabled: boolean
  sort_order: number
  route: string
  service_fee_hint: string
}

export interface PlatformDiningBuddyCategory {
  id: string
  label: string
  icon: string
  icon_type: string
  enabled: boolean
  sort_order: number
  color: string
}

export interface PlatformMerchantTaxonomyOption {
  key: string
  label: string
  enabled: boolean
  sort_order: number
  aliases: string[]
}

export interface RiderRankLevel {
  level: number
  key: string
  name: string
  icon: string
  desc: string
  progress_template: string
  threshold_rules: string[]
}

export interface PlatformRuntimeSettings {
  homeEntrySettings: {
    entries: PlatformHomeEntry[]
  }
  errandSettings: {
    page_title: string
    hero_title: string
    hero_desc: string
    detail_tip: string
    services: PlatformErrandService[]
  }
  diningBuddySettings: {
    enabled: boolean
    welcome_title: string
    welcome_subtitle: string
    categories: PlatformDiningBuddyCategory[]
    questions: Array<{
      question: string
      options: Array<{
        text: string
        icon: string
      }>
    }>
    publish_limit_per_day: number
    message_rate_limit_per_minute: number
    default_max_people: number
    max_max_people: number
    auto_close_expired_hours: number
  }
  merchantTaxonomySettings: {
    merchant_types: PlatformMerchantTaxonomyOption[]
    business_categories: PlatformMerchantTaxonomyOption[]
  }
  riderRankSettings: {
    levels: RiderRankLevel[]
  }
}

export interface PlatformRuntimeLoader {
  getCachedPlatformRuntimeSettings(): PlatformRuntimeSettings
  loadPlatformRuntimeSettings(force?: boolean): Promise<PlatformRuntimeSettings>
}

export const DEFAULT_HOME_ENTRY_SETTINGS: {
  entries: PlatformHomeEntry[]
}

export const DEFAULT_ERRAND_SETTINGS: {
  page_title: string
  hero_title: string
  hero_desc: string
  detail_tip: string
  services: PlatformErrandService[]
}

export const DEFAULT_DINING_BUDDY_SETTINGS: PlatformRuntimeSettings["diningBuddySettings"]

export const DEFAULT_MERCHANT_TAXONOMY_SETTINGS: PlatformRuntimeSettings["merchantTaxonomySettings"]

export const DEFAULT_RIDER_RANK_SETTINGS: {
  levels: RiderRankLevel[]
}

export function normalizeHomeEntrySettings(payload?: Record<string, any>): PlatformRuntimeSettings["homeEntrySettings"]
export function normalizeErrandSettings(payload?: Record<string, any>): PlatformRuntimeSettings["errandSettings"]
export function normalizeDiningBuddySettings(payload?: Record<string, any>): PlatformRuntimeSettings["diningBuddySettings"]
export function normalizeMerchantTaxonomySettings(payload?: Record<string, any>): PlatformRuntimeSettings["merchantTaxonomySettings"]
export function normalizeRiderRankSettings(payload?: Record<string, any>): PlatformRuntimeSettings["riderRankSettings"]
export function normalizePlatformRuntimeSettings(payload?: Record<string, any>): PlatformRuntimeSettings
export function buildHomeCategoriesForClient(runtimeSettings?: Record<string, any>, clientScope?: string): Array<Record<string, any>>
export function isRuntimeRouteEnabled(runtimeSettings?: Record<string, any>, routeType?: string, routeValue?: string, clientScope?: string): boolean
export function isErrandServiceEnabled(runtimeSettings?: Record<string, any>, serviceKey?: string, clientScope?: string): boolean
export function findRiderRankLevel(runtimeSettings?: Record<string, any>, level?: string | number): RiderRankLevel | null
export function createPlatformRuntimeLoader(fetcher: (...args: any[]) => Promise<any> | any): PlatformRuntimeLoader
