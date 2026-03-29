/**
 * Local database typing.
 */

export interface LocalDB {
  init(): Promise<void>
  createTables(): Promise<void>
  getLocalSyncState(): Promise<{
    shops: number
    products: number
    orders: number
  }>
  saveSyncData(dataset: string, data: {
    changed?: any[]
    deleted?: Array<number | string>
    newVersion: number
  }): Promise<void>
  getLocalData(dataset: string, conditions?: {
    id?: number
    shop_id?: number
    user_id?: number
    featured?: boolean
  }): Promise<any[]>
  clearCache(): Promise<void>
}

declare function getLocalDB(): LocalDB

export default getLocalDB
