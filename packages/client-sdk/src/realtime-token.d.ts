export const DEFAULT_SOCKET_TOKEN_STORAGE_KEY: "socket_token"
export const DEFAULT_SOCKET_TOKEN_ACCOUNT_KEY_STORAGE_KEY: "socket_token_account_key"

export interface SocketTokenResult {
  token: string
  userId: string
  role: string
}

export interface ResolveSocketTokenOptions {
  uniApp?: any
  storage?: {
    getItem?: (key: string) => any
    setItem?: (key: string, value: any) => any
    removeItem?: (key: string) => any
  }
  readStorage?: (key: string) => any
  writeStorage?: (key: string, value: any) => any
  removeStorage?: (key: string) => any
  userId?: string
  role?: string
  accountKey?: string
  identity?: Record<string, any>
  tokenStorageKey?: string
  tokenAccountKeyStorageKey?: string
  forceRefresh?: boolean
  socketUrl?: string
  getSocketUrl?: () => string
  getSocketURL?: () => string
  authHeader?: Record<string, any>
  authToken?: string
  fetchImpl?: (input: any, init?: Record<string, any>) => Promise<any> | any
  readAuthorizationHeader?: () => Record<string, any>
  requestSocketToken?: (options: {
    socketUrl: string
    userId: string
    role: string
    accountKey: string
    identity?: Record<string, any>
    authHeader?: Record<string, any>
    authToken?: string
    forceRefresh?: boolean
    uniApp?: any
    readAuthorizationHeader?: () => Record<string, any>
  }) => Promise<any> | any
  missingAccountKeyMessage?: string
  missingAuthorizationMessage?: string
  missingSocketUrlMessage?: string
  missingTokenMessage?: string
}

export function buildSocketTokenAccountKey(userId?: string, role?: string): string
export function extractSocketTokenResult(payload?: Record<string, any>): SocketTokenResult
export function clearCachedSocketToken(options?: {
  uniApp?: any
  storage?: {
    getItem?: (key: string) => any
    setItem?: (key: string, value: any) => any
    removeItem?: (key: string) => any
  }
  readStorage?: (key: string) => any
  writeStorage?: (key: string, value: any) => any
  removeStorage?: (key: string) => any
  tokenStorageKey?: string
  tokenAccountKeyStorageKey?: string
}): void
export function resolveSocketToken(options?: ResolveSocketTokenOptions): Promise<string>
