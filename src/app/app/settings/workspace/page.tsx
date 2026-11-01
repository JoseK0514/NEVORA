import { requireRoles } from "@/lib/auth/permissions";
import { timeZoneLabel } from "@/lib/time-zone-label";
import {
  getWorkspace,
  isWorkspaceTimezoneLocked,
  WorkspaceTimezoneLockedError,
} from "@/lib/data/workspaces";
import { saveWorkspaceProfileAction } from "../actions";
import { Fact, SettingsFrame } from "../wave-c-kit";
import { Field, SettingsForm } from "../wave-c-form";
import { ReturnToNext } from "@/components/team/return-to-next";

export default async function WorkspacePage() {
  await requireRoles(["OWNER"]);
  const [workspace, locked] = await Promise.all([
    getWorkspace(),
    isWorkspaceTimezoneLocked(),
  ]);
  // Quiet (v4, approved Oct 23): Save at the top right, the business name, then the time zone and the week start as rows.
  return (
    <SettingsFrame title="Company profile" save={{ form: "company-profile-form" }}>
      <SettingsForm id="company-profile-form" topSave action={saveWorkspaceProfileAction} label="Company profile" submitLabel="Save" successTitle="Company profile saved" showServerSuccess={false}
        messages={{ name: { missing: "Enter your business name." }, timeZone: { missing: "Enter a timezone, such as America/New_York." } }}>
        {/* P9 (F9): the business name is one line; Return moves on (or closes the keyboard) and never saves. */}
        <ReturnToNext />
        <Field label="Business name" id="workspace-name" name="name" defaultValue={workspace.name} required maxLength={160} autoComplete="organization" autoCapitalize="words" enterKeyHint={locked ? "done" : "next"} />
        {locked ? <ul className="q-list" style={{ marginTop: 24 }}>
          <li><div className="q-row q-row--one" id="workspace-timezone" aria-describedby="timezone-help"><span className="q-rt"><b>Time zone</b></span><span className="q-rv q-rv--l">{timeZoneLabel(workspace.timeZone).replace(/ time$/, "")}</span></div></li>
          <li><Fact label="Week starts" value="Monday" /></li>
          <p className="q-sr" id="timezone-help">{new WorkspaceTimezoneLockedError().message}</p>
        </ul> : <>
          <Field label="Time zone" id="workspace-timezone" name="timeZone" defaultValue={workspace.timeZone} required autoComplete="off" spellCheck={false} autoCapitalize="none" enterKeyHint="done" help="For example America/New_York." />
          <ul className="q-list" style={{ marginTop: 24 }}><li><Fact label="Week starts" value="Monday" /></li></ul>
        </>}
      </SettingsForm>
    </SettingsFrame>
  );
}