import type { ChannelConfig } from "./lib/channel-types";

/**
 * Channel data contract for this motif.
 *
 * Define the collections your motif expects from its DataSpace.
 * The rushed-agent reads this at build time to create matching
 * virtual endpoints via RAG. The rewrite agent may extend or
 * override collections based on the user's actual data sources.
 *
 * Each collection maps to a sourceKey used by useChannelData().
 */
const config: ChannelConfig = {
  collections: {
    primary: {
      description: "Main data collection",
      fields: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
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
