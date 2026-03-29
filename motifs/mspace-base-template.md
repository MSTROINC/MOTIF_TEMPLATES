# mSpace Base Template

Baseline Vite + React template for building motif applications. Located at `master-template-structure/motifs/base/`.

## Purpose

Provides a clean starting point for motif development with the Channel system pre-wired, SpaceKit clients configured, shadcn/ui ready, and proper section markers for the rushed-agent rewrite pipeline.

## Stack

- **Vite 5** — build tool with `base: './'` for subpath serving
- **React 18** — UI framework
- **TypeScript 5** — type safety
- **Tailwind CSS 3** — styling with dark mode by default
- **shadcn/ui (New York)** — component library (`npx shadcn@latest add <component>`)
- **Socket.IO** — real-time channel data via `channel-client.ts`
- **SpaceKit** — local SQLite + Redis via `spacekit-client.ts`
- **recharts** — charts and data visualization
- **lucide-react** — icons

## File Structure

```
motifs/base/
├── SKILL.md                  ← development guide for building motifs
├── package.json              ← deps: react, socket.io-client, shadcn/ui, recharts
├── vite.config.ts            ← base: './', @/ alias
├── tsconfig.json             ← path aliases, strict mode
├── tsconfig.node.json        ← vite config TS settings
├── tailwind.config.js        ← dark mode, shadcn theme tokens, chart colors
├── postcss.config.js         ← tailwindcss + autoprefixer
├── components.json           ← shadcn/ui config (New York style)
├── index.html                ← dark mode, Inter + JetBrains Mono fonts
├── src/
│   ├── main.tsx              ← React entry point
│   ├── App.tsx               ← main app with mock data markers + channel/spacekit hooks
│   ├── channel.config.ts     ← data contract (collections/fields)
│   ├── spacekit.config.ts    ← SpaceKit services (SQLite tables, Redis)
│   ├── index.css             ← Tailwind + CSS variables + utility classes
│   ├── vite-env.d.ts
│   ├── lib/
│   │   ├── channel-client.ts ← Socket.IO hooks (useChannelData, useChannelStatus, etc.)
│   │   ├── channel-types.ts  ← ChannelConfig, payload types
│   │   ├── spacekit-client.ts← SpaceKit REST hooks (useSqliteRows, useRedisValue, etc.)
│   │   ├── spacekit-types.ts ← SpaceKitConfig, row types
│   │   └── utils.ts          ← cn() utility
│   └── components/ui/
│       ├── button.tsx         ← shadcn Button
│       └── card.tsx           ← shadcn Card
```

## Channel Integration

The template uses section markers in `App.tsx` that the rewrite agent parses:

- `// ─── Types` — interfaces for each collection
- `// ─── Mock Data` — sample data matching channel.config.ts
- `// ─── Data Helpers` — `useMotifData()` hook with mock fallback
- `// ─── SpaceKit Data` — `useSpaceKitData()` hook for SQLite/Redis
- `// ─── App` — main component consuming the data

At build time, the rushed-agent replaces mock data with live channel hooks and wires SpaceKit connections.

## SpaceKit Integration

The base template includes a SQLite SpaceKit with a sample `items` table. The `spacekit-client.ts` provides:

- **`useSqliteRows<T>(table)`** — reactive hook to fetch table rows
- **`sqlite.insert/update/delete/query`** — imperative CRUD
- **`useRedisValue<T>(key)`** — reactive hook for Redis values
- **`redis.get/set/del/keys/hashSet/hashGet`** — imperative Redis operations

All SpaceKit calls are proxied through the mHive backend — motifs never talk directly to sandbox processes.

## Usage

1. Copy `motifs/base/` to start a new motif template
2. Edit `src/channel.config.ts` to define required data collections
3. Edit `src/spacekit.config.ts` to declare needed backend services (or delete if not needed)
4. Update `src/App.tsx` with the UI, keeping mock data markers intact
5. Add shadcn/ui components as needed: `npx shadcn@latest add table chart tabs`
6. Build: `npm install && npm run build` produces `dist/`

## Build Verification

Template compiles to ~193 KB JS + 12 KB CSS (gzipped: ~61 KB + 3 KB).
