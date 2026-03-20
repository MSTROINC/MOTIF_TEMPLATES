# mSpace Motif Development

Build data-driven motif applications for the mHIVE platform. Motifs are lightweight React apps that connect to live data via the Channel system and render inside Hive Spaces.

## Stack

| Layer | Technology |
|-------|-----------|
| Build | Vite 5, TypeScript 5 |
| UI | React 18, Tailwind CSS 3, shadcn/ui (New York) |
| Data | Socket.IO client via `channel-client.ts` |
| Icons | lucide-react |
| Charts | recharts |

## Architecture

```
Template (this directory)
  ├── channel.config.ts    ← data contract (collections + fields)
  ├── src/App.tsx           ← UI with mock data markers
  ├── src/lib/channel-client.ts  ← Socket.IO hooks
  └── src/lib/channel-types.ts   ← shared type definitions

Build Pipeline (rushed-agent):
  1. Reads channel.config.ts → creates DataSpace + virtual endpoints via RAG
  2. Rewrites App.tsx → replaces mock data with useChannelData() hooks
  3. Patches channel-client.ts → wires socket URL and channelId from URL params
  4. Runs `npm install && vite build --base ./`
  5. Deploys dist/ to /motif_apps/{motifId}/
  6. Initializes channel → stores channelId in app_state

Runtime:
  1. Parent page loads motif in iframe with ?channelId=xxx
  2. initChannel() joins the socket room
  3. Backend replays cached data via channel:data events
  4. useChannelData(sourceKey) hooks update React state
```

## File Conventions

### `channel.config.ts` (required)

Defines the data contract. Each collection maps to a `sourceKey` used by `useChannelData()`.

```typescript
const config: ChannelConfig = {
  collections: {
    myData: {
      description: "What this collection contains",
      fields: {
        id:    { type: "string", required: true },
        name:  { type: "string", required: true },
        value: { type: "number" },
      },
      pagination: { defaultLimit: 25, maxLimit: 100 },
    },
  },
  refreshInterval: 30000,
};
```

### `src/App.tsx` (required)

Must include these section markers for the rewrite agent:

- `// ─── Types` — TypeScript interfaces for each collection
- `// ─── Mock Data` — sample arrays matching channel.config.ts
- `// ─── Data Helpers` — hook that reads channel data with mock fallback
- `// ─── App` — main component

### `src/lib/channel-client.ts` (required)

The Socket.IO client. Do not modify the hook signatures — the rewrite agent depends on them.

## Channel Hooks

```typescript
// Connection status
const { connected, status, channelId } = useChannelStatus();

// Subscribe to a collection (matches sourceKey from channel.config.ts)
const { data, pagination, schema, loading, error } = useChannelData<MyType>("myData");

// Request actions
const { fetchData, paginate, refresh } = useChannelRequest();

// Get schema definitions
const collections = useChannelSchema();
```

### Data Fallback Pattern

Always provide mock data so the motif renders during development and before the channel connects:

```typescript
function useMotifData() {
  const { data: liveData } = useChannelData<MyType>("myData");
  return {
    records: liveData.length > 0 ? liveData : MOCK_DATA,
  };
}
```

## Adding shadcn/ui Components

This template is configured for shadcn/ui. Add components with:

```bash
npx shadcn@latest add table chart tabs
```

Components install to `src/components/ui/`.

## Build & Dev

```bash
npm install       # install dependencies
npm run dev       # start dev server at localhost:5173
npm run build     # production build to dist/
```

## Key Rules

1. **`base: './'`** in vite.config.ts is mandatory — motifs are served at a subpath
2. **Always dark mode** — `class="dark"` on `<html>` in index.html
3. **Mock data markers** are required for the rewrite agent to patch App.tsx
4. **One `initChannel()` call** in a top-level useEffect, paired with `disconnectChannel()` cleanup
5. **No routing** — motifs are single-page, no react-router
6. **Responsive** — must work in the iframe viewport (min ~320px to full width)
7. **No external API calls** — all data comes through the channel system
