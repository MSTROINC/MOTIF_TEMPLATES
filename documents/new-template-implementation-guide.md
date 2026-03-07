# New MSTRO Motif Template Implementation Guide

This guide summarizes the required structure in `MOTIF_TEMPLATES` and defines an architecture for a new template that integrates mSpace data models through an AI agent.

## 1) Canonical Template Structure

Use `templates/base_template` as the baseline and only add stack-specific pieces.

Required files:

- `motif.toml`: template metadata (`team_id`, `start_cmd`, `dockerfile`, `motif_name`, optional `motif_id` after publish)
- `motif.Dockerfile`: bakes all dependencies at build time
- `compile_page.sh`: starts dev server and performs HTTP health check
- `package.json`: framework + UI dependencies and scripts
- `vite.config.ts`: host binding to `0.0.0.0`, fixed port (`5173`)
- `components.json`: shadcn config for aliases and CSS variables
- `prompt.ts`: AI-agent operating contract and constraints
- `src/App.tsx`: single AI-editable file
- `src/main.tsx`, `src/index.css`, `src/lib/utils.ts`, `src/components/ui/*`: runtime shell + shared UI primitives

Optional stack extension shown in `templates/earth_template`:

- `vite-plugin-cesium` in `vite.config.ts`
- `cesium` + `resium` packages
- Earth-specific prompt rules in `prompt.ts`

## 2) Runtime Architecture (mSpace + Motif + Agent)

1. User asks for a visualization/report in mSpace.
2. Inngest flow creates an E2B/Motif sandbox using `Sandbox.create("<motif_name>")`.
3. Sandbox boots from prebuilt `motif.Dockerfile` image.
4. `compile_page.sh` runs the dev server (`npm run dev -- --host 0.0.0.0`) and waits for HTTP 200.
5. mSpace resolves sandbox host on the configured port (5173 for Vite templates).
6. AI agent edits `src/App.tsx` only, using `prompt.ts` rules + data tools.
7. Hot reload updates the preview iframe immediately.
8. Sandbox times out by platform policy (typically 30 minutes).

## 3) Data Architecture for mSpace Integration

Target data source should be a Virtual Endpoint execution payload:

- `context`: execution metadata (strategy, source list, timing)
- `collections[]`: normalized records grouped by source endpoint
- `insights`: computed cross-collection analysis

Recommended in-template transformation contract:

1. Parse `collections` into typed `Dataset[]`.
2. Build derived UI models:
   - KPI cards from `insights`
   - table rows from flattened `records`
   - optional chart series grouped by key fields
3. Render a composable page shell:
   - Header/summary
   - KPI card grid
   - tabular detail
   - optional charts/filters

This keeps the template generic while allowing agent-specific rendering logic in `src/App.tsx`.

## 4) New Template Blueprint

Create: `templates/<your_template_name>/`

Baseline copy source:

- Copy all files from `templates/base_template`
- Rename package + motif alias values to your new template name

Mandatory edits:

1. `motif.toml`
   - set `motif_name = "mspace-<your_template_name>"`
   - keep `team_id` and `start_cmd = "/compile_page.sh"`
2. `package.json`
   - pin dependencies needed for your visualization mode
3. `prompt.ts`
   - define exact component imports available
   - enforce `ONLY edit src/App.tsx`
   - include data-shaping instructions for virtual endpoint payload
4. `src/App.tsx`
   - ship a compile-safe starter (cards + table + empty state)
5. `motif.Dockerfile`
   - ensure all deps installed in build stage (`RUN npm install`)

## 5) Build and Publish Instructions

From repo root:

```bash
cd templates/<your_template_name>
npm install
npm run build
```

Publish to Motif/E2B:

```bash
# ensure environment token is set for Motif CLI
pnpm dlx @e2b/cli@latest template create mspace-<your_template_name> \
  --dockerfile motif.Dockerfile \
  --cmd /compile_page.sh \
  --ready-cmd "sleep 1"
```

After first publish, copy returned `motif_id` back to `motif.toml`.

## 6) mSpace Application Wiring Checklist

In mSpace app repo (not this templates repo):

1. Update sandbox creation alias to your new `motif_name`.
2. Ensure preview URL resolver uses the same port as template (`5173` unless changed).
3. Inject required env/context (`MHIVE_*`, `DATASET_JSON`, org/user context).
4. Keep system prompt in app layer aligned with template `prompt.ts` imports.
5. Add smoke test that sandbox boots and serves HTTP 200 within timeout.

## 7) Quality Gates Before Rollout

- Template boots in < 2s from warm image
- `npm run build` succeeds locally
- No runtime package installs required
- Agent can regenerate `src/App.tsx` repeatedly without compile errors
- Virtual endpoint payload with empty collections renders graceful empty state
- At least one real mSpace dataset validates the layout and mappings