import type { ReactNode } from "react";
import {companyOnlyRefusal} from '@/components/company-access/company-only-state';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {readOperationalEmployeeProfile} from '@/lib/company-access/operational-read.server';
import {readInvitationStatus} from '@/lib/auth/invitations/service.server';
import {EmployeeInvitationPanel} from '@/components/company-access/employee-invitation-panel';
import {ManagerOperationalScopePanel} from '@/components/company-access/manager-operational-scope-panel';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import { EmployeeCoreProfileForm } from "@/components/employee-core-profile-form";
import { EmployeeSchedulingFields } from "@/components/employee-scheduling-fields";
import { ConfigurationForm } from "@/components/configuration-form";
import { OperationalRuleFields } from "@/components/operational-rule-fields";
import { EmployeeSheetRow, EmployeeStatusAction } from "@/components/company-access/employee-sheet-row";
import { QuietGroup, QuietNav, QuietPage, QuietRow } from "@/components/quiet/quiet";
import { employeeInitials } from "@/lib/employee-display";
import { PendingButton } from "@/components/wave-a/pending-button";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listPositions } from "@/lib/data/positions";
import { readOperationalRuleProfileView } from "@/lib/data/shift-change-views";
import { employeeRoleLabel } from "@/lib/employee-display";
import { formatPhoneNumber } from "@/lib/phone";
import Link from "next/link";
import {
  saveEmployeeCoreProfileAction,
  saveEmployeeSchedulingProfileAction,
} from "../actions";

// a11y #20 (final pass): each page names itself; the layout template adds "· NEVORA".
export const metadata = { title: "Employee" };

export default async function EmployeeProfilePage({
  params, searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams?: Promise<{ edit?: string }>;
}) {
  await requireRoles(MANAGER_ROLES);
  const { employeeId } = await params;

  const proof=await requireSessionMutationProof();
  const actor=proof.employee;
  const source=await withOperationalCompany(proof,async()=>{
    const profile=await readOperationalEmployeeProfile(proof,employeeId);
    if(profile.state==='unavailable')return {profile,positions:[],operational:null,profileUnavailable:false,invitation:null};
    const positions=await listPositions({includeInactive:true});
    let operational=null,profileUnavailable=false;
    try{operational=await readOperationalRuleProfileView(proof,profile.data.profile.id);}catch{profileUnavailable=true;}
    const invitation=proof.employee.role==='OWNER'?await readInvitationStatus(proof,employeeId):null;
    return {profile,positions,operational,profileUnavailable,invitation};
  });
  if(source.state==='unavailable')return companyOnlyRefusal(proof,'Employee profile unavailable',source.reason);
  const {profile,positions,operational,profileUnavailable,invitation}=source.data;
  if(profile.state==='unavailable')return <OperationalUnavailable title="Employee profile unavailable" reason={profile.reason}/>;
  const {profile:employee,locations,ownerScope}=profile.data;
  const primaryLocation = locations.find(
    (location) => location.id === employee.primaryLocationId,
  );
  const canManageCore = actor.role === "OWNER" || employee.role !== "OWNER";

  const roleLabel = employeeRoleLabel(employee.role);
  const editing = (await searchParams)?.edit === "1";
  const positionNames = employee.positionIds.map(id => positions.find(position => position.id === id)?.name).filter(Boolean).join(", ");
  const name = `${employee.firstName} ${employee.lastName}`;
  const base = `/app/employees/${encodeURIComponent(employee.id)}`;
  const recoverable = employee.id !== actor.id && (actor.role === "OWNER" || employee.role === "EMPLOYEE" || employee.role === "LEAD");
  const dial = employee.phone ? employee.phone.replace(/(?!^\+)[^\d]/g, "") : "";
  const invited = invitation?.state === "ready" && invitation.eligibility !== "ALREADY_ACTIVATED";
  const accountValue = invitation?.state === "ready" ? (invitation.eligibility === "ALREADY_ACTIVATED" ? "Active" : invitation.invitation?.state === "ISSUED" ? "Invited" : "Not activated") : "Active";
  const invitationPanel = actor.role === "OWNER" && invitation ? <EmployeeInvitationPanel actorId={actor.id} employeeId={employee.id} initialStatus={invitation} /> : null;
  const statusAction = canManageCore && employee.id !== actor.id ? <EmployeeStatusAction employee={employee} ownerScope={ownerScope ?? null} actorRole={actor.role} locations={locations} action={saveEmployeeCoreProfileAction} /> : null;
  // Quiet (v4, approved Oct 23): who they are, Call, Message and Shifts, then Details and Access. Edit opens the editor.
  // Final pass: a person who hasn't activated gets "Invite to NEVORA" (not account recovery, UX-O-51); Deactivate is a
  // danger row with its own confirm (T-11, UX-O-53).
  if (!editing) return (<ScopedReadFrame observation={source}>
    <QuietPage className="q-member">
      <QuietNav back={{ href: "/app/employees", label: "Team" }} right={canManageCore ? <Link className="q-nav__r" href={`${base}?edit=1`}>Edit</Link> : undefined} />
      <div className="q-who"><span className="q-av q-av--lg" aria-hidden="true">{employeeInitials(employee.firstName, employee.lastName)}</span>
        <div><h1>{name}</h1><p>{[positionNames || roleLabel, primaryLocation ? `${primaryLocation.shortName}${primaryLocation.active ? "" : " (inactive)"}` : null, employee.active ? null : "Inactive"].filter(Boolean).join(" · ")}</p></div></div>
      <div className="q-qa">
        {dial ? <a className="q-bs" href={`tel:${dial}`} aria-label={`Call ${name}`}>Call</a> : <span className="q-bs" aria-disabled="true">Call</span>}
        {dial ? <a className="q-bs" href={`sms:${dial}`} aria-label={`Message ${name}`}>Message</a> : <span className="q-bs" aria-disabled="true">Message</span>}
        <Link className="q-bs" href="/app/schedule" aria-label={`Shifts for ${name}`}>Shifts</Link>
      </div>
      <QuietGroup label="Details" id="member-details"><ul className="q-list">
        <QuietRow title="Employee ID" value={employee.id} tone="l" />
        <QuietRow title="Phone" value={employee.phone ? formatPhoneNumber(employee.phone) : "None"} tone={employee.phone ? "l" : "ph"} />
        <QuietRow title="Email" value={employee.email || "None"} tone={employee.email ? "l" : "ph"} />
        <QuietRow title="Role" value={roleLabel} tone="l" />
      </ul></QuietGroup>
      {canManageCore && employee.active ? <QuietGroup label="Access" id="member-access"><ul className="q-list">
        <QuietRow href={`${base}/clocker-pin`} title="Clocker PIN" />
        {invited && invitationPanel ? <EmployeeSheetRow title="Invite to NEVORA" value={accountValue} sheetTitle="Invite to NEVORA">{invitationPanel}</EmployeeSheetRow>
          : recoverable ? <QuietRow href={`/app/account-recovery?employee=${encodeURIComponent(employee.id)}`} title="Account" value={accountValue} tone="l" /> : null}
      </ul></QuietGroup> : null}
      {statusAction}
    </QuietPage>
  </ScopedReadFrame>);
  // T-11 (final pass, Oct 25, 2026): Edit employee is the AddEmployee modal (Cancel · Edit employee · Save). Fields for
  // name and contact, Work as rows (ID, Role, Location, then Positions, Weekly target and Work rules), and Access as rows
  // whose details open as sheets. The tabs, cards and bordered inputs are gone; every command is unchanged.
  const ruleCount = operational ? (["minimumRest", "maximumShift", "maximumDaily", "breaks", "projectedOvertime"] as const).filter(key => operational[key].status === "CONFIGURED").length : 0;
  const scopeValue = ownerScope?.scope?.mode === "COMPANY" ? "Company" : ownerScope?.scope?.mode === "LOCATIONS" ? ownerScope.scope.locationIds.map(id => locations.find(l => l.id === id)?.shortName ?? "Location").join(", ") : "None";
  return (<ScopedReadFrame observation={source}>
    <QuietPage className="q-member-edit">
      <QuietNav left={<Link className="q-nav__l q-nav__l--teal" href={base}>Cancel</Link>} title="Edit employee"
        right={canManageCore ? <button type="submit" form="edit-employee-form" className="q-nav__r q-nav__r--b">Save</button> : undefined} />
      <h1 className="q-sr">Edit {name}</h1>
      {canManageCore ? (
        <EmployeeCoreProfileForm employee={employee} locations={locations} actorId={actor.id} actorRole={actor.role} ownerScope={ownerScope} action={saveEmployeeCoreProfileAction} />
      ) : (
        <p className="q-empty q-first">Only an Owner can change another Owner. You can still update where they can be scheduled.</p>
      )}
      {canManageCore ? null : <div className="q-grp"><h2>Work</h2></div>}
      <ul className="q-list q-u4-cont" aria-label="Scheduling">
        <EmployeeSheetRow title="Positions" value={positionNames || "None"} placeholder={!positionNames} sheetTitle="Positions and locations">
          <ConfigurationForm action={saveEmployeeSchedulingProfileAction} className="q-form q-u4-form q-u4-sched" reviewedUpdatedAt={employee.updatedAt}>
            <input type="hidden" name="employeeId" value={employee.id} />
            <div className="q-u4-sched__fields"><EmployeeSchedulingFields employee={employee} locations={locations} positions={positions} /></div>
            <PendingButton pending="Saving…" block>Save positions and locations</PendingButton>
          </ConfigurationForm>
        </EmployeeSheetRow>
        <QuietRow href={`/app/schedule/settings#target-${encodeURIComponent(employee.id)}`} title="Weekly target" detail="Set in Scheduling rules" />
        <EmployeeSheetRow title="Work rules" value={profileUnavailable ? "Unavailable" : operational ? (ruleCount ? `${ruleCount} set` : "None") : "None"} placeholder={!ruleCount} sheetTitle="Work rules">
          {profileUnavailable ? <p className="q-error" role="alert">Couldn’t load the rules. Reconnect and reload the page.</p>
            : operational ? <div className="q-u4-rules"><OperationalRuleFields employeeId={employee.id} profile={operational} canEdit={actor.role === "OWNER"} /></div>
            : <p className="q-empty q-first">Set this person’s weekly hours first. No maximum is created by this review. <KitLinkInline href={`/app/schedule/settings#target-${encodeURIComponent(employee.id)}`}>Set weekly hours</KitLinkInline></p>}
        </EmployeeSheetRow>
      </ul>
      {canManageCore && employee.active ? <QuietGroup label="Access" id="member-access"><ul className="q-list">
        <QuietRow href={`${base}/clocker-pin`} title="Clocker PIN" />
        {invitationPanel ? <EmployeeSheetRow title="Account" value={accountValue} sheetTitle="Account">{invitationPanel}</EmployeeSheetRow>
          : recoverable ? <QuietRow href={`/app/account-recovery?employee=${encodeURIComponent(employee.id)}`} title="Account recovery" /> : null}
        {actor.role === "OWNER" && employee.role !== "OWNER" ? <EmployeeSheetRow title="Management access" value={ownerScope ? (employee.role === "MANAGER" ? scopeValue : "Managers only") : "Unavailable"} placeholder={!ownerScope || employee.role !== "MANAGER"} sheetTitle="Management access">
          {ownerScope ? <ManagerOperationalScopePanel actorId={actor.id} current={ownerScope} locations={locations} /> : <p className="q-error" role="status">Management access could not be confirmed. Refresh this employee before changing access.</p>}
        </EmployeeSheetRow> : null}
      </ul></QuietGroup> : null}
    </QuietPage>
  </ScopedReadFrame>);
}

function KitLinkInline({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="nv-link" href={href}>{children}</Link>;
}
