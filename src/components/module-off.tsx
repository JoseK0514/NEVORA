import Link from "next/link";
import { ToggleLeftIcon } from "@phosphor-icons/react/dist/ssr/ToggleLeft";
import { MODULES, type ModuleId } from "@/lib/workspace-presentation/modules";

/** Shown in place of a page whose module the company turned off (B2). */
/** `held`: Release 1 holds Company updates for every company; there is no switch to turn, so none is offered. */
export function ModuleOff({ module, workspaceName, owner, held = false }: { module: ModuleId; workspaceName: string; owner: boolean; held?: boolean }) {
  const definition = MODULES.find(m => m.id === module)!;
  if (held) return <section className="module-off" aria-labelledby="module-off-title" data-module-off={module}>
    <span className="module-off-icon" aria-hidden="true"><ToggleLeftIcon size={28} /></span>
    <h1 id="module-off-title">{definition.name} are coming in a later release</h1>
    <p>NEVORA doesn&rsquo;t offer {definition.name.toLowerCase()} yet. Nothing has been deleted.</p>
    <Link className="module-off-home" href="/app">Back to Home ›</Link>
  </section>;
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
