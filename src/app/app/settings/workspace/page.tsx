import { requireRoles } from "@/lib/auth/permissions";
import { timeZoneLabel } from "@/lib/time-zone-label";
import {
getWorkspace,
isWorkspaceTimezoneLocked
} from "@/lib/data/workspaces";
import { saveWorkspaceProfileAction } from "../actions";
import { SettingsFrame } from "../wave-c-kit";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr/LockSimple";
import "./company-profile.css";
import { Field, SettingsForm } from "../wave-c-form";
import { ReturnToNext } from "@/components/team/return-to-next";

export default async function WorkspacePage() {
  await requireRoles(["OWNER"]);
  const [workspace, locked] = await Promise.all([
    getWorkspace(),
    isWorkspaceTimezoneLocked(),
  ]);
  // Quiet (v4, approved Oct 23): Save at the top right. Nov 1 upscale: one grouped card: the business name as an input
  // row, then the time zone and the week start as value rows (labels 15/500); a locked value carries a grey Lock glyph,
  // with one line under the card saying why.
  const lock = <LockSimpleIcon className="c-coprof__lock" aria-hidden="true" />;
  return (
    <SettingsFrame title="Company profile" save={{ form: "company-profile-form" }}>
      <SettingsForm id="company-profile-form" topSave action={saveWorkspaceProfileAction} label="Company profile" submitLabel="Save" successTitle="Company profile saved" showServerSuccess={false}
        messages={{ name: { missing: "Enter your business name." }, timeZone: { missing: "Enter a timezone, such as America/New_York." } }}>
        {/* P9 (F9): the business name is one line; Return moves on (or closes the keyboard) and never saves. */}
        <ReturnToNext />
        <ul className="q-list c-coprof" aria-label="Company profile">
          <li className="c-coprof__field"><Field label="Business name" id="workspace-name" name="name" defaultValue={workspace.name} required maxLength={160} autoComplete="organization" autoCapitalize="words" enterKeyHint={locked ? "done" : "next"} /></li>
          {locked
            ? <li><div className="q-row q-row--one" id="workspace-timezone" aria-describedby="timezone-help"><span className="q-rt"><b>Time zone</b></span><span className="q-rv q-rv--l">{timeZoneLabel(workspace.timeZone).replace(/ time$/, "")}</span>{lock}</div></li>
            : <li className="c-coprof__field"><Field label="Time zone" id="workspace-timezone" name="timeZone" defaultValue={workspace.timeZone} required autoComplete="off" spellCheck={false} autoCapitalize="none" enterKeyHint="done" help="For example America/New_York." /></li>}
          <li><div className="q-row q-row--one q-fact"><span className="q-rt"><b>Week starts</b></span><span className="q-rv q-rv--l">Monday</span>{locked ? lock : null}</div></li>
        </ul>
        {locked ? <>
          <p className="c-coprof__note" aria-hidden="true">Locked while you have shifts</p>
          {/* Codex B-02: the help stays outside the list (a list holds only its items) and keeps its id for the row. */}
          <p className="q-sr" id="timezone-help">Time zone is locked because you have shifts and timecards. Contact support to change it.</p>
        </> : null}
      </SettingsForm>
    </SettingsFrame>
  );
}