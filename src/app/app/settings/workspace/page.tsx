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

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Company profile" };

const FORM = "company-profile-form";

export default async function WorkspacePage() {
  await requireRoles(["OWNER"]);
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
    <SettingsPageB title="Company profile" phoneRight={<button type="submit" form={FORM} className="c-setb-save">Save</button>}>
      <SettingsFormB id={FORM} action={saveWorkspaceProfileAction} label="Company profile" successTitle="Company profile saved" showServerSuccess={false} saveOnChange
        messages={{ name: { missing: "Enter your business name" }, timeZone: { missing: "Enter a time zone, such as America/New_York" } }}>
        {/* P9 (F9): the business name is one line; Return moves on (or closes the keyboard) and never saves. */}
        <ReturnToNext />
        <div className="c-card__body c-setb-fields">
          <FieldB label="Business name" id="workspace-name" name="name" defaultValue={workspace.name} required maxLength={160} autoComplete="organization" autoCapitalize="words" enterKeyHint={locked ? "done" : "next"} />
          {locked ? null : <FieldB label="Time zone" id="workspace-timezone" name="timeZone" defaultValue={workspace.timeZone} required autoComplete="off" spellCheck={false} autoCapitalize="none" enterKeyHint="done" help="For example America/New_York." />}
        </div>
        <CorpRows label="Company profile">
          {locked ? <li><CorpRow id="workspace-timezone" title="Time zone" value={timeZoneLabel(workspace.timeZone).replace(/ time$/, "")} trail={lock} chevron={false} /></li> : null}
          <li><CorpRow title="Week starts" value="Monday" trail={locked ? lock : undefined} chevron={false} /></li>
        </CorpRows>
        {locked ? <p className="c-note c-setb-cardnote"><span>Locked while you have shifts</span></p> : null}
        {/* Owner premium R7: the reason in full for screen readers (the server's own error keeps its wording). */}
        {locked ? <p className="c-sr" id="timezone-help">Time zone is locked because you have shifts and timecards. Contact support to change it.</p> : null}
      </SettingsFormB>
    </SettingsPageB>
  );
}
