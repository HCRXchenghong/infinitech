export interface LocationResult {
  latitude: number
  longitude: number
  address: string
  city?: string
  district?: string
  province?: string
}

export interface SelectedLocationResult {
  latitude: number
  longitude: number
  address: string
  name?: string
}

export function normalizeUniLocationResult(result?: Record<string, any>): Record<string, any>

export function normalizeLocationAddressPayload(payload?: Record<string, any>): Record<string, any>

export function buildLocationAddressFromParts(address?: Record<string, any>): string

export function createLocationService(options?: {
  uniApp?: any
  plusApp?: any
}): {
  getCurrentLocation(): Promise<LocationResult>
  chooseLocation(): Promise<SelectedLocationResult>
}

export function getCurrentLocation(options?: {
  uniApp?: any
  plusApp?: any
}): Promise<LocationResult>

export function chooseLocation(options?: {
  uniApp?: any
  plusApp?: any
}): Promise<SelectedLocationResult>
