# mSpace Motif Development

Build data-driven motif applications for the mHIVE platform. Motifs are lightweight React apps that connect to live data via the Channel system, optionally use SpaceKits for local persistence, and render inside Hive Space iframes.

## Stack

| Layer | Technology |
|-------|-----------|
| Build | Vite 5, TypeScript 5 |
| UI | React 18, Tailwind CSS 3, shadcn/ui (New York) |
| Data | Socket.IO client via `channel-client.ts` |
| Persistence | SpaceKit SQLite + Redis via `spacekit-client.ts` |
| Icons | lucide-react |
| Charts | recharts |

## Architecture

```
Template (this directory)
  ├── channel.config.ts          ← data contract (collections + fields)
  ├── spacekit.config.ts         ← SpaceKit services (SQLite, Redis) — optional
  ├── src/App.tsx                ← UI with mock data markers
  ├── src/lib/channel-client.ts  ← Socket.IO hooks for live data
  ├── src/lib/channel-types.ts   ← Channel type definitions
  ├── src/lib/spacekit-client.ts ← SpaceKit REST hooks (sqlite, redis)
  └── src/lib/spacekit-types.ts  ← SpaceKit type definitions

Build Pipeline (rushed-agent):
  1. Reads channel.config.ts → creates DataSpace + virtual endpoints via RAG
  2. Reads spacekit.config.ts → provisions SpaceKits in sandbox (SQLite, Redis)
  3. Rewrites App.tsx → replaces mock data with useChannelData() hooks
  4. Patches channel-client.ts → wires socket URL and channelId from URL params
  5. Runs `npm install && vite build --base ./`
  6. Deploys dist/ to /motif_apps/{motifId}/
  7. Initializes channel → stores channelId in app_state

Runtime:
  1. Parent page loads motif in iframe with ?channelId=xxx&motifId=yyy
  2. initChannel() joins the socket room
  3. Backend replays cached data via channel:data events
  4. useChannelData(sourceKey) hooks update React state
  5. SpaceKit hooks (useSqliteRows, useRedisValue) call REST APIs via proxy
```

## File Conventions

### `channel.config.ts` (required)

Defines the data contract. Each collection maps to a `sourceKey` used by `useChannelData()`. The rushed-agent reads this at build time to create matching virtual endpoints from the connected DataSpace.

```typescript
import type { ChannelConfig } from "./lib/channel-types";

const config: ChannelConfig = {
  collections: {
    myData: {
      description: "What this collection contains — be specific for better RAG matching",
      fields: {
        id:    { type: "string", required: true },
        name:  { type: "string", required: true },
        value: { type: "number" },
        tags:  { type: "array", description: "List of string tags" },
      },
      pagination: { defaultLimit: 25, maxLimit: 100 },
    },
    summary: {
      description: "Aggregated metrics for dashboard KPIs",
      fields: {
        label: { type: "string", required: true },
        value: { type: "number", required: true },
      },
    },
  },
  refreshInterval: 30000,
};

export default config;
```

**Field types:** `string`, `number`, `boolean`, `array`, `object`

**Field options:** `required` (boolean), `enum` (string array of allowed values), `description` (string)

**Collection options:** `description` (string — helps RAG match to real endpoints), `fields` (Record), `pagination` ({ defaultLimit, maxLimit })

**Top-level options:** `collections` (Record), `refreshInterval` (ms, 0 = manual only)

### `spacekit.config.ts` (optional)

Declares backend services. Only listed services are provisioned — omit this file if no SpaceKits are needed.

```typescript
import type { SpaceKitConfig } from "./lib/spacekit-types";

const config: SpaceKitConfig = {
  spacekits: {
    sqlite: {
      database: "app.db",
      tables: {
        tasks: {
          columns: {
            id: "INTEGER PRIMARY KEY AUTOINCREMENT",
            title: "TEXT NOT NULL",
            completed: "INTEGER DEFAULT 0",
            created_at: "TEXT DEFAULT (datetime('now'))",
          },
        },
      },
    },
    redis: {
      maxMemory: "64mb",
    },
  },
};

export default config;
```

**SQLite column types:** Standard SQLite DDL — `INTEGER`, `TEXT`, `REAL`, `BLOB`, with constraints like `NOT NULL`, `DEFAULT`, `PRIMARY KEY AUTOINCREMENT`, `UNIQUE`.

**Common SQLite defaults:** `datetime('now')` for timestamps, `0`/`1` for booleans, string literals for text defaults.

### `src/App.tsx` (required)

Must include these section markers for the rewrite agent:

- `// ─── Types` — TypeScript interfaces for each collection
- `// ─── Mock Data` — sample arrays matching channel.config.ts
- `// ─── Data Helpers` — hook that reads channel data with mock fallback
- `// ─── SpaceKit Data` — hook for SpaceKit data (only if spacekit.config.ts exists)
- `// ─── App` — main component

### `src/lib/channel-client.ts` (required)

The Socket.IO client. Do not modify the hook signatures — the rewrite agent depends on them.

### `src/lib/spacekit-client.ts` (required if using SpaceKits)

REST client for SpaceKit services. Do not modify the proxy URL logic.

## Channel Hooks

```typescript
import {
  initChannel,
  disconnectChannel,
  useChannelStatus,
  useChannelData,
  useChannelRequest,
  useChannelSchema,
} from "@/lib/channel-client";
```

### useChannelStatus

```typescript
const { connected, status, channelId } = useChannelStatus();
```

Returns the socket connection state. `connected` is a boolean, `status` is a string (e.g. `"connected"`, `"fetching"`, `"disconnected"`), `channelId` is the active channel ID or null.

### useChannelData

```typescript
const { data, pagination, schema, loading, error } = useChannelData<MyType>("sourceKey");
```

Subscribe to live data for a specific collection. `sourceKey` must match a collection name in `channel.config.ts`. Returns typed array of records, pagination info, optional schema, loading state, and error string.

### useChannelRequest

```typescript
const { fetchData, paginate, refresh } = useChannelRequest();

fetchData("sourceKey", { limit: 50, offset: 0, filters: { status: "active" } });
paginate("sourceKey", 50, 25);
refresh("sourceKey");
refresh(); // refresh all
```

Emit request actions through the channel. `fetchData` sends a fetch with params, `paginate` requests a specific page, `refresh` re-fetches one or all collections.

### useChannelSchema

```typescript
const collections = useChannelSchema();
// collections?.myData?.fields, collections?.myData?.description, etc.
```

Subscribe to the channel's schema definitions for all collections.

### initChannel / disconnectChannel

```typescript
useEffect(() => {
  initChannel();
  return () => disconnectChannel();
}, []);
```

Call `initChannel()` once at app startup — it reads `?channelId` from the URL and joins the Socket.IO room. Call `disconnectChannel()` on unmount to leave the room and close the socket. You can optionally pass a known channelId: `initChannel("my-channel-id")`.

## SpaceKit Hooks

```typescript
import { sqlite, redis, useSqliteRows, useRedisValue } from "@/lib/spacekit-client";
```

### useSqliteRows

```typescript
const { data, total, loading, error, refresh } = useSqliteRows<Task>("tasks", {
  limit: 50,
  offset: 0,
  order_by: "created_at",
  dir: "desc",
});
```

Reactive hook that fetches rows from a SQLite table. Call `refresh()` after mutations. All options are optional.

### sqlite (imperative)

```typescript
await sqlite.tables();                                    // list all tables
await sqlite.rows("tasks", { limit: 25 });                // read rows
await sqlite.insert("tasks", { title: "New" });           // insert → { id, changes }
await sqlite.update("tasks", 1, { completed: 1 });        // update → { changes }
await sqlite.delete("tasks", 1);                          // delete → { changes }
await sqlite.query("SELECT COUNT(*) as c FROM tasks", []); // raw SQL → { rows, count }
```

### useRedisValue

```typescript
const { value, type, loading, error, refresh } = useRedisValue<number>("counter");
```

Reactive hook that fetches a single Redis value. `type` is the Redis data type (string, hash, list, etc.).

### redis (imperative)

```typescript
await redis.get("key");                                   // → { key, type, value, ttl }
await redis.set("key", value, ttl?);                       // set with optional TTL (seconds)
await redis.del("key");                                    // → { deleted }
await redis.keys("pattern*", 100);                         // → { keys, total }
await redis.hashSet("user:1", { name: "A", role: "B" });  // set hash fields
await redis.hashGet("user:1");                             // → { key, value: Record }
```

## Data Fallback Pattern

Always provide mock data so the motif renders during development and before the channel connects:

```typescript
// ─── Mock Data ──────────────────────────────────────────────
const MOCK_ITEMS: Item[] = [
  { id: "1", name: "Alpha", value: 100 },
  { id: "2", name: "Bravo", value: 200 },
];

// ─── Data Helpers ───────────────────────────────────────────
function useMotifData() {
  const { data: liveData } = useChannelData<Item>("items");
  return {
    items: liveData.length > 0 ? liveData : MOCK_ITEMS,
  };
}
```

Mock data arrays must match the TypeScript interfaces and the field definitions in `channel.config.ts`. Use realistic-looking sample data — the mock data is what displays during development.

## SpaceKit Data Pattern

For SpaceKits, follow the same fallback approach:

```typescript
// ─── SpaceKit Data ──────────────────────────────────────────
function useSpaceKitData() {
  const { data, loading, refresh } = useSqliteRows<Task>("tasks");
  return {
    tasks: data.length > 0 ? data : MOCK_TASKS,
    tasksLoading: loading,
    refreshTasks: refresh,
  };
}
```

After mutations, call the `refresh` function to re-fetch:

```typescript
const handleAdd = async () => {
  await sqlite.insert("tasks", { title: newTitle });
  refreshTasks();
};
```

## Styling

### Theme System

The template uses CSS variables for a cohesive dark theme. All colors are defined in `src/index.css` as HSL values and consumed through Tailwind via `tailwind.config.js`:

| Variable | Purpose |
|----------|---------|
| `--background` | Page background |
| `--foreground` | Default text color |
| `--card` / `--card-foreground` | Card surfaces |
| `--primary` / `--primary-foreground` | Primary actions |
| `--muted` / `--muted-foreground` | Subdued elements |
| `--border` | Borders and dividers |
| `--ring` | Focus rings |
| `--destructive` | Delete/error actions |
| `--chart-1` through `--chart-5` | Chart color palette |
| `--radius` | Border radius base (0.5rem) |

### Utility Classes

| Class | What it does |
|-------|-------------|
| `.motif-card` | Card with border, rounded corners, card background, padding |
| `.motif-kpi-value` | Large semibold number (2xl, tight tracking) |
| `.motif-kpi-label` | Small uppercase muted label |
| `.animate-fade-in` | Fade up animation (0.3s ease-out) |

### Fonts

- **Inter** — UI text (400, 500, 600, 700 weights)
- **JetBrains Mono** — Monospace for code and numeric values (400, 500 weights)

Both are loaded from Google Fonts in `index.html`. Use `font-sans` for Inter and `font-mono` for JetBrains Mono via Tailwind.

### Adding shadcn/ui Components

This template is configured for shadcn/ui (New York style). Add components with:

```bash
npx shadcn@latest add table chart tabs dialog select badge tooltip scroll-area dropdown-menu
```

Components install to `src/components/ui/`. Already included: `button.tsx`, `card.tsx`.

### Recharts

For data visualization, use recharts (already in dependencies):

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

<ResponsiveContainer width="100%" height={200}>
  <BarChart data={metrics}>
    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
    <Tooltip
      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
      labelStyle={{ color: "hsl(var(--foreground))" }}
    />
    <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

Use `hsl(var(--chart-N))` for chart colors (1 through 5 are pre-defined).

## Build & Dev

```bash
npm install       # install dependencies
npm run dev       # start dev server at localhost:5173
npm run build     # production build to dist/
npm run preview   # preview production build
```

## Complete App.tsx Example

```typescript
import { useEffect, useState } from "react";
import { initChannel, disconnectChannel, useChannelStatus, useChannelData } from "@/lib/channel-client";
import { sqlite, useSqliteRows } from "@/lib/spacekit-client";
import { Activity, TrendingUp, Wifi, WifiOff, Database, Plus } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────
interface Record { id: string; name: string; value: number; status: "active" | "pending"; }
interface Metric { label: string; value: number; }
interface Note { id: number; content: string; created_at: string; }

// ─── Mock Data ──────────────────────────────────────────────
const MOCK_RECORDS: Record[] = [
  { id: "1", name: "Alpha", value: 1250, status: "active" },
  { id: "2", name: "Bravo", value: 830, status: "pending" },
];

const MOCK_METRICS: Metric[] = [
  { label: "Revenue", value: 48200 },
  { label: "Users", value: 1284 },
];

const MOCK_NOTES: Note[] = [
  { id: 1, content: "First note", created_at: "2026-01-01" },
];

// ─── Data Helpers ───────────────────────────────────────────
function useMotifData() {
  const { data: records } = useChannelData<Record>("primary");
  const { data: metrics } = useChannelData<Metric>("metrics");
  return {
    records: records.length > 0 ? records : MOCK_RECORDS,
    metrics: metrics.length > 0 ? metrics : MOCK_METRICS,
  };
}

// ─── SpaceKit Data ──────────────────────────────────────────
function useSpaceKitData() {
  const { data, loading, refresh } = useSqliteRows<Note>("notes");
  return {
    notes: data.length > 0 ? data : MOCK_NOTES,
    notesLoading: loading,
    refreshNotes: refresh,
  };
}

// ─── App ────────────────────────────────────────────────────
export default function App() {
  const { connected, status } = useChannelStatus();
  const { records, metrics } = useMotifData();
  const { notes, refreshNotes } = useSpaceKitData();

  useEffect(() => {
    initChannel();
    return () => disconnectChannel();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">My Motif</h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {connected ? (
            <><Wifi className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">{status}</span></>
          ) : (
            <><WifiOff className="h-3.5 w-3.5" /><span>Offline</span></>
          )}
        </div>
      </header>

      {/* KPIs, tables, charts, SpaceKit CRUD — your UI here */}
    </div>
  );
}
```

## Key Rules

1. **`base: './'`** in vite.config.ts is mandatory — motifs are served at a subpath
2. **Always dark mode** — `class="dark"` on `<html>` in index.html
3. **Mock data markers** are required for the rewrite agent to patch App.tsx
4. **One `initChannel()` call** in a top-level useEffect, paired with `disconnectChannel()` cleanup
5. **No routing** — motifs are single-page, no react-router
6. **Responsive** — must work in the iframe viewport (min ~320px to full width)
7. **No external API calls** — all data comes through channels or SpaceKit hooks
8. **SpaceKit is optional** — remove `spacekit.config.ts` if no backend services needed
9. **SpaceKit config is declarative** — tables/schema are provisioned automatically at build time
10. **Do not modify hook signatures** in channel-client.ts or spacekit-client.ts
11. **Mock data must match types and channel.config.ts** — same fields, types, realistic values
12. **Use `refresh()` after SpaceKit mutations** — hooks don't auto-refresh after writes
13. **Wrap SpaceKit writes in try/catch** — service may not be available during local dev
14. **Use CSS variables for colors** — `hsl(var(--chart-1))` not hardcoded hex values
15. **Use shadcn/ui for complex UI** — `npx shadcn@latest add <component>` installs to `src/components/ui/`
