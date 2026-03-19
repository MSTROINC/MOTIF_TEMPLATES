import type { ChannelConfig } from "./lib/channel-types";

const config: ChannelConfig = {
  collections: {
    customers: {
      description: "MSP customer organizations with locations and risk assessment",
      fields: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        type: { type: "string", description: "Business sector" },
        riskLevel: { type: "string", enum: ["critical", "high", "medium", "low"], required: true },
        lat: { type: "number", required: true },
        lng: { type: "number", required: true },
        city: { type: "string" },
        state: { type: "string" },
        deviceCount: { type: "number" },
        openTickets: { type: "number" },
        revenue: { type: "number", description: "Monthly recurring revenue" },
        contractEnd: { type: "string" },
        primaryContact: { type: "string" },
      },
      pagination: { defaultLimit: 50, maxLimit: 200 },
    },
    devices: {
      description: "Network and IT devices managed across customer sites",
      fields: {
        id: { type: "string", required: true },
        customerId: { type: "string", required: true },
        hostname: { type: "string", required: true },
        type: { type: "string", enum: ["Firewall", "Server", "Workstation", "Switch", "Access Point", "NAS"] },
        status: { type: "string", enum: ["online", "degraded", "offline", "maintenance"], required: true },
        ip: { type: "string" },
        os: { type: "string" },
        lastSeen: { type: "string" },
        alerts: { type: "number" },
        uptime: { type: "string" },
      },
      pagination: { defaultLimit: 50, maxLimit: 500 },
    },
    tickets: {
      description: "Service and support tickets across all customers",
      fields: {
        id: { type: "string", required: true },
        customerId: { type: "string", required: true },
        deviceId: { type: "string" },
        title: { type: "string", required: true },
        severity: { type: "string", enum: ["critical", "high", "medium", "low"], required: true },
        status: { type: "string", enum: ["open", "in_progress", "resolved", "closed"], required: true },
        created: { type: "string" },
        assignee: { type: "string" },
        category: { type: "string" },
      },
      pagination: { defaultLimit: 25, maxLimit: 100 },
    },
  },
  refreshInterval: 15000,
};

export default config;
