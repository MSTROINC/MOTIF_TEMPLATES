import type { ChannelConfig } from "./lib/channel-types";

/**
 * Base channel data contract for the react-shadcn Motif template.
 *
 * The AI agent may extend or override this at build time based on the
 * actual mHive data schema. If this file is absent, the agent generates
 * the entire config from the user's request + available data.
 */
const config: ChannelConfig = {
  collections: {
    primary: {
      description: "Main data table",
      fields: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        value: { type: "number" },
        status: { type: "string", enum: ["active", "pending", "inactive"] },
      },
      pagination: { defaultLimit: 25, maxLimit: 100 },
    },
    metrics: {
      description: "Aggregated chart data",
      fields: {
        label: { type: "string", required: true },
        value: { type: "number", required: true },
      },
    },
  },
  refreshInterval: 30000,
};

export default config;
