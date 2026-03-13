import type { ChannelConfig } from "./lib/channel-types";

/**
 * WinTracker Channel Data Contract — Phase 1 (Read-Only)
 *
 * Defines the data collections the WinTracker dashboard consumes.
 * The mHive backend populates these via the Channel socket connection.
 *
 * Data sources on the Express side:
 * - ConnectWise REST API (closed tickets, ticket details)
 * - SQLite (technologists, daily config, hourly metrics, CI notes, KPAs)
 */
const config: ChannelConfig = {
  collections: {
    closed_tickets: {
      description: "Tickets closed in the current business day from ConnectWise",
      fields: {
        id: { type: "number", required: true, description: "CW ticket ID" },
        summary: { type: "string", required: true },
        closedBy: { type: "string", required: true, description: "Tech who closed the ticket" },
        closedAt: { type: "string", required: true, description: "ISO timestamp of closure" },
        closedHour: { type: "number", description: "Business hour (8-17) when closed" },
        boardName: { type: "string" },
        typeName: { type: "string" },
        subtypeName: { type: "string" },
        priority: { type: "string" },
        company: { type: "string", description: "Client company name" },
        cycleTimeMinutes: { type: "number", description: "Minutes from open to close" },
      },
      pagination: { defaultLimit: 100, maxLimit: 500 },
    },

    technicians: {
      description: "Active technician roster with shift assignments",
      fields: {
        id: { type: "number", required: true },
        name: { type: "string", required: true },
        identifier: { type: "string", required: true, description: "CW member identifier" },
        shift: { type: "string", enum: ["morning", "afternoon", "full"], description: "Assigned shift" },
        isActive: { type: "boolean", required: true },
        effectiveHours: { type: "number", description: "Effective working hours for the day" },
        avatar: { type: "string", description: "URL or initials for avatar" },
      },
    },

    daily_setup: {
      description: "TAKT configuration for the current business day",
      fields: {
        id: { type: "number", required: true },
        date: { type: "string", required: true, description: "YYYY-MM-DD" },
        dailyGoal: { type: "number", required: true, description: "Total ticket goal for the day" },
        taktTime: { type: "number", required: true, description: "Target minutes per ticket" },
        totalEffectiveMinutes: { type: "number", required: true, description: "Sum of all tech effective time" },
        techCount: { type: "number", required: true, description: "Number of active techs" },
        businessHoursStart: { type: "string", description: "HH:mm format, default 08:00" },
        businessHoursEnd: { type: "string", description: "HH:mm format, default 17:00" },
        isConfigured: { type: "boolean", required: true },
      },
    },

    hourly_metrics: {
      description: "Hour-by-hour team performance snapshots",
      fields: {
        hour: { type: "number", required: true, description: "Business hour (8-17)" },
        hourLabel: { type: "string", required: true, description: "Display label e.g. '8:00 AM'" },
        ticketsClosed: { type: "number", required: true },
        cumulativeTickets: { type: "number", required: true },
        targetCumulative: { type: "number", required: true, description: "Expected cumulative at this hour" },
        variance: { type: "number", description: "Actual - Target (positive = ahead)" },
        status: { type: "string", enum: ["ahead", "on_pace", "behind"], required: true },
        pacePercentage: { type: "number", description: "Cumulative / Target * 100" },
      },
    },

    tech_performance: {
      description: "Per-technician performance stats for the current day",
      fields: {
        techId: { type: "number", required: true },
        techName: { type: "string", required: true },
        ticketsClosed: { type: "number", required: true },
        effectiveHours: { type: "number", required: true },
        personalTaktTime: { type: "number", description: "Their avg minutes per ticket" },
        personalGoal: { type: "number", description: "Pro-rated goal based on effective time" },
        goalProgress: { type: "number", description: "Percentage of personal goal completed" },
        status: { type: "string", enum: ["ahead", "on_pace", "behind"] },
        avgCycleTime: { type: "number", description: "Average cycle time in minutes" },
        lastClosedAt: { type: "string", description: "ISO timestamp of last ticket closed" },
      },
    },

    ci_notes: {
      description: "Continuous improvement notes (read-only in Phase 1)",
      fields: {
        id: { type: "number", required: true },
        content: { type: "string", required: true },
        category: { type: "string", enum: ["process", "tooling", "training", "communication", "other"] },
        createdBy: { type: "string" },
        createdAt: { type: "string", required: true, description: "ISO timestamp" },
        status: { type: "string", enum: ["open", "in_progress", "resolved", "dismissed"] },
      },
    },

    huddle_kpas: {
      description: "KPA (Key Performance Action) commitments per tech (read-only in Phase 1)",
      fields: {
        id: { type: "number", required: true },
        techId: { type: "number", required: true },
        techName: { type: "string", required: true },
        commitment: { type: "string", required: true, description: "What the tech committed to" },
        date: { type: "string", required: true, description: "YYYY-MM-DD" },
        completed: { type: "boolean" },
        completedAt: { type: "string", description: "ISO timestamp if completed" },
      },
    },
  },
  refreshInterval: 30000,
};

export default config;
