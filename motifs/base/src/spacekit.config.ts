import type { SpaceKitConfig } from "./lib/spacekit-types";

/**
 * SpaceKit configuration for this motif.
 *
 * Declare which backend services this motif needs.
 * The build pipeline provisions these inside the sandbox
 * and the spacekit-client.ts hooks give your components
 * typed access via REST.
 *
 * Remove any SpaceKit entry you don't need — only declared
 * services are provisioned.
 */
const config: SpaceKitConfig = {
  spacekits: {
    sqlite: {
      database: "app.db",
      tables: {
        items: {
          columns: {
            id: "INTEGER PRIMARY KEY AUTOINCREMENT",
            title: "TEXT NOT NULL",
            completed: "INTEGER DEFAULT 0",
            created_at: "TEXT DEFAULT (datetime('now'))",
          },
        },
      },
    },
    // redis: {
    //   maxMemory: "64mb",
    // },
  },
};

export default config;
