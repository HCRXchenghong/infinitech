export interface LocalDBOptions {
  dbName?: string
  dbPath?: string
  plusRuntime?: any
  uniApp?: any
  logger?: {
    error?: (...args: any[]) => any
  }
}

export class LocalDB {
  constructor(options?: LocalDBOptions)
  init(): Promise<void>
  createTables(): Promise<void>
  getLocalSyncState(): Promise<{
    shops: number
    products: number
    orders: number
  }>
  saveSyncData(dataset: string, data?: {
    changed?: any[]
    deleted?: Array<number | string>
    newVersion?: number
  }): Promise<void>
  getLocalData(dataset: string, conditions?: {
    id?: number | string
    shop_id?: number | string
    user_id?: number | string
    featured?: boolean
  }): Promise<any[]>
  clearCache(): Promise<void>
}

export function createLocalDB(options?: LocalDBOptions): LocalDB
export function resetLocalDBForTest(): void

declare function getLocalDB(): LocalDB

export default getLocalDB
