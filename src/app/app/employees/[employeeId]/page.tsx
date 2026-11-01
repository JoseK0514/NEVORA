import {readEmployeeClockerPin,type EmployeePinView} from '@/lib/clocker/pins.server';
import type { ReactNode } from "react";
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {readOperationalEmployeeProfile} from '@/lib/company-access/operational-read.server';
import {readInvitationStatus} from '@/lib/auth/invitations/service.server';
import {EmployeeInvitationPanel} from '@/components/company-access/employee-invitation-panel';
import {ManagerOperationalScopePanel} from '@/components/company-access/manager-operational-scope-panel';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import { EmployeeCoreProfileForm, EmployeeStatusForm, SheetField } from "@/components/employee-core-profile-form";
import { ConfigurationForm } from "@/components/configuration-form";
import { OperationalRuleFields } from "@/components/operational-rule-fields";
import { ChoiceField, FormHead, FormHeadLink, SheetMarker } from "@/components/team/team-forms";
import { phoneDisplay } from "@/components/team/phone";
import { employeeInitials } from "@/lib/employee-display";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listPositions } from "@/lib/data/positions";
import { readOperationalRuleProfileView } from "@/lib/data/shift-change-views";
import { employeeRoleLabel } from "@/lib/employee-display";
import Link from "next/link";
import { CorpAvatar, CorpBody, CorpButtonLink, CorpCard, CorpNav, CorpNote, CorpPage, CorpPill, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
import { TeamLivePill, TeamLiveProvider } from "@/components/team-live";
import { ChatTextIcon } from "@phosphor-icons/react/dist/ssr/ChatText";
import { PhoneIcon } from "@phosphor-icons/react/dist/ssr/Phone";
import "@/components/team/team-forms.css";
import {
  saveEmployeeCoreProfileAction,
  saveEmployeeSchedulingProfileAction,
} from "../actions";

export default async function EmployeeProfilePage({
  params, searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams?: Promise<{ edit?: string; view?: string }>;
}) {
  await requireRoles(MANAGER_ROLES);
  const { employeeId } = await params;

  const proof=await requireSessionMutationProof();
  const actor=proof.employee;
  const source=await withOperationalCompany(proof,async()=>{
    const profile=await readOperationalEmployeeProfile(proof,employeeId);
    if(profile.state==='unavailable')return {profile,positions:[],operational:null,profileUnavailable:false,invitation:null,pin:null};
    const positions=await listPositions({includeInactive:true});
    let operational=null,profileUnavailable=false;
    try{operational=await readOperationalRuleProfileView(proof,profile.data.profile.id);}catch{profileUnavailable=true;}
    const invitation=proof.employee.role==='OWNER'?await readInvitationStatus(proof,employeeId):null;
    let pin:EmployeePinView|null=null;if(proof.employee.role==='OWNER'&&profile.data.profile.active){try{pin=await readEmployeeClockerPin({employeeId:proof.employee.id,sessionTokenHash:proof.sessionTokenHash},employeeId);}catch{}}
    return {profile,positions,operational,profileUnavailable,invitation,pin};
  });
  if(source.state==='unavailable')return <OperationalUnavailable title="Employee profile unavailable" reason={source.reason}/>;
  const {profile,positions,operational,profileUnavailable,invitation,pin}=source.data;
  if(profile.state==='unavailable')return <OperationalUnavailable title="Employee profile unavailable" reason={profile.reason}/>;
  const {profile:employee,locations,ownerScope}=profile.data;
  const primaryLocation = locations.find(
    (location) => location.id === employee.primaryLocationId,
  );
  const canManageCore = actor.role === "OWNER" || employee.role !== "OWNER";

  const roleLabel = employeeRoleLabel(employee.role);
  const query = (await searchParams) ?? {};
  const editing = query.edit === "1" ? "core" : query.edit === "positions" ? "positions" : query.edit === "rules" ? "rules" : null;
  const accessView = !editing && query.view === "access";
  const positionNames = employee.positionIds.map(id => positions.find(position => position.id === id)?.name).filter(Boolean).join(", ");
  const name = `${employee.firstName} ${employee.lastName}`;
  const base = `/app/employees/${encodeURIComponent(employee.id)}`;
  const recoverable = employee.id !== actor.id && (actor.role === "OWNER" || employee.role === "EMPLOYEE" || employee.role === "LEAD");
  const dial = employee.phone ? employee.phone.replace(/(?!^\+)[^\d]/g, "") : "";
  const pinShown = canManageCore && employee.active && actor.role === 'OWNER' && employee.role !== 'OWNER';
  const pinValue = pin ? (pin.configured ? "Set" : "Not set") : "Unavailable";
  const accountValue = !employee.active ? "Inactive" : invitation?.state === "ready" && invitation.eligibility !== "ALREADY_ACTIVATED" ? (invitation.invitation?.state === "ISSUED" ? "Invited" : "Not activated") : "Active";
  const inviting = invitation !== null && !(invitation.state === "ready" && invitation.eligibility === "ALREADY_ACTIVATED");
  const place = primaryLocation ? `${primaryLocation.shortName}${primaryLocation.active ? "" : " (inactive)"}` : null;

  // Release 1, board O-Person: who they are with Call and Message, their work, then one row to Access and sign-in.
  if (!editing && !accessView) return (<ScopedReadFrame observation={source}>
    <TeamLiveProvider>
    <CorpPage className="c-person c-page--narrow" labelledBy="person-title">
      <CorpNav back={{ href: "/app/employees", label: "Team" }} title={name} titleId="person-nav-title" right={canManageCore ? <Link href={`${base}?edit=1`}>Edit</Link> : undefined} phoneOnly />
      <CorpTitle id="person-title" title={name} wide actions={canManageCore ? <CorpButtonLink href={`${base}?edit=1`} kind="secondary" size="sm">Edit</CorpButtonLink> : undefined} />
      <CorpCard id="person-who" label={`Employee ID ${employee.id}`} aside={employee.active ? <TeamLivePill employeeId={employee.id} /> : <CorpPill tone="neutral">Inactive</CorpPill>}>
        <div className="c-person__who">
          <CorpAvatar initials={employeeInitials(employee.firstName, employee.lastName)} grey={!employee.active} large />
          <span className="c-row__main">
            <span className="c-row__title c-row__title--b">{[positionNames || roleLabel, place].filter(Boolean).join(" · ")}</span>
            <span className="c-row__detail"><span>{employee.phone ? phoneDisplay(employee.phone) : "No phone number"}</span></span>
          </span>
          {dial ? <a className="c-person__act" href={`tel:${dial}`} aria-label={`Call ${name}`}><PhoneIcon className="c-ic" aria-hidden="true" /></a> : null}
          {dial ? <a className="c-person__act" href={`sms:${dial}`} aria-label={`Message ${name}`}><ChatTextIcon className="c-ic" aria-hidden="true" /></a> : null}
        </div>
      </CorpCard>
      <CorpCard as="div" ariaLabel="Work">
        <CorpRows label="Work">
          <li><CorpRow href="/app/schedule" title="Shifts" label={`Shifts for ${name}`} chevron /></li>
          <li><CorpRow href={`/app/timecards#timecard-${encodeURIComponent(employee.id)}`} title="Timecards" label={`Timecards for ${name}`} chevron /></li>
          <li><CorpRow href="/app/availability" title="Availability" label={`Availability for ${name}`} chevron /></li>
        </CorpRows>
      </CorpCard>
      <CorpCard as="div" ariaLabel="Access and sign-in">
        <CorpRow href={`${base}?view=access`} bold title="Access and sign-in" chevron
          detail={[roleLabel, pinShown ? (pin ? (pin.configured ? "Clocker PIN set" : "No Clocker PIN") : null) : null, accountValue].filter(Boolean).join(" · ")} />
      </CorpCard>
    </CorpPage>
    </TeamLiveProvider>
  </ScopedReadFrame>);

  // Release 1, board O-PersonAccess: role, Clocker PIN and account; reset password; the Owner's invitation and management
  // access controls; then Deactivate (red outline) at the bottom.
  if (accessView) return (<ScopedReadFrame observation={source}>
    <CorpPage className="c-person c-access c-page--narrow" labelledBy="access-title">
      <CorpNav back={{ href: base, label: employee.firstName }} title="Access and sign-in" titleId="access-nav-title" phoneOnly />
      <CorpTitle id="access-title" title="Access and sign-in" sub={name} wide />
      <CorpCard id="person-access" label="Access">
        <CorpRows label="Access">
          <li>{canManageCore ? <CorpRow href={`${base}?edit=1`} title="Role" value={roleLabel} valueTone="soft" label={`Role, ${roleLabel}. Change it in Edit employee`} chevron /> : <CorpRow title="Role" value={roleLabel} valueTone="soft" />}</li>
          {pinShown ? <li><CorpRow href={`${base}/clocker-pin`} title="Clocker PIN" value={pinValue} valueTone="soft" chevron /></li> : null}
          <li><CorpRow title="Account" value={accountValue} valueTone="soft" /></li>
        </CorpRows>
      </CorpCard>
      {canManageCore && employee.active && recoverable ? <CorpCard as="div" ariaLabel="Reset password">
        <CorpRow href={`/app/account-recovery?employee=${encodeURIComponent(employee.id)}`} bold title="Reset password" detail="Give them a one-time code to sign back in" chevron />
      </CorpCard> : null}
      {/* The Owner's account invitation (until the account is activated) and a Manager's management access. */}
      {actor.role==='OWNER'&&(inviting||employee.role==='MANAGER') ? <div className="c-access__panels">
        {inviting ? <EmployeeInvitationPanel actorId={actor.id} employeeId={employee.id} initialStatus={invitation}/> : null}
        {employee.role==='MANAGER'?(ownerScope?<ManagerOperationalScopePanel actorId={actor.id} current={ownerScope} locations={locations}/>:<p className="c-note" role="status">Management access could not be confirmed. Refresh this employee before changing access.</p>):null}
      </div> : null}
      {canManageCore && employee.id !== actor.id ? <div className="c-access__foot">
        <EmployeeStatusForm employee={employee} locations={locations} actorId={actor.id} actorRole={actor.role} ownerScope={ownerScope} action={saveEmployeeCoreProfileAction} />
      </div> : null}
    </CorpPage>
  </ScopedReadFrame>);

  // Release 1, board O-EditEmployee: a sheet (Cancel · Edit employee · Save). Positions and the hour rules each open their
  // own sheet with its own Save, as before (two separate saves, never mixed into one).
  if (editing === "positions") return (<ScopedReadFrame observation={source}>
    <CorpPage className="c-sheetpage c-editpos" labelledBy="person-edit-title">
      <SheetMarker />
      <FormHead titleId="person-edit-title" title="Positions" left={<FormHeadLink href={`${base}?edit=1`}>Cancel</FormHeadLink>} right={<button type="submit" form="employee-scheduling">Save</button>} />
      <ConfigurationForm id="employee-scheduling" action={saveEmployeeSchedulingProfileAction} className="c-teamform" reviewedUpdatedAt={employee.updatedAt}>
        <input type="hidden" name="employeeId" value={employee.id} />
        <ChoiceField listed label="Positions" name="positionIds" empty="No positions yet. Positions are optional."
          choices={positions.filter(position => position.active || employee.positionIds.includes(position.id)).map(position => ({ value: position.id, label: position.name, checked: employee.positionIds.includes(position.id), help: position.active ? undefined : "Inactive, kept as a qualification" }))} />
        <ChoiceField listed label="Locations they can work at" name="eligibleLocationIds"
          choices={locations.filter(location => location.active || employee.eligibleLocationIds.includes(location.id) || employee.primaryLocationId === location.id).map(location => ({
            value: location.id, label: location.shortName, checked: employee.eligibleLocationIds.includes(location.id) || employee.primaryLocationId === location.id, disabled: employee.primaryLocationId === location.id,
            help: [!location.active ? "Inactive" : null, employee.primaryLocationId === location.id ? "Their location, always included" : null].filter(Boolean).join(" · ") || undefined }))} />
      </ConfigurationForm>
    </CorpPage>
  </ScopedReadFrame>);

  if (editing === "rules") return (<ScopedReadFrame observation={source}>
    <CorpPage className="c-forms wa-page wa-member" labelledBy="person-rules-title">
      <CorpNav back={{ href: `${base}?edit=1`, label: "Edit" }} title="Hours and rules" titleId="person-rules-title" />
      <CorpCard id="member-rules" label="Operational rules">
        {profileUnavailable ? <CorpBody><p className="c-error" role="alert">Couldn’t load the rules. Reconnect and reload the page.</p></CorpBody>
          : operational ? <OperationalRuleFields employeeId={employee.id} profile={operational} canEdit={actor.role === "OWNER"} />
          : <CorpBody><p className="c-line2">Set this person’s weekly hours first. No maximum is created by this review.</p>
            <Link className="c-link c-link--l" href={`/app/schedule/settings#target-${encodeURIComponent(employee.id)}`}>Set weekly hours</Link></CorpBody>}
      </CorpCard>
    </CorpPage>
  </ScopedReadFrame>);

  const more = <>
    <SheetField label="Positions" value={positionNames} placeholder="None yet" href={`${base}?edit=positions`} />
    <SheetField label="Hours and rules" value={profileUnavailable ? "Unavailable" : operational ? "Set" : "Not set"} href={`${base}?edit=rules`} />
  </>;
  return (<ScopedReadFrame observation={source}>
    <CorpPage className="c-sheetpage c-editemp" labelledBy="person-edit-title">
      <SheetMarker />
      {canManageCore ? (
        <EmployeeCoreProfileForm employee={employee} locations={locations} actorId={actor.id} actorRole={actor.role} ownerScope={ownerScope} action={saveEmployeeCoreProfileAction} cancelHref={base} more={more} />
      ) : (<>
        <FormHead titleId="person-edit-title" title="Edit employee" left={<FormHeadLink href={base}>Cancel</FormHeadLink>} />
        <CorpNote>Only an Owner can change another Owner. Positions and hours stay available here.</CorpNote>
        <div className="c-teamform">{more}</div>
      </>)}
    </CorpPage>
  </ScopedReadFrame>);
}
