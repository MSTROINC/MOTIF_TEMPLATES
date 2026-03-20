import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type {
  ChannelConfig,
  ChannelDataPayload,
  ChannelStatusPayload,
  ChannelSchemaPayload,
  ChannelPagination,
} from "./channel-types";

export type { ChannelConfig, ChannelPagination };

const SOCKET_URL =
  (import.meta as any).env?.VITE_CHANNEL_SOCKET_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3001");

const MOTIF_INSTANCE_ID =
  (import.meta as any).env?.VITE_CHANNEL_MOTIF_INSTANCE_ID || "";

function getUrlParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

let socket: Socket | null = null;
let channelId: string | null = null;

const _sourceCache: Record<
  string,
  { data: unknown[]; pagination: ChannelPagination; schema: Record<string, unknown> | null }
> = {};

function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      query: { motifInstanceId: MOTIF_INSTANCE_ID },
    });

    socket.on("connect", () => {
      console.log("[Channel] Connected to socket server");
      if (channelId) {
        socket!.emit("channel:join", { channelId });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[Channel] Disconnected:", reason);
    });
  }
  return socket;
}

function joinChannel(id: string) {
  channelId = id;
  const s = getSocket();
  s.emit("channel:join", { channelId: id });
}

export function useChannelStatus(): {
  connected: boolean;
  status: string;
  channelId: string | null;
} {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<string>("disconnected");

  useEffect(() => {
    const s = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      setStatus("disconnected");
    };
    const onStatus = (data: ChannelStatusPayload) => {
      setStatus(data.status);
      if (!channelId && data.channelId) {
        channelId = data.channelId;
      }
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("channel:status", onStatus);

    if (s.connected) setConnected(true);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("channel:status", onStatus);
    };
  }, []);

  return { connected, status, channelId };
}

export function useChannelData<T = Record<string, unknown>>(
  sourceKey: string
): {
  data: T[];
  pagination: ChannelPagination;
  schema: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
} {
  const cached = _sourceCache[sourceKey];
  const [data, setData] = useState<T[]>((cached?.data ?? []) as T[]);
  const [pagination, setPagination] = useState<ChannelPagination>(
    cached?.pagination ?? { total: 0, offset: 0, limit: 100, hasMore: false },
  );
  const [schema, setSchema] = useState<Record<string, unknown> | null>(cached?.schema ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSocket();

    const onData = (payload: ChannelDataPayload) => {
      if (payload.sourceKey === sourceKey) {
        _sourceCache[sourceKey] = {
          data: payload.data,
          pagination: payload.pagination,
          schema: payload.schema ?? null,
        };
        setData(payload.data as T[]);
        setPagination(payload.pagination);
        if (payload.schema) setSchema(payload.schema);
        setLoading(false);
        setError(null);
      }
    };

    const onError = (payload: { channelId: string; error: string }) => {
      setError(payload.error);
      setLoading(false);
    };

    s.on("channel:data", onData);
    s.on("channel:error", onError);

    return () => {
      s.off("channel:data", onData);
      s.off("channel:error", onError);
    };
  }, [sourceKey]);

  return { data, pagination, schema, loading, error };
}

export function useChannelRequest(): {
  fetchData: (sourceKey: string, params?: { limit?: number; offset?: number; filters?: Record<string, unknown> }) => void;
  paginate: (sourceKey: string, offset: number, limit?: number) => void;
  refresh: (sourceKey?: string) => void;
} {
  const fetchData = useCallback(
    (
      sourceKey: string,
      params?: { limit?: number; offset?: number; filters?: Record<string, unknown> }
    ) => {
      const s = getSocket();
      s.emit("channel:request", {
        channelId,
        sourceKey,
        action: "fetch",
        params,
      });
    },
    []
  );

  const paginate = useCallback(
    (sourceKey: string, offset: number, limit?: number) => {
      const s = getSocket();
      s.emit("channel:request", {
        channelId,
        sourceKey,
        action: "paginate",
        params: { offset, limit },
      });
    },
    []
  );

  const refresh = useCallback((sourceKey?: string) => {
    const s = getSocket();
    s.emit("channel:request", {
      channelId,
      sourceKey,
      action: "refresh",
    });
  }, []);

  return { fetchData, paginate, refresh };
}

export function useChannelSchema(): ChannelSchemaPayload["collections"] | null {
  const [collections, setCollections] =
    useState<ChannelSchemaPayload["collections"] | null>(null);

  useEffect(() => {
    const s = getSocket();
    const onSchema = (payload: ChannelSchemaPayload) => {
      setCollections(payload.collections);
    };
    s.on("channel:schema", onSchema);
    return () => {
      s.off("channel:schema", onSchema);
    };
  }, []);

  return collections;
}

export function initChannel(knownChannelId?: string) {
  const resolvedId = knownChannelId || getUrlParam("channelId") || undefined;
  if (resolvedId) {
    joinChannel(resolvedId);
  }
  getSocket();
}

export function getChannelId(): string | null {
  return channelId;
}

export function disconnectChannel() {
  if (socket) {
    if (channelId) {
      socket.emit("channel:leave", { channelId });
    }
    socket.disconnect();
    socket = null;
    channelId = null;
  }
}
