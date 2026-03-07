# Dashboard Template (mspace-react-dashboard)

Motif template for building rich, multi-collection data dashboards from mSpace Virtual Endpoint payloads.

## Stack

| Layer | Technology |
|---|---|
| Framework | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS + Shadcn UI (new-york, light/dark) |
| Charts | Recharts (via custom chart.tsx wrapper) |
| Port | 5173 |

## Alias

`mspace-react-dashboard` — used in `Sandbox.create()` calls.

## What It Does

Provides a pre-configured sandbox optimised for rendering mSpace Virtual Endpoint payloads. The AI agent edits `src/App.tsx` to populate the `endpointContext`, `collections`, and `insights` constants with real data, producing a tabbed, multi-collection dashboard with summary stats, data tables, and an AI insights panel.

## Components (beyond base_template)

| Component | File | Purpose |
|---|---|---|
| Badge | `components/ui/badge.tsx` | Status indicators, cache/live tag, record counts |
| Tabs | `components/ui/tabs.tsx` | One tab per Virtual Endpoint collection |
| Progress | `components/ui/progress.tsx` | Numeric ratio / completion visualisation |
| Separator | `components/ui/separator.tsx` | Visual dividers between layout sections |

## Virtual Endpoint Data Model

The prompt instructs the agent to structure the UI around three keys:

```
context      → header metadata (space name, strategy, execution_time_ms, cache_hit)
collections  → array of source groups, each rendered as a Tabs panel with a Table
insights     → AI summary rendered in a bottom Card
```

## Directory Structure

```
templates/dashboard_template/
├── motif.toml
├── motif.Dockerfile
├── compile_page.sh
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── components.json
├── index.html
├── prompt.ts
└── src/
    ├── App.tsx            ← AI agent edits this
    ├── main.tsx
    ├── index.css
    ├── vite-env.d.ts
    ├── lib/utils.ts
    └── components/ui/
        ├── button.tsx
        ├── card.tsx
        ├── table.tsx
        ├── chart.tsx
        ├── badge.tsx
        ├── tabs.tsx
        ├── progress.tsx
        └── separator.tsx
```

## Publishing

```bash
cd templates/dashboard_template
set -a && source ../../.env
export space_ACCESS_TOKEN="$space_API_KEY"
pnpm dlx @Motif/cli@latest Motif create mspace-react-dashboard \
  --dockerfile motif.Dockerfile \
  --cmd /compile_page.sh \
  --ready-cmd "sleep 1"
```

After publishing, save the returned `motif_id` back into `motif.toml`.

## Integrating in the mSpace Application

In `src/inngest/functions.ts`, switch the `Sandbox.create()` alias:

```typescript
const sandbox = await Sandbox.create("mspace-react-dashboard", {
  apiKey: process.env.space_API_KEY,
  envs: sandboxEnv,
  allowInternetAccess: true,
});
```

The sandbox URL is resolved on port 5173 (same as base template — no change to `resolveSandboxUrl()`).
