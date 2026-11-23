import type { ReactNode } from "react";
import { readSessionMutationProof, requireSession } from "@/lib/auth/session";
import { OwnerOnlyNotice, ownerNames } from "@/components/owner-only-notice";
import { listEmployees } from "@/lib/data/employees";
import { readOperationalAuthority } from "@/lib/company-access/operational-scope.server";
import { currentBrand } from "@/lib/workspace-presentation/current.server";
import { wordPreset } from "@/lib/workspace-presentation/words";
import { navigationForRole } from "@/lib/navigation";
import { ClosedSettingsLine } from "./closed-line";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "./settings-copy";

/** Every Settings page is for Owners (each page still checks its own role). PD9 / UX10: anyone else who opens one by link
 * sees why, instead of landing on Home with no word. The page itself is never rendered for them. */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  // Review B2 (NV-137): the notice names the workspace's Owners, who can change a setting for this person.
  if (session.role !== "OWNER") {
    const lang = await readPageLang(), t = SETTINGS_COPY[lang];
    const owners = await listEmployees().then(list => list.filter(employee => employee.role === "OWNER" && employee.active !== false).map(employee => `${employee.firstName} ${employee.lastName}`.trim())).catch(() => []);
    // Review Nov 11 (MG-002, MG-009): a Manager is told what is theirs (Scheduling rules, when their navigation has it:
    // the same rule More uses) and, on a page under Settings, which page they asked for. Nothing more is read than the
    // shell already reads for this person; an Employee or Lead keeps the notice as it was.
    if (session.role === "MANAGER") {
      // A read that fails leaves the plain sentence and no button; it never opens the page.
      const brand = await currentBrand().catch(() => null);
      const rules = await readSessionMutationProof()
        .then(async proof => !!proof && navigationForRole("MANAGER", undefined, { operational: await readOperationalAuthority(proof), modules: brand?.modules })
          .some(item => item.href === "/app/schedule/settings")).catch(() => false);
      // Phase 8 (B #22): a name never breaks across two lines ("ask Jose" / "Natal."); "or" between two names still may.
      return <OwnerOnlyNotice state lang={lang} title={t.settings} reason={t.settingsForOwners}
        line={<ClosedSettingsLine owner={ownerNames(owners.map(name => name.replace(/ /g, "\u00A0")), lang)} rules={rules} locations={brand ? wordPreset(brand.words)[lang].locations : undefined} />}
        next={rules ? { href: "/app/schedule/settings", label: t.openSchedulingRules } : undefined} />;
    }
    return <OwnerOnlyNotice lang={lang} title={t.settings} reason={t.settingsForOwners} help={t.askAnOwner} ownersCan={t.changeASetting} owners={owners} />;
  }
  return children;
}
