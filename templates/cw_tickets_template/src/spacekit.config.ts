import type { SpaceKitConfig } from "./lib/spacekit-types";

/**
 * SpaceKit configuration for the CW Tickets template.
 *
 * This template reads ConnectWise ticket data via the Channel system
 * and does not require local persistence — no SpaceKits are declared.
 * Add sqlite or redis entries here if local storage is needed.
 */
const config: SpaceKitConfig = {
  spacekits: {},
};

export default config;
