# Channel Config

Declarative data contract (`src/channel.config.ts`) that describes which data collections a Motif expects and how they're shaped.

## Purpose

Bridges the sandbox and the mHive data layer. Components import the config to know which fields to render in tables, charts, and forms without hard-coding column names.

## Location

```
templates/main_template/src/
├── channel.config.ts        # Config instance
└── lib/channel-types.ts     # TypeScript interfaces
```

## Config Shape

| Property | Description |
|---|---|
| `collections` | Map of named data sets (e.g. `primary`, `metrics`). Each defines `fields`, optional `description`, and optional `pagination`. |
| `refreshInterval` | Milliseconds between auto-fetches. `0` = manual only. Default in template: `30000` (30 s). |

### Field Properties

| Property | Description |
|---|---|
| `type` | `string` · `number` · `boolean` · `array` · `object` |
| `required` | Non-nullable when `true` |
| `enum` | Restricts a string field to a fixed set of values |
| `description` | Optional human-readable label |

### Pagination

Optional per-collection: `defaultLimit` and `maxLimit`.

## AI Agent Behavior

- If `channel.config.ts` exists, the agent uses it as a baseline and may extend or override fields at build time based on the actual mHive schema.
- If the file is absent, the agent generates the entire config from the user's request and available data.

## Runtime Types

`channel-types.ts` exports:

- `ChannelConfig` — top-level config (collections + refreshInterval)
- `ChannelCollectionDef` — single collection definition
- `ChannelFieldDef` — single field definition
- `ChannelDataPayload` — data message from mHive (data array + pagination + optional schema)
- `ChannelStatusPayload` — status/error message
- `ChannelSchemaPayload` — schema discovery message listing available collections and fields
