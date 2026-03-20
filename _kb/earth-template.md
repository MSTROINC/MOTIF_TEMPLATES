# Earth Template (mspace-react-earth)

Motif template for building geospatial and 3D globe visualizations using CesiumJS within the mSpace sandbox environment.

## Stack

| Layer | Technology |
|---|---|
| Framework | Vite + React 18 + TypeScript |
| Globe/Maps | CesiumJS + Resium (React bindings) |
| Styling | Tailwind CSS + Shadcn UI (new-york, dark theme) |
| Vite Plugin | vite-plugin-cesium (handles CesiumJS static assets) |
| Port | 5173 |

## Alias

`mspace-react-earth` — used in `Sandbox.create()` calls.

## What It Does

Provides a pre-configured sandbox with a full 3D globe (CesiumJS) plus UI overlay components (Shadcn). The AI agent edits `src/App.tsx` to place markers, polylines, polygons, GeoJSON layers, and info panels on the globe based on user data.

## Key Capabilities

- **3D Globe** — Full CesiumJS Viewer with terrain, satellite imagery, and camera controls
- **Entity rendering** — Points, labels, billboards, polylines, polygons via Resium components
- **Data layers** — GeoJSON, CZML, KML data source loading
- **Imagery providers** — Cesium Ion, ArcGIS, custom tile servers
- **Overlay panels** — Semi-transparent Card overlays positioned absolutely over the globe
- **Dark theme** — Navy-based color scheme optimized for globe visualization

## Directory Structure

```
templates/earth_template/
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
        └── table.tsx
```

## Prompt Configuration

`prompt.ts` instructs the AI agent to:
- Use Resium components (`Viewer`, `Entity`, `CameraFlyTo`, etc.) for all globe elements
- Use Shadcn Card/Table/Button for overlay UI panels
- Position overlays with absolute + z-index over the Viewer
- Set `Ion.defaultAccessToken` for Cesium Ion terrain/imagery
- Only edit `src/App.tsx`

## Usage Examples

The AI agent can build:
- Location plotters with data from APIs
- Flight/route trackers with polylines
- Geofence polygon editors
- GeoJSON data overlays (e.g., country boundaries, heatmaps)
- Real estate or asset maps with info cards
- Satellite imagery comparisons

## Publishing

```bash
cd templates/earth_template
set -a && source ../../.env
export space_ACCESS_TOKEN="$space_API_KEY"
pnpm dlx @Motif/cli@latest Motif create mspace-react-earth \
  --dockerfile motif.Dockerfile \
  --cmd /compile_page.sh \
  --ready-cmd "sleep 1"
```

After publishing, save the returned `motif_id` back into `motif.toml`.
