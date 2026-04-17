export type RoleType = "user" | "rider" | "admin" | "merchant"

export function formatUserId(id: number | string | null | undefined, role?: number): string
export function formatRoleId(id: number | string | null | undefined, roleType: RoleType): string
export function formatTime(value: Date | number | string | null | undefined): string
export function formatRelativeTime(timestamp: number, options?: {
  now?: number
}): string
export function formatMoney(amount: number | string | null | undefined): string
export function formatPrice(amount: number | string | null | undefined): string
export function debounce<T extends (...args: any[]) => any>(fn: T, delay?: number): (...args: Parameters<T>) => void
export function throttle<T extends (...args: any[]) => any>(fn: T, delay?: number): (...args: Parameters<T>) => void
export function deepClone<T>(value: T): T
export function showToast(title: string, icon?: string, options?: Record<string, any>): boolean
export function showLoading(title?: string, options?: Record<string, any>): boolean
export function hideLoading(options?: Record<string, any>): boolean
export function showConfirm(content: string, title?: string, options?: Record<string, any>): Promise<boolean>
export function getOrderStatusText(status: string): string
export function getOrderStatusColor(status: string): string
