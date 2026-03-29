import { useState, useEffect, useCallback } from "react";
import type {
  SpaceKitRow,
  SpaceKitListResult,
  SpaceKitQueryResult,
} from "./spacekit-types";

export type { SpaceKitRow, SpaceKitListResult, SpaceKitQueryResult };

/**
 * SpaceKit proxy base URL.
 *
 * At build time, the rushed-agent injects the motifId into the env.
 * The proxy routes through the mHive backend to the SpaceKit service
 * running in the sandbox.
 */
const BACKEND_URL =
  (import.meta as any).env?.VITE_SPACEKIT_BACKEND_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:8101");

const MOTIF_ID =
  (import.meta as any).env?.VITE_SPACEKIT_MOTIF_ID || "";

function getMotifId(): string {
  if (MOTIF_ID) return MOTIF_ID;
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("motifId") || "";
}

function proxyUrl(skType: string, path: string): string {
  const mid = getMotifId();
  return `${BACKEND_URL}/v1/hive-spaces/motifs/${mid}/spacekits/${skType}/proxy/${path}`;
}

async function skFetch<T>(skType: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(proxyUrl(skType, path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SpaceKit ${skType} error ${res.status}: ${text}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// SQLite helpers
// ---------------------------------------------------------------------------

export const sqlite = {
  tables: () => skFetch<string[]>("sqlite", "tables"),

  rows: (table: string, opts?: { limit?: number; offset?: number; order_by?: string; dir?: "asc" | "desc" }) => {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    if (opts?.order_by) params.set("order_by", opts.order_by);
    if (opts?.dir) params.set("dir", opts.dir);
    const qs = params.toString();
    return skFetch<SpaceKitListResult>("sqlite", `tables/${table}/rows${qs ? `?${qs}` : ""}`);
  },

  insert: (table: string, row: Record<string, unknown>) =>
    skFetch<{ id: number; changes: number }>("sqlite", `tables/${table}/rows`, {
      method: "POST",
      body: JSON.stringify(row),
    }),

  update: (table: string, id: number | string, data: Record<string, unknown>) =>
    skFetch<{ changes: number }>("sqlite", `tables/${table}/rows/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (table: string, id: number | string) =>
    skFetch<{ changes: number }>("sqlite", `tables/${table}/rows/${id}`, {
      method: "DELETE",
    }),

  query: (sql: string, params: unknown[] = []) =>
    skFetch<SpaceKitQueryResult>("sqlite", "query", {
      method: "POST",
      body: JSON.stringify({ sql, params }),
    }),
};

// ---------------------------------------------------------------------------
// Redis helpers
// ---------------------------------------------------------------------------

export const redis = {
  get: (key: string) =>
    skFetch<{ key: string; type: string; value: unknown; ttl: number }>("redis", `get/${key}`),

  set: (key: string, value: unknown, ttl?: number) =>
    skFetch<{ ok: boolean }>("redis", "set", {
      method: "POST",
      body: JSON.stringify({ key, value, ttl }),
    }),

  del: (key: string) =>
    skFetch<{ deleted: number }>("redis", `del/${key}`, { method: "DELETE" }),

  keys: (pattern = "*", limit = 100) => {
    const params = new URLSearchParams({ pattern, limit: String(limit) });
    return skFetch<{ keys: string[]; total: number }>("redis", `keys?${params}`);
  },

  hashSet: (key: string, fields: Record<string, string>) =>
    skFetch<{ ok: boolean }>("redis", "hash/set", {
      method: "POST",
      body: JSON.stringify({ key, fields }),
    }),

  hashGet: (key: string) =>
    skFetch<{ key: string; value: Record<string, string> }>("redis", `hash/${key}`),
};

// ---------------------------------------------------------------------------
// React hooks
// ---------------------------------------------------------------------------

/**
 * React hook: fetch SQLite table rows reactively.
 */
export function useSqliteRows<T extends SpaceKitRow = SpaceKitRow>(
  table: string,
  opts?: { limit?: number; offset?: number; order_by?: string; dir?: "asc" | "desc" },
): {
  data: T[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!getMotifId()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    sqlite
      .rows(table, opts)
      .then((result) => {
        if (cancelled) return;
        setData(result.rows as T[]);
        setTotal(result.total);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [table, opts?.limit, opts?.offset, opts?.order_by, opts?.dir, tick]);

  return { data, total, loading, error, refresh };
}

/**
 * React hook: fetch a Redis value reactively.
 */
export function useRedisValue<T = unknown>(key: string): {
  value: T | null;
  type: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [value, setValue] = useState<T | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!getMotifId()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    redis
      .get(key)
      .then((result) => {
        if (cancelled) return;
        setValue(result.value as T);
        setType(result.type);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [key, tick]);

  return { value, type, loading, error, refresh };
}
