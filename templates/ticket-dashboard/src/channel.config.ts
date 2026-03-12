import type { ChannelConfig } from "./lib/channel-types";

/**
 * Ticket Dashboard channel data contract.
 */
const config: ChannelConfig = {
  collections: {
    tickets: {
      description: "List of service tickets",
      fields: {
        id: { type: "string", required: true },
        ticketId: { type: "string", required: true },
        age: { type: "number", required: true },
        status: { type: "string", required: true },
        companyName: { type: "string", required: true },
        contact: { type: "string", required: true },
        summary: { type: "string", required: true },
        owner: { type: "string", required: true },
        resources: { type: "string" },
        dateOpen: { type: "string", required: true },
        lastUpdated: { type: "string", required: true },
        type: { type: "string" },
        subType: { type: "string" },
        item: { type: "string" },
        configurations: { type: "string" },
        externalNotes: { type: "string" },
        internalNotes: { type: "string" },
      },
      pagination: { defaultLimit: 50, maxLimit: 200 },
    },
    stats: {
      description: "Ticket dashboard summary statistics",
      fields: {
        currentOpen: { type: "number", required: true },
        openThisWeek: { type: "number", required: true },
        closedThisWeek: { type: "number", required: true },
        pendingClose: { type: "number", required: true },
      },
    },
  },
  refreshInterval: 60000,
};

export default config;
