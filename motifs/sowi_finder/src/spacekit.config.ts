import type { SpaceKitConfig } from "./lib/spacekit-types";

/**
 * SpaceKit configuration for the SOWI Finder motif.
 *
 * This motif reads CW tickets and Hudu SOWI matches via the Channel
 * system and does not require local persistence. No SpaceKits declared.
 */
const config: SpaceKitConfig = {
  spacekits: {},
};

export default config;
