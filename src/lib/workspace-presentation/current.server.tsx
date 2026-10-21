import { cache } from "react";
import { ModuleOff } from "@/components/module-off";
import { getSession } from "../auth/session";
import { getWorkspace } from "../data/workspaces";
import { ALL_MODULES_ON, type ModuleId } from "./modules";
import { readActivePresentation, type ActivePresentation } from "./service";

type Current = ActivePresentation & { logoUrl: string | null; fallback?: true };
const FALLBACK: Current = { style: undefined, tokens: null, logoAssetId: null, revision: 0, modules: ALL_MODULES_ON, words: "standard", logoUrl: null, fallback: true };

/** The active company presentation for this request, read once and shared by
 * the layout, its viewport and module gates. Never throws: any failure
 * renders NEVORA teal, standard words and every module on for the look and navigation; module GATES (below) treat
 * an unreadable setting as off, so a database blip can't reopen something the company turned off. */
export const currentPresentation = cache(async (): Promise<Current> => {
  try {
    const presentation = await readActivePresentation((await getWorkspace()).id);
    return { ...presentation, logoUrl: presentation.logoAssetId ? `/api/workspace-presentation/logo/${presentation.logoAssetId}` : null };
  } catch {
    return FALLBACK;
  }
});
export const currentBrand = currentPresentation;

/** Whether a module is on for this company. Pages render a calm "turned off"
 * page and APIs refuse when it is not. */
export async function moduleEnabled(id: ModuleId): Promise<boolean> {
  const current = await currentPresentation();
  return !current.fallback && current.modules[id];
}

/** For pages: the "turned off" page when a module is off, otherwise null. */
export async function moduleGate(id: ModuleId) {
  if (await moduleEnabled(id)) return null;
  const [session, workspace] = await Promise.all([getSession(), getWorkspace().catch(() => null)]);
  return <ModuleOff module={id} workspaceName={workspace?.name ?? "Your company"} owner={session?.role === "OWNER"} />;
}
