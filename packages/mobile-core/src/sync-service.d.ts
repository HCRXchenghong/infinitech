export interface SyncRequestOptions {
  url: string;
  method?:
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "OPTIONS"
    | "HEAD"
    | "TRACE"
    | "CONNECT";
  data?: any;
  header?: Record<string, string>;
}

export interface SyncDatasetPayload {
  changed?: any[];
  deleted?: Array<number | string>;
  newVersion: number;
}

export interface SyncState {
  shops?: number;
  products?: number;
  orders?: number;
  [key: string]: number | undefined;
}

export interface SyncDataConditions {
  id?: number | string;
  shop_id?: number | string;
  user_id?: number | string;
  featured?: boolean;
  category?: string;
  [key: string]: any;
}

export interface SyncServiceInstance {
  init(): Promise<void>;
  syncInBackground(): Promise<void>;
  syncDataset(dataset: string, sinceVersion: number): Promise<void>;
  getData(
    dataset: string,
    conditions?: SyncDataConditions,
    options?: { preferFresh?: boolean },
  ): Promise<any>;
  getApiUrl(dataset: string, conditions?: SyncDataConditions): string;
  normalizeRecords(serverData: any): any[];
  forceSync(): Promise<void>;
}

export interface SyncLogger {
  warn?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
}

export interface MobileSyncServiceGetterOptions {
  getLocalDB: () => any;
  request?: (options: SyncRequestOptions) => Promise<any>;
  baseUrl?: string;
  timeout?: number;
  defaultHeader?: Record<string, string>;
  uniApp?: any;
  productShopMode?: "products-query" | "shop-menu";
  supportsShopCategory?: boolean;
  emitDataSynced?: (payload: { dataset: string; version: number }) => void;
  syncEventName?: string;
  isDev?: boolean;
  datasets?: string[];
  logger?: SyncLogger;
}

export function createUniSyncRequest(options?: {
  baseUrl?: string;
  timeout?: number;
  defaultHeader?: Record<string, string>;
  uniApp?: any;
}): (options: SyncRequestOptions) => Promise<any>;

export function isSyncNetworkError(error: any): boolean;

export function buildSyncApiUrl(
  dataset: string,
  conditions?: SyncDataConditions,
  options?: {
    productShopMode?: "products-query" | "shop-menu";
    supportsShopCategory?: boolean;
  },
): string;

export function normalizeSyncRecords(
  serverData: any,
  options?: {
    isDev?: boolean;
    warn?: (...args: any[]) => void;
  },
): any[];

export function createMobileSyncServiceGetter(
  options: MobileSyncServiceGetterOptions,
): () => SyncServiceInstance;

export function createSyncService(options: {
  getLocalDB: () => any;
  request: (options: SyncRequestOptions) => Promise<any>;
  buildApiUrl?: (dataset: string, conditions?: SyncDataConditions) => string;
  emitDataSynced?: (payload: { dataset: string; version: number }) => void;
  isDev?: boolean;
  datasets?: string[];
  logger?: SyncLogger;
}): SyncServiceInstance;
