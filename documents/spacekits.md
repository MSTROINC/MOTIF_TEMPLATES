# SpaceKits

## What is a SpaceKit?

A SpaceKit is a self-contained backend service that runs alongside a Motif inside its Docker sandbox. It gives each Motif its own private infrastructure — a database, a cache, or both — without requiring external services or shared resources. The Motif app has full **bidirectional access**: it can read data, write data, update records, delete records, run raw queries, and manage its own state entirely through SpaceKit REST APIs. This makes Motifs capable of being complete applications with persistent storage, not just read-only dashboards.

SpaceKits are the mechanism that turns a Motif from a **data viewer** (Channel-only, one-way read from DataSpace) into a **full application** (reads external data via Channels, maintains its own state via SpaceKits, and writes back through CRUD operations). The Motif app communicates with SpaceKits through an authenticated HTTP proxy on the mHive backend — the browser never talks directly to the sandbox process.

```
┌── Motif Browser App ──────────────────────────────────┐
│                                                        │
│   useChannelData("tickets")     useSqliteRows("tasks") │
│         ↕ (read-only)              ↕ (read + write)    │
│                                                        │
│   Channel (Socket.IO)         SpaceKit Proxy (HTTP)    │
│   ↕ DataSpace VEs             ↕ GET/POST/PUT/DELETE    │
│                                                        │
└────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
    External APIs              Docker Sandbox
    (via Connections)          ┌──────────────┐
                               │ SQLite server │ :4500
                               │ Redis adapter │ :4501
                               └──────────────┘
```

### Channels vs SpaceKits

| | Channels | SpaceKits |
|---|---|---|
| Direction | One-way read (DataSpace → Motif) | Bidirectional read/write (Motif ↔ SpaceKit) |
| Data source | External APIs via DataSpace virtual endpoints | Local SQLite database or Redis in the sandbox |
| Protocol | Socket.IO (real-time push) | HTTP REST (request/response) |
| Persistence | Cached in backend, sourced from external APIs | Durable on disk (SQLite) or in-memory (Redis) |
| Use case | Display external data, metrics, API results | App state, user preferences, bookmarks, notes, queues, counters |

Together, Channels and SpaceKits enable motifs that **read from external sources and write to local storage** — a complete application model.

## Current State

### Built-in SpaceKits

| Type | Service | Port | Backed By | Status |
|------|---------|------|-----------|--------|
| `sqlite` | SQLite REST API | 4500 | `better-sqlite3` + Hono HTTP server | Production-ready |
| `redis` | Redis + REST adapter | 4501 | `ioredis` + Hono HTTP adapter | Production-ready |

Both SpaceKits are **built-in** (`source: "builtin"`) and automatically provisioned from config declarations. They run as Node.js processes inside the Motif's existing Docker sandbox — no additional containers needed.

### Database Tracking (`ng_spacekits`)

Each provisioned SpaceKit is tracked in the `ng_spacekits` table:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `app_id` | UUID → `ng_hive_space_apps` | Parent Motif (ON DELETE CASCADE) |
| `hive_space_id` | UUID → `ng_hive_spaces` | Parent Space (ON DELETE CASCADE) |
| `spacekit_type` | TEXT | `"sqlite"`, `"redis"` |
| `source` | TEXT | `"builtin"` (future: `"marketplace"`) |
| `status` | TEXT | `"pending"` → `"provisioning"` → `"running"` / `"stopped"` / `"error"` |
| `config` | JSONB | Parsed config from `spacekit.config.ts` |
| `connection_info` | JSONB | Runtime: `{ sandbox_name, port, database, data_path }` |
| `sandbox_id` | TEXT | Docker sandbox identifier |
| `created_by` | UUID | User who activated the SpaceKit |
| `created_at` / `updated_at` | TIMESTAMPTZ | Timestamps |

Unique constraint: `(app_id, spacekit_type)` — one SQLite and one Redis per Motif.

## Bidirectional App Access

This is the core capability that makes SpaceKits powerful. The Motif app has full CRUD access to its SpaceKit services through the proxy.

### SQLite: Full Relational Database Access

The SQLite SpaceKit gives each Motif a private relational database. The app can:

**Read data:**
```typescript
const { data, total } = useSqliteRows<Task>("tasks", {
  limit: 50, offset: 0, order_by: "created_at", dir: "desc"
});
```

**Create records:**
```typescript
const result = await sqlite.insert("tasks", {
  title: "New task",
  priority: "high",
  assigned_to: "user-123",
});
// result: { id: 4, changes: 1 }
```

**Update existing records:**
```typescript
await sqlite.update("tasks", taskId, {
  completed: 1,
  completed_at: new Date().toISOString(),
});
// result: { changes: 1 }
```

**Delete records:**
```typescript
await sqlite.delete("tasks", taskId);
// result: { changes: 1 }
```

**Run raw SQL (any query, including joins, aggregates, DDL):**
```typescript
// Complex queries
const stats = await sqlite.query(
  "SELECT status, COUNT(*) as count FROM tasks GROUP BY status", []
);

// Create tables at runtime
await sqlite.query(
  "CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, action TEXT, ts TEXT DEFAULT (datetime('now')))", []
);

// Insert with raw SQL
await sqlite.query(
  "INSERT INTO tasks (title, priority) VALUES (?, ?)", ["Deploy app", "critical"]
);
```

**Discover tables and schema:**
```typescript
const tables = await sqlite.tables();  // ["tasks", "notes", "logs"]
```

The raw SQL endpoint (`POST /query`) accepts any valid SQLite statement — `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `CREATE TABLE`, `ALTER TABLE`, `PRAGMA`, and more. This means apps can:
- Create new tables at runtime beyond what was declared in config
- Run complex joins across multiple tables
- Execute aggregate queries for dashboards
- Modify schema as needed

### Redis: Key-Value, Hash, and List Access

The Redis SpaceKit gives each Motif an in-memory data store. The app can:

**Simple key-value:**
```typescript
await redis.set("session:abc", { user: "Alice", role: "admin" }, 3600); // TTL in seconds
const { value, type, ttl } = await redis.get("session:abc");
await redis.del("session:abc");
```

**Hash maps (structured records):**
```typescript
await redis.hashSet("user:1", { name: "Alice", score: "42", level: "5" });
const { value } = await redis.hashGet("user:1");
// value: { name: "Alice", score: "42", level: "5" }
```

**Key discovery:**
```typescript
const { keys, total } = await redis.keys("user:*", 100);
```

**Additional capabilities via the REST adapter (not yet in spacekit-client.ts but available through the proxy):**

- **List push:** `POST /list/push` — `{ key, values, direction: "left" | "right" }` → push to Redis lists
- **Arbitrary commands:** `POST /command` — `{ command: "INCR", args: ["counter"] }` → execute any Redis command (except blocked: FLUSHALL, FLUSHDB, SHUTDOWN, CONFIG, DEBUG, SLAVEOF, REPLICAOF)
- **Server info:** `GET /info?section=memory` → Redis server stats
- **Type-aware GET:** `GET /get/:key` auto-detects string, list, set, hash, zset and returns the full value

### Proxy Architecture

All SpaceKit access is routed through the mHive backend proxy:

```
Browser → GET/POST/PUT/DELETE /v1/hive-spaces/motifs/{motifId}/spacekits/{skType}/proxy/{path}
  ↓ (authenticated, checks sk status == "running")
Backend → http://{sandbox_name}:{port}/{path}
  ↓
Sandbox SQLite/Redis service → response
  ↓
Backend → forwards response to browser
```

The proxy:
- Requires authentication (user must be logged in)
- Validates the SpaceKit exists and is in `running` status
- Forwards the HTTP method, body, and query string
- Passes through the response status code and content
- Supports `GET`, `POST`, `PUT`, `DELETE` methods
- Has a 30-second timeout per request

## Lifecycle

### Provisioning Flow

1. **Config parsed** — `spacekit_config_parser.py` extracts `spacekit.config.ts` from the motif template zip, parsing the TypeScript object literal into JSON
2. **DB rows created** — `ng_spacekits` rows inserted with `status: "pending"` for each declared SpaceKit type
3. **Inngest worker provisions** — The `rushed-agent` pipeline runs the `provision-spacekits` step:
   - **SQLite:** Creates the data directory, generates DDL from table definitions, runs `sqlite3` to create tables, copies the Hono REST server, installs npm deps, starts `node server.js --port 4500 --db /data/app.db` in background, health-checks `GET /health`
   - **Redis:** Starts `redis-server` in background, copies the Hono adapter, installs deps, starts `node server.js --port 4501`, health-checks both Redis and the adapter
4. **Status updated** — Worker patches `status: "running"` with `connection_info` containing the sandbox name, port, and data paths
5. **SpaceKit summary written** — Added to the motif's `app_state` for frontend display

### Rebuild

When a Motif is rebuilt, existing SpaceKits are torn down (processes killed, data files removed) and re-provisioned from the new config. This means **data does not persist across rebuilds** — the SQLite database and Redis data are recreated fresh.

### Deletion

When a Motif is deleted:
1. `_teardown_spacekits_for_motif` runs teardown commands in the sandbox (kills node/redis processes)
2. The motif row is deleted from `ng_hive_space_apps`
3. `ng_spacekits` rows are cascade-deleted via the `app_id` foreign key

### Manual Deactivation

Users can deactivate individual SpaceKits from the frontend SpaceKit panel:
1. `DELETE /v1/hive-spaces/motifs/{motifId}/spacekits/{skType}`
2. Runs teardown commands in the sandbox
3. Deletes the `ng_spacekits` row

## Template Declaration

Developers declare SpaceKits in `spacekit.config.ts` at the motif project root:

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
            priority: "TEXT DEFAULT 'medium'",
            created_at: "TEXT DEFAULT (datetime('now'))",
          },
        },
        notes: {
          columns: {
            id: "INTEGER PRIMARY KEY AUTOINCREMENT",
            task_id: "INTEGER REFERENCES tasks(id)",
            content: "TEXT NOT NULL",
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

Only declared SpaceKits are provisioned. Omit `spacekit.config.ts` entirely if no backend services are needed.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/spacekits/registry` | List available SpaceKit types with defaults |
| GET | `/v1/hive-spaces/motifs/{id}/spacekits` | List active SpaceKits for a motif |
| POST | `/v1/hive-spaces/motifs/{id}/spacekits` | Activate a SpaceKit |
| DELETE | `/v1/hive-spaces/motifs/{id}/spacekits/{type}` | Deactivate a SpaceKit |
| GET | `/v1/hive-spaces/motifs/{id}/spacekits/{type}/status` | Get SpaceKit status and connection info |
| PATCH | `/v1/hive-spaces/motifs/{id}/spacekits/{type}/status` | Update status (internal, worker-only) |
| GET/POST/PUT/DELETE | `/v1/hive-spaces/motifs/{id}/spacekits/{type}/proxy/{path}` | Proxy to SpaceKit service |

## SQLite REST API (in sandbox)

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| GET | `/health` | Health check | `{ status, database }` |
| GET | `/tables` | List all tables | `["tasks", "notes"]` |
| GET | `/tables/:name` | Table schema + row count | `{ name, columns, row_count }` |
| GET | `/tables/:name/rows` | Read rows (limit, offset, order_by, dir) | `{ rows, total, limit, offset }` |
| POST | `/tables/:name/rows` | Insert row | `{ id, changes }` |
| PUT | `/tables/:name/rows/:id` | Update row by rowid | `{ changes }` |
| DELETE | `/tables/:name/rows/:id` | Delete row by rowid | `{ changes }` |
| POST | `/query` | Execute raw SQL `{ sql, params }` | `{ rows, count }` or `{ changes, lastInsertRowid }` |

SQLite features: WAL journal mode, foreign keys enabled, parameterized queries for safety.

## Redis REST API (in sandbox)

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| GET | `/health` | Health check + memory usage | `{ status, ping, used_memory }` |
| GET | `/keys` | List keys (pattern, limit) | `{ keys, total }` |
| GET | `/get/:key` | Get value (auto-detects type) | `{ key, type, value, ttl }` |
| POST | `/set` | Set value (optional TTL) | `{ ok }` |
| DELETE | `/del/:key` | Delete key | `{ deleted }` |
| POST | `/hash/set` | Set hash fields | `{ ok }` |
| GET | `/hash/:key` | Get all hash fields | `{ key, value }` |
| POST | `/list/push` | Push to list (left/right) | `{ length }` |
| POST | `/command` | Execute any Redis command | `{ result }` |
| GET | `/info` | Redis server info (section param) | `{ info }` |

Blocked Redis commands: FLUSHALL, FLUSHDB, SHUTDOWN, CONFIG, DEBUG, SLAVEOF, REPLICAOF.

## Frontend

- **SpaceKit Badge** — A violet indicator on the Motif dock icon when SpaceKits are active
- **SpaceKit Panel** — Slide-out panel on the Motif fullscreen page showing active SpaceKits, status, config JSON, and connection details
- **Deactivation** — Users can deactivate individual SpaceKits from the panel

## Use Case Examples

**Task management within a dashboard:** Channel provides external ticket data; SQLite stores user bookmarks, notes, and custom tags on those tickets.

**Cached aggregations:** Channel streams raw data; the app computes aggregates and stores them in Redis for instant display on reload.

**User preferences:** SQLite stores per-user layout preferences, saved filters, and custom views that persist across sessions.

**Workflow state machine:** Redis tracks workflow step completion, locks, and counters; SQLite stores the full audit trail.

**Form builder:** SQLite stores form schemas and submitted responses; Channel provides external data for field auto-population.

## Possibilities and Future Directions

### Currently Possible

- Full CRUD on SQLite tables (insert, read, update, delete)
- Raw SQL execution (joins, aggregates, subqueries, DDL, PRAGMA)
- Runtime table creation beyond what was declared in config
- Redis key-value, hash, list, and arbitrary command execution
- Combining Channel data (external reads) with SpaceKit data (local read/write) in the same UI
- Multiple SQLite tables with foreign key relationships
- TTL-based Redis caching
- Parameterized SQL queries for safe user-input handling

### Future: Marketplace Integration

The `source` column in `ng_spacekits` supports `"builtin"` now but is designed for `"marketplace"` — custom SpaceKit types published to the mSpace marketplace. The `SPACEKIT_REGISTRY` in `registry.py` is the extension point: each new type defines its port, dependencies, default config, setup/start/teardown commands, and connection info builder.

### Future: Additional SpaceKit Types

The registry architecture supports any service that can run as a process in the sandbox and expose an HTTP API. Potential additions:
- **PostgreSQL** — full relational database for complex workloads
- **Vector store** — embeddings and similarity search within a Motif
- **Message queue** — async job processing within the sandbox
- **File storage** — local file management for uploads and exports

## Base Template Reference

The base Motif template at `master-template-structure/motifs/base/` includes full SpaceKit support:

- `src/spacekit.config.ts` — declares SQLite with an `items` table
- `src/lib/spacekit-types.ts` — TypeScript type definitions
- `src/lib/spacekit-client.ts` — `sqlite.*` and `redis.*` helpers plus `useSqliteRows` / `useRedisValue` React hooks
- `src/App.tsx` — demonstrates bidirectional SpaceKit usage: reads items via `useSqliteRows`, creates via `sqlite.insert`, updates via `sqlite.update`, deletes via `sqlite.delete`
