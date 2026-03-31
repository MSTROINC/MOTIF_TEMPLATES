import type { ChannelConfig } from "./lib/channel-types";

/**
 * Channel data contract for the CW Tickets template.
 *
 * Provides daily ConnectWise ticket counts for the current week.
 * The rushed-agent reads this at build time to create matching
 * virtual endpoints from the connected DataSpace.
 */
const config: ChannelConfig = {
  collections: {
    ticketsByDay: {
      description: "ConnectWise service ticket counts grouped by day for the current week",
      fields: {
        label:    { type: "string", required: true, description: "Day abbreviation e.g. Mon, Tue, Wed" },
        date:     { type: "string", required: true, description: "ISO date string e.g. 2026-03-31" },
        isFriday: { type: "boolean", required: true, description: "True if this entry is for Friday" },
        tickets:  { type: "number", required: true, description: "Total ticket count for this day" },
      },
      pagination: { defaultLimit: 7, maxLimit: 7 },
    },
  },
  refreshInterval: 300000,
};

export default config;
