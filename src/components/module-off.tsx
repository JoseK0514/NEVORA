import Link from "next/link";
import { ToggleLeftIcon } from "@phosphor-icons/react/dist/ssr/ToggleLeft";
import type { ModuleId } from "@/lib/workspace-presentation/modules";
import type { PortalLang } from "@/lib/i18n/portal-lang";
import { MODULE_OFF_COPY, moduleName } from "./module-off-copy";

/** Shown in place of a page whose module the company turned off (B2). */
/** `held`: Release 1 holds Company updates for every company; there is no switch to turn, so none is offered. */
/** `lang`: the person's language (signed-in Spanish); English when left out. */
export function ModuleOff({ module, workspaceName, owner, held = false, lang = "en" }: { module: ModuleId; workspaceName?: string; owner: boolean; held?: boolean; lang?: PortalLang }) {
  const t = MODULE_OFF_COPY[lang], name = moduleName(module, lang);
  if (held) return <section className="module-off" aria-labelledby="module-off-title" data-module-off={module}>
    <span className="module-off-icon" aria-hidden="true"><ToggleLeftIcon size={28} weight="bold" /></span>
    <h1 id="module-off-title">{t.heldTitle(name)}</h1>
    <p>{t.heldBody(name.toLowerCase())}</p>
    <Link className="module-off-home" href="/app">{t.home}</Link>
  </section>;
  return <section className="module-off" aria-labelledby="module-off-title" data-module-off={module}>
    <span className="module-off-icon" aria-hidden="true"><ToggleLeftIcon size={28} weight="bold" /></span>
    <h1 id="module-off-title">{t.offTitle(name)}</h1>
    <p>{t.offBody(workspaceName ?? t.company, name.toLowerCase())}</p>
    {owner
      ? <Link className="button primary" href="/app/settings/features">{t.turnOn}</Link>
      : <p className="module-off-hint">{t.askManager}</p>}
    <Link className="module-off-home" href="/app">{t.home}</Link>
  </section>;
}
