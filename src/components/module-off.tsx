import Link from "next/link";
import { ToggleLeftIcon } from "@phosphor-icons/react/dist/ssr/ToggleLeft";
import { MODULES, type ModuleId } from "@/lib/workspace-presentation/modules";

/** Shown in place of a page whose module the company turned off (B2). */
export function ModuleOff({ module, workspaceName, owner }: { module: ModuleId; workspaceName: string; owner: boolean }) {
  const definition = MODULES.find(m => m.id === module)!;
  return <section className="module-off" aria-labelledby="module-off-title" data-module-off={module}>
    <span className="module-off-icon" aria-hidden="true"><ToggleLeftIcon size={28} /></span>
    <h1 id="module-off-title">{definition.name} is turned off</h1>
    <p>{workspaceName} doesn&rsquo;t use {definition.name.toLowerCase()} in NEVORA right now. Nothing has been deleted.</p>
    {owner
      ? <Link className="button primary" href="/app/settings/features">Turn it on in Settings</Link>
      : <p className="module-off-hint">Ask your manager if you need it.</p>}
    <Link className="module-off-home" href="/app">Back to Home ›</Link>
  </section>;
}
