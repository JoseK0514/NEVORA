import type { ReactNode } from "react";
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
import { EmployeeProfileTabs } from "@/components/employee-profile-tabs";
import { KeyIcon } from "@phosphor-icons/react/dist/ssr/Key";
import { LockKeyIcon } from "@phosphor-icons/react/dist/ssr/LockKey";
import { Card, Row, Rows, Tile } from "@/components/kit/kit";
import { QuietGroup, QuietHeader, QuietNav, QuietPage, QuietRow } from "@/components/quiet/quiet";
import { employeeInitials } from "@/lib/employee-display";
import { FormActions, Notice } from "@/components/wave-a/parts";
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
  if(source.state==='unavailable')return <OperationalUnavailable title="Employee profile unavailable" reason={source.reason}/>;
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
  // Quiet (v4, approved Oct 23): who they are, Call, Message and Shifts, then Details and Access. Edit opens the editors below.
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
        {actor.role==='OWNER' ? <QuietRow href={`${base}/clocker-pin`} title="Clocker PIN" value="Manage" tone="l" /> : null}
        {recoverable ? <QuietRow href={`/app/account-recovery?employee=${encodeURIComponent(employee.id)}`} title="Account" value={invitation?.state === "ready" && invitation.eligibility !== "ALREADY_ACTIVATED" ? (invitation.invitation?.state === "ISSUED" ? "Invited" : "Not activated") : "Active"} tone="l" /> : null}
      </ul></QuietGroup> : null}
    </QuietPage>
  </ScopedReadFrame>);
  // Phase 3.5 Wave A: Team member detail on the kit. Who they are in the band, contact at a glance,
  // then Details (contact, access, tablet PIN, sign-in help) and Scheduling (positions, locations, Owner rules).
  return (<ScopedReadFrame observation={source}>
    <div className="q-page wa-page wa-member" data-nv-page="">
      <QuietNav back={{ href: base, label: name }} />
      <QuietHeader title={`Edit ${employee.firstName}`} />
      <div className="nv-content wa-narrow">
        <EmployeeProfileTabs
          details={<>
            <Card title="Employee details" id="member-details">
              {canManageCore ? (
                <EmployeeCoreProfileForm employee={employee} locations={locations} actorId={actor.id} actorRole={actor.role} ownerScope={ownerScope} action={saveEmployeeCoreProfileAction} />
              ) : (
                <div className="wa-card-body"><p className="wa-text wa-muted">Only an Owner can change another Owner. Scheduling information remains available in Scheduling.</p></div>
              )}
            </Card>
            {actor.role==='OWNER'&&invitation&&<EmployeeInvitationPanel actorId={actor.id} employeeId={employee.id} initialStatus={invitation}/>}
            {actor.role==='OWNER'&&employee.role!=='OWNER'&&(ownerScope?<ManagerOperationalScopePanel actorId={actor.id} current={ownerScope} locations={locations}/>:<p role="status">Management access could not be confirmed. Refresh this employee before changing access.</p>)}
            {canManageCore && employee.active ? <Card title="Access">
              <Rows label="Access">
                {actor.role==='OWNER' ? <Row href={`/app/employees/${encodeURIComponent(employee.id)}/clocker-pin`} title="Clocker PIN" meta="For the shared tablet. Separate from portal sign-in."
                  leading={<Tile><KeyIcon size={20} weight="bold" /></Tile>} /> : null}
                {/* Managers can help Employees and Leads; only an Owner can reset a Manager (matches the server rule). */}
                {employee.id !== actor.id && (actor.role === "OWNER" || employee.role === "EMPLOYEE" || employee.role === "LEAD") ? <Row href={`/app/account-recovery?employee=${encodeURIComponent(employee.id)}`} title="Account recovery" meta="Help them back in after you check who they are."
                  leading={<Tile><LockKeyIcon size={20} weight="bold" /></Tile>} /> : null}
              </Rows>
            </Card> : null}
          </>}
          scheduling={<>
            <Card title="Scheduling profile" id="member-scheduling">
              <p className="wa-card-lead">Positions and locations decide where they can be scheduled.</p>
              <ConfigurationForm action={saveEmployeeSchedulingProfileAction} className="wa-form" reviewedUpdatedAt={employee.updatedAt}>
                <input type="hidden" name="employeeId" value={employee.id} />
                <div className="wa-fields"><EmployeeSchedulingFields employee={employee} locations={locations} positions={positions} /></div>
                <div className="wa-card-body"><FormActions><PendingButton pending="Saving…" block>Save scheduling profile</PendingButton></FormActions></div>
              </ConfigurationForm>
            </Card>
            <Card title="Operational rules" id="member-rules">
              {profileUnavailable ? (
                <div className="wa-card-body"><Notice tone="urgent" title="Couldn’t load the rules">Reconnect and reload the page.</Notice></div>
              ) : operational ? (
                <OperationalRuleFields employeeId={employee.id} profile={operational} canEdit={actor.role === "OWNER"} />
              ) : (
                <div className="wa-card-body">
                  <p className="wa-text wa-muted">Set this person’s weekly hours first. No maximum is created by this review.</p>
                  <KitLinkInline href={`/app/schedule/settings#target-${encodeURIComponent(employee.id)}`}>Set weekly hours</KitLinkInline>
                </div>
              )}
            </Card>
          </>}
        />
      </div>
    </div>
  </ScopedReadFrame>);
}

function KitLinkInline({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="nv-link" href={href}>{children}</Link>;
}
