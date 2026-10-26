import { cache } from "react";
import { ModuleOff } from "@/components/module-off";
import { getSession } from "../auth/session";
import { getWorkspace } from "../data/workspaces";
import { ALL_MODULES_ON, type ModuleId } from "./modules";
import { readActivePresentation, type ActivePresentation } from "./service";

type Current = ActivePresentation & { logoUrl: string | null; fallback?: true };
const FALLBACK: Current = { style: undefined, tokens: null, logoAssetId: null, revision: 0, modules: ALL_MODULES_ON, words: "standard", logoUrl: null };
/** The company was found but its saved settings couldn't be read: same look, but module gates say off. */
const UNREADABLE: Current = { ...FALLBACK, fallback: true };

/** The active company presentation for this request, read once and shared by
 * the layout, its viewport and module gates. Never throws: any failure
 * renders NEVORA teal, standard words and every module on for the look and navigation. Module GATES (below) treat a
 * saved setting that exists but can't be read as off, so a database blip can't reopen something the company turned
 * off. A database without the presentation table (never set up) is the all-on default. */
export const currentPresentation = cache(async (): Promise<Current> => {
  let workspaceId: string;
  // Without the company record nothing gated can work (every gated action reads the database itself), so the look
  // simply falls back.
  try { workspaceId = (await getWorkspace()).id; } catch { return FALLBACK; }
  try {
    const presentation = await readActivePresentation(workspaceId, undefined, { strict: true });
    return { ...presentation, logoUrl: presentation.logoAssetId ? `/api/workspace-presentation/logo/${presentation.logoAssetId}` : null };
  } catch {
    return UNREADABLE;
  }
});
export const currentBrand = currentPresentation;

/** Whether a module is on for this company. Pages render a calm "turned off"
 * page and APIs refuse when it is not. */
export async function moduleEnabled(id: ModuleId): Promise<boolean> {
  return (await moduleState(id)) === "on";
}
/** Inspection B12: the gate in three states. "unknown" means the saved settings exist but could not be read just now
 * (a database blip): it still fails closed for access (moduleEnabled is false), but actions and APIs answer "try
 * again" instead of silently dropping a request or saying the module is turned off. */
export async function moduleState(id: ModuleId): Promise<"on" | "off" | "unknown"> {
  const current = await currentPresentation();
  if (current.fallback) return "unknown";
  return current.modules[id] ? "on" : "off";
}

/** For pages: the "turned off" page when a module is off, otherwise null. */
export async function moduleGate(id: ModuleId) {
  const state = await moduleState(id);
  if (state === "on") return null;
  // B12: settings that could not be read are not "turned off"; the page's error screen offers Try again instead.
  if (state === "unknown") throw new Error("workspace_settings_unavailable");
  const [session, workspace] = await Promise.all([getSession(), getWorkspace().catch(() => null)]);
  return <ModuleOff module={id} workspaceName={workspace?.name ?? "Your company"} owner={session?.role === "OWNER"} />;
}
