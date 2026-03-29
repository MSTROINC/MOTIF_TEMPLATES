# mSpace Motif Templates

Motifs are sandboxed React applications that run inside Hive Spaces. They consume live data through **Channels** (real-time Socket.IO streams from DataSpaces) and optionally provision **SpaceKits** (SQLite databases, Redis caches) for local persistence and computation. This directory contains the master template structure used to build motif apps.

---

## How Motifs Work

A Hive Space is a collaborative workspace with **slots** for motif apps. Each motif occupies a slot and runs in a Docker sandbox, isolated from other motifs. The parent page embeds the motif in an `<iframe>` and passes connection parameters (`?channelId=xxx&motifId=yyy`) via the URL.

```
┌─────────────────────────────────────────────────────┐
│  Hive Space                                         │
│  ┌───────────────────────────────────────────────┐  │
│  │  Motif (iframe)                               │  │
│  │                                               │  │
│  │  channel.config.ts ── defines data contract   │  │
│  │  spacekit.config.ts ── declares backend svcs  │  │
│  │  App.tsx ── UI with section markers           │  │
│  │  channel-client.ts ── Socket.IO hooks         │  │
│  │  spacekit-client.ts ── REST hooks             │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│          │                         │                │
│          ▼                         ▼                │
│   Channel (Socket.IO)       SpaceKit Proxy (HTTP)   │
│   ↕ DataSpace VEs           ↕ SQLite / Redis        │
└─────────────────────────────────────────────────────┘
```

### Build Pipeline (rushed-agent)

When a motif is launched, the automated build pipeline:

1. Reads `channel.config.ts` — creates a DataSpace with matching virtual endpoints via RAG
2. Reads `spacekit.config.ts` — provisions SpaceKit services (SQLite, Redis) in the sandbox
3. Rewrites `App.tsx` — replaces mock data sections with live `useChannelData()` hooks
4. Patches `channel-client.ts` — wires the socket URL and channelId from URL params
5. Runs `npm install && vite build --base ./` inside the sandbox
6. Deploys `dist/` to `/motif_apps/{motifId}/`
7. Initializes the channel — stores the `channelId` in `app_state`

### Runtime

1. Parent page loads the motif iframe with `?channelId=xxx&motifId=yyy`
2. `initChannel()` reads the URL param and joins the Socket.IO room
3. Backend replays cached data via `channel:data` events per source key
4. `useChannelData(sourceKey)` hooks update React state reactively
5. SpaceKit hooks (`useSqliteRows`, `useRedisValue`) call REST APIs through the proxy

---

## Channels

A **Channel** is the real-time data bridge between a Hive Space's DataSpace and the motif UI. It streams normalized data over Socket.IO and supports pagination, schema introspection, and live refresh.

### Defining a Channel Contract

Every motif must include `channel.config.ts` at the project root. This file declares the **collections** the motif expects — each collection maps to a `sourceKey` used by `useChannelData()`.

```typescript
import type { ChannelConfig } from "./lib/channel-types";

const config: ChannelConfig = {
  collections: {
    primary: {
      description: "Main data collection",
      fields: {
        id:    { type: "string", required: true },
        name:  { type: "string", required: true },
        value: { type: "number" },
        status: { type: "string", enum: ["active", "pending", "inactive"] },
      },
      pagination: { defaultLimit: 25, maxLimit: 100 },
    },
    metrics: {
      description: "Aggregated metrics for charts and KPIs",
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

**Options per field:** `required`, `enum` (allowed values), `description`

**Options per collection:** `description`, `pagination` (`defaultLimit`, `maxLimit`)

**Top-level:** `refreshInterval` in ms (0 = manual refresh only)

### Channel Hooks

All channel hooks are exported from `src/lib/channel-client.ts`:

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

| Hook | Returns | Purpose |
|------|---------|---------|
| `useChannelStatus()` | `{ connected, status, channelId }` | Socket connection state |
| `useChannelData<T>(sourceKey)` | `{ data, pagination, schema, loading, error }` | Subscribe to live collection data |
| `useChannelRequest()` | `{ fetchData, paginate, refresh }` | Emit fetch/paginate/refresh actions |
| `useChannelSchema()` | `collections \| null` | Schema definitions for all collections |

| Function | Purpose |
|----------|---------|
| `initChannel(knownChannelId?)` | Join the channel room — reads `?channelId` from URL if no arg passed. Call once at app startup. |
| `disconnectChannel()` | Leave the room and close the socket. Call on unmount. |

### Channel Socket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `channel:join` | Client → Server | `{ channelId }` |
| `channel:leave` | Client → Server | `{ channelId }` |
| `channel:data` | Server → Client | `{ channelId, sourceKey, data[], pagination, schema? }` |
| `channel:status` | Server → Client | `{ channelId, status, message? }` |
| `channel:schema` | Server → Client | `{ channelId, collections }` |
| `channel:error` | Server → Client | `{ channelId, error }` |
| `channel:request` | Client → Server | `{ channelId, sourceKey, action, params? }` |

### Channel Type Definitions

```typescript
interface ChannelFieldDef {
  type: "string" | "number" | "boolean" | "array" | "object";
  required?: boolean;
  enum?: string[];
  description?: string;
}

interface ChannelCollectionDef {
  description?: string;
  fields: Record<string, ChannelFieldDef>;
  pagination?: { defaultLimit?: number; maxLimit?: number };
}

interface ChannelConfig {
  collections: Record<string, ChannelCollectionDef>;
  refreshInterval?: number;
}

interface ChannelPagination {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}
```

---

## SpaceKits

**SpaceKits** are optional backend services provisioned inside the motif's Docker sandbox. They give motifs local persistent storage (SQLite) and caching (Redis) without requiring external infrastructure. All SpaceKit access is proxied through the mHive backend — the motif never communicates directly with the sandbox process.

### Available SpaceKits

| SpaceKit | Port | Backed By | Use Case |
|----------|------|-----------|----------|
| **SQLite** | 4500 | `better-sqlite3` + Hono HTTP server | Persistent relational data, CRUD, local tables |
| **Redis** | 4501 | `ioredis` + Hono HTTP adapter | Caching, counters, hash maps, key-value store |

### Declaring SpaceKits

Add `spacekit.config.ts` to the project root. Only declared services are provisioned — omit the file entirely if no SpaceKits are needed.

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
        notes: {
          columns: {
            id: "INTEGER PRIMARY KEY AUTOINCREMENT",
            content: "TEXT NOT NULL",
            category: "TEXT DEFAULT 'general'",
            pinned: "INTEGER DEFAULT 0",
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

**SQLite options:** `database` (filename), `tables` (each with `columns` using SQLite DDL types)

**Redis options:** `maxMemory` (e.g. `"64mb"`)

Tables are created automatically by the provisioner using the column definitions as DDL. The provisioner generates `CREATE TABLE IF NOT EXISTS` statements from the config.

### SpaceKit Hooks

All SpaceKit hooks and helpers are exported from `src/lib/spacekit-client.ts`:

```typescript
import { sqlite, redis, useSqliteRows, useRedisValue } from "@/lib/spacekit-client";
```

#### SQLite — React Hook

```typescript
const { data, total, loading, error, refresh } = useSqliteRows<Task>("tasks", {
  limit: 50,
  offset: 0,
  order_by: "created_at",
  dir: "desc",
});
```

#### SQLite — Imperative API

```typescript
await sqlite.tables();
await sqlite.rows("tasks", { limit: 25, offset: 0 });
await sqlite.insert("tasks", { title: "New task" });
await sqlite.update("tasks", 1, { completed: 1 });
await sqlite.delete("tasks", 1);
await sqlite.query("SELECT * FROM tasks WHERE completed = ?", [0]);
```

#### Redis — React Hook

```typescript
const { value, type, loading, error, refresh } = useRedisValue<number>("counter");
```

#### Redis — Imperative API

```typescript
await redis.get("my-key");
await redis.set("counter", 42, 3600);       // value, optional TTL in seconds
await redis.del("old-key");
await redis.keys("user:*", 100);             // pattern, limit
await redis.hashSet("user:1", { name: "Alice", role: "admin" });
await redis.hashGet("user:1");
```

### SpaceKit REST Routes (proxied)

All requests go through `{BACKEND}/v1/hive-spaces/motifs/{motifId}/spacekits/{skType}/proxy/{path}`.

**SQLite:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/tables` | List all tables |
| GET | `/tables/{name}/rows?limit=&offset=&order_by=&dir=` | Read rows |
| POST | `/tables/{name}/rows` | Insert row |
| PUT | `/tables/{name}/rows/{id}` | Update row |
| DELETE | `/tables/{name}/rows/{id}` | Delete row |
| POST | `/query` | Execute raw SQL `{ sql, params }` |
| GET | `/health` | Health check |

**Redis:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/get/{key}` | Get value (returns `{ key, type, value, ttl }`) |
| POST | `/set` | Set value `{ key, value, ttl? }` |
| DELETE | `/del/{key}` | Delete key |
| GET | `/keys?pattern=&limit=` | List keys |
| POST | `/hash/set` | Set hash fields `{ key, fields }` |
| GET | `/hash/{key}` | Get hash fields |
| GET | `/health` | Health check |
| GET | `/info` | Redis server info |

### SpaceKit Type Definitions

```typescript
interface SpaceKitTableDef {
  columns: Record<string, string>;
}

interface SpaceKitSqliteConfig {
  database?: string;
  tables?: Record<string, SpaceKitTableDef>;
}

interface SpaceKitRedisConfig {
  maxMemory?: string;
}

interface SpaceKitConfig {
  spacekits: {
    sqlite?: SpaceKitSqliteConfig;
    redis?: SpaceKitRedisConfig;
  };
}

interface SpaceKitRow {
  id?: number;
  [key: string]: unknown;
}

interface SpaceKitQueryResult {
  rows: SpaceKitRow[];
  count: number;
}

interface SpaceKitListResult {
  rows: SpaceKitRow[];
  total: number;
  limit: number;
  offset: number;
}
```

---

## Template Structure

```
motifs/base/
├── SKILL.md                     ← AI development guide
├── package.json                 ← dependencies
├── vite.config.ts               ← base: './', @/ alias
├── tsconfig.json                ← strict mode, path aliases
├── tsconfig.node.json           ← vite config TS settings
├── tailwind.config.js           ← dark mode, shadcn theme tokens, chart colors
├── postcss.config.js            ← tailwindcss + autoprefixer
├── components.json              ← shadcn/ui config (New York style)
├── index.html                   ← dark mode, Inter + JetBrains Mono fonts
└── src/
    ├── main.tsx                 ← React entry point
    ├── App.tsx                  ← main app with section markers
    ├── channel.config.ts        ← data contract (collections + fields)
    ├── spacekit.config.ts       ← SpaceKit service declarations
    ├── index.css                ← Tailwind layers + CSS variables + utilities
    ├── vite-env.d.ts            ← Vite type reference
    ├── lib/
    │   ├── channel-client.ts    ← Socket.IO hooks (useChannelData, etc.)
    │   ├── channel-types.ts     ← Channel TypeScript interfaces
    │   ├── spacekit-client.ts   ← SpaceKit REST hooks (useSqliteRows, etc.)
    │   ├── spacekit-types.ts    ← SpaceKit TypeScript interfaces
    │   └── utils.ts             ← cn() utility (clsx + tailwind-merge)
    └── components/ui/
        ├── button.tsx           ← shadcn Button
        └── card.tsx             ← shadcn Card
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Build | Vite | 5.x |
| UI | React | 18.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| Components | shadcn/ui (New York) | latest |
| Charts | recharts | 2.x |
| Icons | lucide-react | 0.460+ |
| Realtime | socket.io-client | 4.x |
| Fonts | Inter (UI), JetBrains Mono (code) | Google Fonts |

---

## App.tsx Section Markers

The build pipeline's rewrite agent parses `App.tsx` using section markers. These markers are **required** and must appear as comments in this exact format:

| Marker | Purpose |
|--------|---------|
| `// ─── Types` | TypeScript interfaces for each collection matching `channel.config.ts` |
| `// ─── Mock Data` | Sample data arrays matching the types — used for dev preview |
| `// ─── Data Helpers` | `useMotifData()` hook that reads channel data with mock fallback |
| `// ─── SpaceKit Data` | `useSpaceKitData()` hook if SpaceKits are declared (optional) |
| `// ─── App` | Main component consuming the hooks |

The rewrite agent replaces the Mock Data and Data Helpers sections with live channel integration while preserving the UI code in the App section.

### Mock Data Fallback Pattern

Always provide mock data so the motif renders during development and before the channel connects:

```typescript
function useMotifData() {
  const { data: liveRecords } = useChannelData<RecordType>("primary");
  return {
    records: liveRecords.length > 0 ? liveRecords : MOCK_RECORDS,
  };
}
```

---

## Creating a New Motif Template

### 1. Copy the Base

```bash
cp -r master-template-structure/motifs/base my-motif
cd my-motif
```

### 2. Define Your Data Contract

Edit `src/channel.config.ts` with the collections your motif needs:

```typescript
const config: ChannelConfig = {
  collections: {
    tickets: {
      description: "Support tickets from the connected API",
      fields: {
        id:       { type: "string", required: true },
        subject:  { type: "string", required: true },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        status:   { type: "string", enum: ["open", "in_progress", "resolved", "closed"] },
        created:  { type: "string", description: "ISO date" },
      },
      pagination: { defaultLimit: 50, maxLimit: 200 },
    },
    summary: {
      description: "Ticket counts by status",
      fields: {
        status: { type: "string", required: true },
        count:  { type: "number", required: true },
      },
    },
  },
  refreshInterval: 60000,
};
```

### 3. Declare SpaceKits (Optional)

Edit `src/spacekit.config.ts` if you need local persistence:

```typescript
const config: SpaceKitConfig = {
  spacekits: {
    sqlite: {
      database: "tickets.db",
      tables: {
        bookmarks: {
          columns: {
            id: "INTEGER PRIMARY KEY AUTOINCREMENT",
            ticket_id: "TEXT NOT NULL",
            note: "TEXT",
            created_at: "TEXT DEFAULT (datetime('now'))",
          },
        },
      },
    },
  },
};
```

### 4. Build the UI

Edit `src/App.tsx` with your interfaces, mock data, and components. Keep the section markers intact:

```typescript
// ─── Types ──────────────────────────────────────────────────
interface Ticket { id: string; subject: string; priority: string; status: string; created: string; }
interface Summary { status: string; count: number; }

// ─── Mock Data ──────────────────────────────────────────────
const MOCK_TICKETS: Ticket[] = [/* sample data */];
const MOCK_SUMMARY: Summary[] = [/* sample data */];

// ─── Data Helpers ───────────────────────────────────────────
function useMotifData() {
  const { data: tickets } = useChannelData<Ticket>("tickets");
  const { data: summary } = useChannelData<Summary>("summary");
  return {
    tickets: tickets.length > 0 ? tickets : MOCK_TICKETS,
    summary: summary.length > 0 ? summary : MOCK_SUMMARY,
  };
}

// ─── App ────────────────────────────────────────────────────
export default function App() {
  const { connected } = useChannelStatus();
  const { tickets, summary } = useMotifData();

  useEffect(() => {
    initChannel();
    return () => disconnectChannel();
  }, []);

  return (/* your UI */);
}
```

### 5. Add shadcn/ui Components

The template is pre-configured for shadcn/ui. Add components as needed:

```bash
npx shadcn@latest add table chart tabs dialog select badge
```

Components install to `src/components/ui/`.

### 6. Dev & Build

```bash
npm install
npm run dev        # dev server at localhost:5173
npm run build      # production build to dist/
```

---

## Built-In CSS Utilities

The template includes utility classes in `src/index.css` for consistent styling:

| Class | Purpose |
|-------|---------|
| `.motif-card` | Card container with border, rounded corners, padding |
| `.motif-kpi-value` | Large bold number for KPI displays |
| `.motif-kpi-label` | Small muted label text |
| `.animate-fade-in` | Fade-in animation (0.3s) |

CSS variables for the dark theme are defined on `:root` and follow the shadcn/ui convention (`--background`, `--foreground`, `--card`, `--primary`, `--muted-foreground`, `--border`, `--ring`, `--chart-1` through `--chart-5`, etc.).

---

## Rules

1. **`base: './'`** in `vite.config.ts` is mandatory — motifs are served at a subpath, not root
2. **Always dark mode** — `class="dark"` on `<html>` in `index.html`
3. **Section markers are required** — the rewrite agent parses them to patch `App.tsx`
4. **One `initChannel()` call** — in a top-level `useEffect`, paired with `disconnectChannel()` cleanup
5. **No routing** — motifs are single-page apps, no react-router
6. **Responsive** — must work in iframe viewport (min ~320px to full width)
7. **No external API calls** — all data comes through Channels or SpaceKit hooks
8. **SpaceKit is optional** — remove `spacekit.config.ts` if no backend services are needed
9. **SpaceKit config is declarative** — tables and schema are provisioned automatically at build time
10. **Do not modify hook signatures** in `channel-client.ts` — the rewrite agent depends on them
11. **Mock data must match `channel.config.ts`** — same field names, types, and structure
