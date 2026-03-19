# mSpace Base Template

Baseline Vite + React template optimized for building motif applications. Located at `_mspace-refs/templates/mspace/base/`.

## Purpose

Provides a clean starting point for motif development with the Channel system pre-wired, shadcn/ui configured, and proper markers for the rushed-agent rewrite pipeline.

## Stack

- **Vite 5** — build tool with `base: './'` for subpath serving
- **React 18** — UI framework
- **TypeScript 5** — type safety
- **Tailwind CSS 3** — styling with dark mode by default
- **shadcn/ui (New York)** — component library (`npx shadcn@latest add <component>`)
- **Socket.IO** — real-time channel data via `channel-client.ts`
- **recharts** — charts and data visualization
- **lucide-react** — icons

## File Structure

```
mspace/base/
├── SKILL.md                  ← development guide for building motifs
├── package.json              ← deps: react, socket.io-client, shadcn/ui, recharts
├── vite.config.ts            ← base: './', @/ alias
├── tsconfig.json             ← path aliases, strict mode
├── tailwind.config.js        ← dark mode, shadcn theme tokens
├── components.json           ← shadcn/ui config (New York style)
├── index.html                ← dark mode, Inter + JetBrains Mono fonts
├── src/
│   ├── main.tsx              ← React entry point
│   ├── App.tsx               ← main app with mock data markers + channel hooks
│   ├── channel.config.ts     ← data contract (collections/fields)
│   ├── index.css             ← Tailwind + CSS variables + utility classes
│   ├── vite-env.d.ts
│   ├── lib/
│   │   ├── channel-client.ts ← Socket.IO hooks (useChannelData, useChannelStatus, etc.)
│   │   ├── channel-types.ts  ← ChannelConfig, payload types
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
- `// ─── App` — main component consuming the data

At build time, the rushed-agent replaces mock data with live channel hooks.

## Usage

1. Copy `mspace/base/` to start a new motif template
2. Edit `channel.config.ts` to define required data collections
3. Update `App.tsx` with the UI, keeping mock data markers intact
4. Add shadcn/ui components as needed: `npx shadcn@latest add table chart`
5. Build: `npm install && npm run build` produces `dist/`

## Build Verification

Template compiles to ~193 KB JS + 12 KB CSS (gzipped: ~61 KB + 3 KB).
