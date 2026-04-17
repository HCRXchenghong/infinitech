export interface MerchantTypeOption {
  key: string
  label: string
  enabled?: boolean
  sort_order?: number
  aliases?: string[]
  orderTypeLabel?: string
  legacyOrderTypeLabel?: string
  matchValues?: string[]
}

export interface BusinessCategoryOption {
  key: string
  label: string
  enabled?: boolean
  sort_order?: number
  aliases?: string[]
  matchValues?: string[]
}

export const ORDER_TYPE_OPTIONS: string[]
export const BUSINESS_CATEGORY_OPTIONS: string[]
export const MERCHANT_TYPE_OPTION_DETAILS: MerchantTypeOption[]
export const BUSINESS_CATEGORY_OPTION_DETAILS: BusinessCategoryOption[]

export function normalizeMerchantType(value?: any): string
export function normalizeBizType(value?: any): string
export function normalizeOrderTypeLabel(value?: any): string
export function merchantTypeFromOrderType(value?: any): string
export function buildMerchantTypeOptions(taxonomySettings?: Record<string, any> | null): MerchantTypeOption[]
export function buildBusinessCategoryOptions(taxonomySettings?: Record<string, any> | null): BusinessCategoryOption[]
export function resolveMerchantTypeOption(value?: any, taxonomySettings?: Record<string, any> | null): MerchantTypeOption
export function resolveBusinessCategoryOption(value?: any, taxonomySettings?: Record<string, any> | null): BusinessCategoryOption
export function normalizeBusinessCategoryKey(value?: any, taxonomySettings?: Record<string, any> | null): string
export function getBusinessCategoryLabelByKey(value?: any, taxonomySettings?: Record<string, any> | null): string
export function normalizeBusinessCategory(value?: any, taxonomySettings?: Record<string, any> | null): string
export function normalizeOrderStatus(status?: any, bizType?: string, options?: Record<string, any>): string
export function getOrderStatusText(status?: any, bizType?: string, options?: Record<string, any>): string
export function getOrderStatusClass(status?: any, bizType?: string, options?: Record<string, any>): string
export function formatOrderListTime(timeStr?: any): string
export function formatDateTime(value?: any): string
export function parseOrderProductList(order?: Record<string, any>): {
  productList: any[]
  itemCount: number
}
export function extractProductImageUrls(productList?: any[]): string[]
export function normalizeShopProjection(item?: Record<string, any>): Record<string, any>
export function normalizeFeaturedProductProjection(item?: Record<string, any>): Record<string, any>
export function normalizeOrderListItem(order?: Record<string, any>): Record<string, any>
export function normalizeAfterSalesItem(item?: Record<string, any>): Record<string, any>
