import { requireRoles } from "@/lib/auth/permissions";
import { timeZoneLabel } from "@/lib/time-zone-label";
import {
getWorkspace,
isWorkspaceTimezoneLocked
} from "@/lib/data/workspaces";
import { saveWorkspaceProfileAction } from "../actions";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr/LockSimple";
import { CorpRow, CorpRows } from "@/components/corp/corp";
import { SettingsPageB } from "../settings-b";
import { FieldB, SettingsFormB } from "../settings-b-form";
import { ReturnToNext } from "@/components/team/return-to-next";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "../settings-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: SETTINGS_COPY[await readPageLang()].companyProfile }; }

const FORM = "company-profile-form";

export default async function WorkspacePage() {
  await requireRoles(["OWNER"]);
  const lang = await readPageLang(), t = SETTINGS_COPY[lang];
  const [workspace, locked] = await Promise.all([
    getWorkspace(),
    isWorkspaceTimezoneLocked(),
  ]);
  // Settings in Direction B (Nov 23, 2026): one card, the business name as an outlined field, then the time zone and the
  // week start as value rows. A locked value carries the grey lock, and the reason is said once, in the card's footer
  // (it was under each locked row: Jose, Nov 23, no repeated wording). Save appears after a change: on the phone's band,
  // and in the card's footer on tablets and desktop.
  const lock = <LockSimpleIcon weight="bold" className="c-setb-lock" aria-hidden="true" />;
  return (
    <SettingsPageB title={t.companyProfile} lang={lang === "es" ? "es" : undefined} phoneRight={<button type="submit" form={FORM} className="c-setb-save">{t.save}</button>}>
      <SettingsFormB id={FORM} action={saveWorkspaceProfileAction} label={t.companyProfile} successTitle={t.companyProfileSaved} showServerSuccess={false} saveOnChange
        messages={{ name: { missing: t.enterBusinessName }, timeZone: { missing: t.enterTimeZone } }}>
        {/* P9 (F9): the business name is one line; Return moves on (or closes the keyboard) and never saves. */}
        <ReturnToNext />
        <div className="c-card__body c-setb-fields">
          <FieldB label={t.businessName} id="workspace-name" name="name" defaultValue={workspace.name} required maxLength={160} autoComplete="organization" autoCapitalize="words" enterKeyHint={locked ? "done" : "next"} />
          {locked ? null : <FieldB label={t.timeZone} id="workspace-timezone" name="timeZone" defaultValue={workspace.timeZone} required autoComplete="off" spellCheck={false} autoCapitalize="none" enterKeyHint="done" help={t.timeZoneHelp} />}
        </div>
        <CorpRows label={t.companyProfile}>
          {locked ? <li><CorpRow id="workspace-timezone" title={t.timeZone} value={timeZoneLabel(workspace.timeZone).replace(/ time$/, "")} trail={lock} chevron={false} /></li> : null}
          <li><CorpRow title={t.weekStarts} value={t.monday} trail={locked ? lock : undefined} chevron={false} /></li>
        </CorpRows>
        {locked ? <p className="c-note c-setb-cardnote"><span>{t.lockedWhileShifts}</span></p> : null}
        {/* Owner premium R7: the reason in full for screen readers (the server's own error keeps its wording). */}
        {locked ? <p className="c-sr" id="timezone-help">{t.timeZoneLockedSr}</p> : null}
      </SettingsFormB>
    </SettingsPageB>
  );
}
