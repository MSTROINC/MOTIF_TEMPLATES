export interface SpaceKitTableDef {
  columns: Record<string, string>;
}

export interface SpaceKitSqliteConfig {
  database?: string;
  tables?: Record<string, SpaceKitTableDef>;
}

export interface SpaceKitRedisConfig {
  maxMemory?: string;
}

export interface SpaceKitConfig {
  spacekits: {
    sqlite?: SpaceKitSqliteConfig;
    redis?: SpaceKitRedisConfig;
  };
}

export interface SpaceKitRow {
  id?: number;
  [key: string]: unknown;
}

export interface SpaceKitQueryResult {
  rows: SpaceKitRow[];
  count: number;
}

export interface SpaceKitListResult {
  rows: SpaceKitRow[];
  total: number;
  limit: number;
  offset: number;
}
