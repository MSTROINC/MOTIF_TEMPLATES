import type { ChannelConfig } from "./lib/channel-types";

const config: ChannelConfig = {
  collections: {
    newTickets: {
      description: "Incoming CW service tickets awaiting SOWI match",
      fields: {
        id:          { type: "string", required: true },
        summary:     { type: "string", required: true },
        description: { type: "string" },
        status:      { type: "string" },
        enteredDate: { type: "string" },
        company:     { type: "string" },
      },
      pagination: { defaultLimit: 10, maxLimit: 50 },
    },
    sowiMatches: {
      description: "Hudu articles matched to the selected ticket via semantic search",
      fields: {
        ticketId:   { type: "string", required: true },
        sowiId:     { type: "string", required: true },
        title:      { type: "string", required: true },
        url:        { type: "string" },
        excerpt:    { type: "string" },
        confidence: { type: "number" },
      },
    },
  },
  refreshInterval: 0, // manual only — backend pushes matches when a ticket arrives
};

export default config;
