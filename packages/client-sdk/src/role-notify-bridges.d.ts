export interface RoleStoredAuthIdentityResolverOptions {
  [key: string]: any
  uniApp?: any
  allowedAuthModes?: string[]
  allowEmptyAuthMode?: boolean
  tokenKeys?: string[]
  profileKey?: string
  idSources?: Array<string | ((context: Record<string, any>) => any)>
  role?: string
  userType?: string
}

export interface PushRegistrationBindings {
  registerCurrentPushDevice(options?: { force?: boolean }): Promise<any>
  unregisterCurrentPushDevice(): Promise<any>
  clearPushRegistrationState(): void
  getCachedRegistrationState(): Record<string, any> | null
  ackPushMessage(payload?: Record<string, any>): Promise<any>
}

export interface RealtimeNotifyBindings {
  connectCurrentRealtimeChannel(options?: Record<string, any>): Promise<any>
  disconnectRealtimeChannel(): void
  clearRealtimeState(): void
}

export function buildRoleStoredAuthIdentityResolverOptions(
  options?: RoleStoredAuthIdentityResolverOptions,
): RoleStoredAuthIdentityResolverOptions

export function createRoleStoredAuthIdentityResolver(
  options?: RoleStoredAuthIdentityResolverOptions & {
    createStoredAuthIdentityResolverImpl?: (options: RoleStoredAuthIdentityResolverOptions) => any
  },
): any

export function createRolePushRegistrationBindings(
  options?: RoleStoredAuthIdentityResolverOptions & {
    resolveAuthIdentity?: any
    registerPushDevice?: (...args: any[]) => Promise<any> | any
    unregisterPushDevice?: (...args: any[]) => Promise<any> | any
    ackPushMessage?: (...args: any[]) => Promise<any> | any
    getAppEnv?: (...args: any[]) => string
    createPushRegistrationManagerImpl?: (options: Record<string, any>) => PushRegistrationBindings
    createStoredAuthIdentityResolverImpl?: (options: RoleStoredAuthIdentityResolverOptions) => any
  },
): PushRegistrationBindings

export function createRoleRealtimeNotifyBindings(
  options?: RoleStoredAuthIdentityResolverOptions & {
    resolveAuthIdentity?: any
    loggerTag?: string
    storageKey?: string
    getSocketURL?: () => string
    createSocket?: (...args: any[]) => any
    createRealtimeNotifyBridgeImpl?: (options: Record<string, any>) => RealtimeNotifyBindings
    createStoredAuthIdentityResolverImpl?: (options: RoleStoredAuthIdentityResolverOptions) => any
  },
): RealtimeNotifyBindings
