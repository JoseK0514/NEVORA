import type { WorkforcePermission } from "@/lib/workforce/permissions";
import { PERMISSION_ORDER, permissionCopy, type PermissionLang } from "./permission-copy";

/* SCRUM-215 (Nov 19, 2026): on a Manager's own Profile, what they can approve and where (the server's active
 * location-action pairs, GET /api/workforce/permissions read on the server through the same function), and who to ask
 * for anything else. A failed read says so; it never shows "Not granted" for an action it couldn't read. */
export type ManagerAuthority = { state: "ready"; pairs: { locationId: string; permission: WorkforcePermission }[]; scopeIds: string[] | null } | { state: "unavailable" };

export function ManagerAuthoritySection({ authority, locationNames, owners, lang = "en" }: {
  authority: ManagerAuthority; locationNames: Record<string, string>; owners: string | null; lang?: PermissionLang;
}) {
  const t = permissionCopy(lang);
  return <section lang={lang} className="ma" id="profile-authority" aria-labelledby="profile-authority-title">
    <h2 className="ma-h" id="profile-authority-title">{t.youTitle}</h2>
    {authority.state === "unavailable" ? <p className="ma-escalate" role="status">{t.youUnavailable}</p> : <>
      <ul className="q-list" aria-labelledby="profile-authority-title">{PERMISSION_ORDER.map(permission => {
        const ids = authority.pairs.filter(pair => pair.permission === permission).map(pair => pair.locationId);
        const all = authority.scopeIds === null ? false : authority.scopeIds.length > 0 && authority.scopeIds.every(id => ids.includes(id));
        const names = ids.map(id => locationNames[id]).filter((name): name is string => !!name);
        const value = !ids.length ? <span className="ma-none">{t.youNone}</span> : all && authority.scopeIds!.length > 1 ? t.youEveryLocation : t.youAt(names);
        return <li key={permission}><div className="q-row pmp-access"><span className="q-rt"><b>{t.actions[permission].name}</b><i>{t.actions[permission].line}</i></span>
          <span className="q-rv q-rv--l">{value}</span></div></li>;
      })}</ul>
      <p className="ma-escalate">{t.youEscalate(owners ?? t.anOwner)}</p>
    </>}
  </section>;
}
