import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type {
  ChannelConfig,
  ChannelDataPayload,
  ChannelStatusPayload,
  ChannelSchemaPayload,
  ChannelPagination,
} from "./channel-types";

// Re-export types for convenience
export type { ChannelConfig, ChannelPagination };

const SOCKET_URL =
  (import.meta as any).env?.VITE_CHANNEL_SOCKET_URL ||
  (typeof process !== "undefined" && (process as any).env?.CHANNEL_SOCKET_URL) ||
  "http://localhost:3001";

const MOTIF_INSTANCE_ID =
  (import.meta as any).env?.VITE_CHANNEL_MOTIF_INSTANCE_ID ||
  (typeof process !== "undefined" && (process as any).env?.CHANNEL_MOTIF_INSTANCE_ID) ||
  "";

let socket: Socket | null = null;
let channelId: string | null = null;

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

/**
 * React hook: get current channel connection status.
 */
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

/**
 * React hook: subscribe to live data for a specific source key.
 * Data updates automatically when the channel pushes new data.
 */
export function useChannelData<T = Record<string, unknown>>(
  sourceKey: string
): {
  data: T[];
  pagination: ChannelPagination;
  schema: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<ChannelPagination>({
    total: 0,
    offset: 0,
    limit: 100,
    hasMore: false,
  });
  const [schema, setSchema] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSocket();

    const onData = (payload: ChannelDataPayload) => {
      if (payload.sourceKey === sourceKey) {
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

/**
 * React hook: request data actions through the channel.
 */
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

/**
 * React hook: subscribe to the channel's schema definition.
 * Updated when the channel sends schema info.
 */
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

/**
 * Initialize the channel connection. Call once at app startup.
 * If a channelId is known, joins immediately. Otherwise, waits for
 * the server to assign one via a status event.
 */
export function initChannel(knownChannelId?: string) {
  if (knownChannelId) {
    joinChannel(knownChannelId);
  }
  getSocket(); // Ensures connection is established
}

/**
 * Disconnect from the channel. Call on app teardown.
 */
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
