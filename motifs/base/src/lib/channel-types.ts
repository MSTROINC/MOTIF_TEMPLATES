export interface ChannelFieldDef {
  type: "string" | "number" | "boolean" | "array" | "object";
  required?: boolean;
  enum?: string[];
  description?: string;
}

export interface ChannelCollectionDef {
  description?: string;
  fields: Record<string, ChannelFieldDef>;
  pagination?: {
    defaultLimit?: number;
    maxLimit?: number;
  };
}

export interface ChannelConfig {
  collections: Record<string, ChannelCollectionDef>;
  refreshInterval?: number; // ms, 0 = manual only
}

export interface ChannelPagination {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface ChannelDataPayload {
  channelId: string;
  sourceKey: string;
  data: unknown[];
  pagination: ChannelPagination;
  schema?: Record<string, unknown>;
}

export interface ChannelStatusPayload {
  channelId: string;
  status: string;
  message?: string;
}

export interface ChannelSchemaPayload {
  channelId: string;
  collections: Record<
    string,
    {
      description?: string;
      fields: Record<string, { type: string; required?: boolean }>;
      recordCount?: number;
    }
  >;
}
