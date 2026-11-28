import { readWorkspaceRoutingConfig } from "../workspace-routing/config.server";

/** The roster preview and save endpoints both require routed company workspaces. */
export function rosterImportAvailable() {
  try { readWorkspaceRoutingConfig(); return true; } catch { return false; }
}
