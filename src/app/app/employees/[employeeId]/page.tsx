import {clockerOwnerCopy} from '@/components/clocker-owner-copy';
import {scopedObservation} from '@/lib/company-access/observation';
import {readEmployeeClockerPin,type EmployeePinView} from '@/lib/clocker/pins.server';

import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedPerson} from '@/components/company-access/scoped-person';
import {readOperationalEmployeeHours,readOperationalEmployeeProfile} from '@/lib/company-access/operational-read.server';
import type {PersonHours} from '@/lib/person-hours';
import {durationSentence} from '@/lib/duration-format';
import {readInvitationStatus} from '@/lib/auth/invitations/service.server';
import {EmployeeInvitationPanel} from '@/components/company-access/employee-invitation-panel';
import {ManagerOperationalScopePanel} from '@/components/company-access/manager-operational-scope-panel';
import {ManagerActionGrants} from '@/components/workforce/manager-action-grants';
import {readPortalLanguage} from '@/lib/activation/language.server';
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
import { getWorkspace } from "@/lib/data/workspaces";
import { christmasBonusApplies } from "@/lib/reports/christmas-bonus";
import { readOperationalRuleProfileView } from "@/lib/data/shift-change-views";
import { employeeRoleLabel } from "@/lib/employee-display";
import Link from "next/link";
import { CORP_NO_VALUE, CorpAvatar, CorpBody, CorpButtonLink, CorpCard, CorpMeta, CorpNav, CorpPage, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
import { TeamLivePill, TeamLiveProvider } from "@/components/team-live";
import { BCallout, BSegs } from "@/components/owner-b/b-kit";
import { ChatTextIcon } from "@phosphor-icons/react/dist/ssr/ChatText";
import { PhoneIcon } from "@phosphor-icons/react/dist/ssr/Phone";
import "@/components/team/team-forms.css";
import {
  saveEmployeeCoreProfileAction,
  saveEmployeeSchedulingProfileAction,
} from "../actions";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Team member" };

export default async function EmployeeProfilePage({
  params, searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams?: Promise<{ edit?: string; view?: string; from?: string; year?: string }>;
}) {
  await requireRoles(MANAGER_ROLES);
  const { employeeId } = await params;

  const proof=await requireSessionMutationProof();
  const actor=proof.employee;
  const query = (await searchParams) ?? {};
  const editing = query.edit === "1" ? "core" : query.edit === "positions" ? "positions" : query.edit === "rules" ? "rules" : null;
  const accessView = !editing && query.view === "access";
  const source=await withOperationalCompany(proof,async()=>{
    // Employment dates (birth date included) are read only for the edit sheet, never for the overview or Access pages.
    const profile=await readOperationalEmployeeProfile(proof,employeeId,undefined,{employmentDates:editing==='core'});
    if(profile.state==='unavailable')return {profile,positions:[],operational:null,profileUnavailable:false,invitation:null,pin:null,hours:null,bonusApplies:true};
    const positions=await listPositions({includeInactive:true});
    let operational=null,profileUnavailable=false;
    try{operational=await readOperationalRuleProfileView(proof,profile.data.profile.id);}catch{profileUnavailable=true;}
    const invitation=proof.employee.role==='OWNER'?await readInvitationStatus(proof,employeeId):null;
    let pin:EmployeePinView|null=null;if(proof.employee.role==='OWNER'&&profile.data.profile.active){try{pin=await readEmployeeClockerPin({employeeId:proof.employee.id,sessionTokenHash:proof.sessionTokenHash},employeeId);}catch{}}
    // Nov 14, 2026 inspection (BR-3): the person's hours, for the overview only, through the existing protected read. A read
    // that fails or is refused leaves the card out; it never takes the page down.
    let hours:PersonHours|null=null;if(!editing&&!accessView&&profile.data.profile.active){try{const read=await readOperationalEmployeeHours(proof,employeeId);if(read.state==='ready')hours=read.data;}catch{}}
    // Review 30 (D38): the edit sheet's hire date line names Christmas bonus hours only in a Puerto Rico workspace. A
    // failed read keeps today's line; it never takes the sheet down.
    let bonusApplies=true;if(editing==='core'&&profile.data.employmentDates){try{bonusApplies=christmasBonusApplies((await getWorkspace()).timeZone);}catch{}}
    return {profile,positions,operational,profileUnavailable,invitation,pin,hours,bonusApplies};
  });
  // G17 (Jose, Nov 23, 2026): the company-wide read refuses a Manager limited to some locations; the scoped read decides
  // whether this person works at one of them (server-side, the scoped Team list's boundary) and shows only that view.
  if(source.state==='unavailable'&&source.reason==='access_denied'&&actor.role==='MANAGER')return ScopedPerson({proof,employeeId,view:editing||accessView?'company':'overview'});
  if(source.state==='unavailable')return <OperationalUnavailable title="Employee profile unavailable" reason={source.reason}/>;
  const {profile,positions,operational,profileUnavailable,invitation,pin,hours,bonusApplies}=source.data;
  if(profile.state==='unavailable')return <OperationalUnavailable title="Employee profile unavailable" reason={profile.reason}/>;
  const {profile:employee,locations,ownerScope,employmentDates}=profile.data;
  const primaryLocation = locations.find(
    (location) => location.id === employee.primaryLocationId,
  );
  const canManageCore = actor.role === "OWNER" || employee.role !== "OWNER";

  const roleLabel = employeeRoleLabel(employee.role);
  const positionList = employee.positionIds.map(id => positions.find(position => position.id === id)?.name).filter((name): name is string => !!name);
  const positionNames = positionList.join(", ");
  const name = `${employee.firstName} ${employee.lastName}`;
  const base = `/app/employees/${encodeURIComponent(employee.id)}`;
  const recoverable = employee.id !== actor.id && (actor.role === "OWNER" || employee.role === "EMPLOYEE" || employee.role === "LEAD");
  const dial = employee.phone ? employee.phone.replace(/(?!^\+)[^\d]/g, "") : "";
  const pinShown = canManageCore && employee.active && actor.role === 'OWNER' && employee.role !== 'OWNER';
  const pinValue = pin ? (pin.configured ? "Set" : "Not set") : "Unavailable";
  const accountValue = !employee.active ? "Inactive" : invitation?.state === "ready" && invitation.eligibility !== "ALREADY_ACTIVATED" ? (invitation.invitation?.state === "ISSUED" ? "Invited" : "Not activated") : "Active";
  const inviting = invitation !== null && !(invitation.state === "ready" && invitation.eligibility === "ALREADY_ACTIVATED");
  const place = primaryLocation ? `${primaryLocation.shortName}${primaryLocation.active ? "" : " (inactive)"}` : null;
  // Nov 14, 2026 inspection (BR-3): where this person stands on signing in, said under their name. Only an Owner's page
  // reads the invitation, so a Manager's page says nothing rather than guess. The date is the workplace's day.
  const issued = invitation?.state === "ready" && invitation.invitation?.state === "ISSUED" ? new Date(invitation.invitation.issuedAt) : null;
  let invitedOn: string | null = null;
  if (issued && hours && Number.isFinite(issued.getTime())) { try { invitedOn = new Intl.DateTimeFormat("en-US", { timeZone: hours.timeZone, month: "short", day: "numeric" }).format(issued); } catch { /* no date: "Invited, not activated" */ } }
  const signIn = !employee.active || invitation?.state !== "ready" || invitation.eligibility === "SELF_ISSUE_DENIED" ? null
    : invitation.eligibility === "ALREADY_ACTIVATED" ? "Sign-in active"
    : invitation.eligibility === "NO_EMAIL" ? "No email, can’t sign in"
    : invitation.invitation?.state === "ISSUED" ? `Invited${invitedOn ? ` ${invitedOn}` : ""}, not activated`
    : invitation.invitation?.state === "EXPIRED" ? "Invitation expired" : "Not invited yet";
  const signInOpen = signIn && signIn !== "Sign-in active" ? signIn : null;
  const pinOpen = pinShown && pin && !pin.configured ? "No Clocker PIN yet" : null;
  // The person's hours as figures. Phase 8 (a.md #31): the scheduled figures are null when the schedule read was not
  // complete, so a dash would read as "none"; the row says the figure isn't available and why. Worked time keeps the dash.
  const minutes = (value: number | null) => value === null ? CORP_NO_VALUE : durationSentence(value, "0 h");
  const scheduled = (value: number | null) => value === null ? { value: "Not available", detail: "The whole schedule couldn’t be read" } : { value: minutes(value) };
  // AR-10: Shifts opens the schedule at this person's location (the schedule has no one-person view), and Availability
  // opens this person's availability.
  const shiftsHref = primaryLocation?.active ? `/app/schedule?location=${encodeURIComponent(primaryLocation.id)}` : "/app/schedule";

  // Release 1, board O-Person: who they are with Call and Message, their work, then one row to Access and sign-in.
  if (!editing && !accessView) return (<ScopedReadFrame observation={scopedObservation(source)}>
    <TeamLiveProvider>
    <CorpPage className="c-person c-page--narrow" labelledBy="person-title">
      <CorpNav back={{ href: "/app/employees", label: "Team" }} title={name} titleId="person-nav-title" right={canManageCore ? <Link href={`${base}?edit=1`}>Edit</Link> : undefined} phoneOnly />
      <CorpTitle id="person-title" title={name} sub={signIn ?? undefined} wide actions={canManageCore ? <CorpButtonLink href={`${base}?edit=1`} kind="secondary" size="sm">Edit</CorpButtonLink> : undefined} />
      {/* Owner premium R7: what they do and where first; the employee ID moves to the detail line, and their state is grey
        words beside it (R3), not a header or a pill. */}
      <CorpCard id="person-who" ariaLabel={name}>
        <div className="c-person__who">
          <CorpAvatar name={`${employee.firstName} ${employee.lastName}`} initials={employeeInitials(employee.firstName, employee.lastName)} grey={!employee.active} large />
          <span className="c-row__main">
            {/* Round 5 (Nov 7): each segment carries its own "· " so a phone can wrap segments whole and clip the dot that
              would start a line; the text reads the same as before ("Kitchen · Calle Loíza", "555-0199 · ID 7"). */}
            {/* Review B6 (NV-092): where they work leads; positions are chips under it; the employee ID moves to Access and
              * sign-in (internals stay out of the most-read line). */}
            {/* Phase 8 (a.md #3): the phone layer starts the line 13px left of the text column and gives that room back to
              * the line's first element; a bare text node has none, so the first letter was clipped ("alle Loíza"). */}
            <span className="c-row__title c-row__title--b"><span>{place ?? roleLabel}</span></span>
            {/* Premium pass FA (final verification A #1, #29): positions are facts, so they are one grey line under the place
              * ("Front counter · Kitchen · Barista · Baker", wrapping whole between positions), not chips; and the state
              * follows the phone on its line, after a "·" (a chip or a live dot needs none), at every width. */}
            {positionList.length ? <span className="c-person__roles"><BSegs parts={positionList} /></span> : null}
            <span className="c-row__detail"><span className="c-person__bits"><span className="c-person__bit">{employee.phone ? phoneDisplay(employee.phone) : "No phone number"}</span></span>
              <span className="c-person__state">{employee.active ? <TeamLivePill employeeId={employee.id} /> : <CorpMeta>Inactive</CorpMeta>}</span></span>
          </span>
          {dial ? <a className="c-person__act" href={`tel:${dial}`} aria-label={`Call ${name}`}><PhoneIcon weight="bold" className="c-ic" aria-hidden="true" /></a> : null}
          {dial ? <a className="c-person__act" href={`sms:${dial}`} aria-label={`Message ${name}`}><ChatTextIcon weight="bold" className="c-ic" aria-hidden="true" /></a> : null}
        </div>
      </CorpCard>
      {hours ? <CorpCard id="person-hours" label="Hours">
        <CorpRows label="Hours">
          <li><CorpRow title="Scheduled today" {...scheduled(hours.scheduledTodayMinutes)} valueTone="soft" /></li>
          <li><CorpRow title="Scheduled this week" {...scheduled(hours.scheduledWeekMinutes)} valueTone="soft" /></li>
          {/* Worked time is time on the clock with breaks in it, so the row never says "paid". */}
          <li><CorpRow title="Clocked this week" detail="Includes breaks" value={minutes(hours.workedWeekMinutes)} valueTone="soft" /></li>
        </CorpRows>
      </CorpCard> : null}
      {/* Phase 2 (Nov 23, 2026; agent brief rule 7, axe label-content-name-mismatch): rows are named by their visible text;
        * the page is the person's, so "for <name>" isn't added. */}
      <CorpCard as="div" ariaLabel="Work">
        <CorpRows label="Work">
          <li><CorpRow href={shiftsHref} title="Shifts" chevron /></li>
          <li><CorpRow href={`/app/timecards#timecard-${encodeURIComponent(employee.id)}`} title="Timecards" chevron /></li>
          <li><CorpRow href={`/app/availability?employeeId=${encodeURIComponent(employee.id)}`} title="Availability" chevron /></li>
          {/* Scheduling restrictions (U02): the times agreed with this person, kept apart from the availability they send. */}
          <li><CorpRow href={`${base}/restrictions`} title="When they can be scheduled" chevron /></li>
          {actor.role === "OWNER" ? <li><CorpRow href={`${base}/pay`} title="Pay rate" chevron /></li> : null}
          {actor.role === "OWNER" ? <li><CorpRow href={`${base}/time-off`} title="Time off balance" chevron /></li> : null}
        </CorpRows>
      </CorpCard>
      <CorpCard as="div" ariaLabel="Access and sign-in">
        {/* Owner premium R7: the one thing to act on (no Clocker PIN yet, an invitation), else their role. */}
        <CorpRow href={`${base}?view=access`} bold title="Access and sign-in" chevron
          detail={signInOpen || pinOpen ? [signInOpen, pinOpen].filter(Boolean).join(" · ") : accountValue !== "Active" ? accountValue : roleLabel} />
      </CorpCard>
    </CorpPage>
    </TeamLiveProvider>
  </ScopedReadFrame>);

  // Release 1, board O-PersonAccess: role, Clocker PIN and account; reset password; the Owner's invitation and management
  // access controls; then Deactivate (red outline) at the bottom.
  let accessLang: "en" | "es" = "en";
  if (accessView && actor.role === "OWNER" && employee.role === "MANAGER") { try { accessLang = (await readPortalLanguage(proof)).language; } catch { /* English */ } }
  if (accessView) return (<ScopedReadFrame observation={scopedObservation(source)}>
    <CorpPage className="c-person c-access c-page--narrow" labelledBy="access-title">
      <CorpNav back={{ href: base, label: employee.firstName }} title="Access and sign-in" titleId="access-nav-title" phoneOnly />
      <CorpTitle id="access-title" title="Access and sign-in" sub={name} wide />
      {/* Phase 2 (Nov 23, 2026): the band says "Access and sign-in", so the card carries no second "Access" heading. */}
      <CorpCard id="person-access" ariaLabel="Access">
        <CorpRows label="Access">
          <li>{canManageCore ? <CorpRow href={`${base}?edit=1`} title="Role" value={roleLabel} valueTone="soft" chevron /> : <CorpRow title="Role" value={roleLabel} valueTone="soft" />}</li>
          {/* Phase 6: without a PIN the row says so and what it means, and opens the form that sets one. */}
          {pinShown ? <li>{pin && !pin.configured
            ? <CorpRow href={`${base}/clocker-pin`} title={clockerOwnerCopy.en.personPinNone} detail={clockerOwnerCopy.en.personPinNoneSub} value={clockerOwnerCopy.en.setPin} valueTone="teal" chevron />
            : <CorpRow href={`${base}/clocker-pin`} title={clockerOwnerCopy.en.personPinSet} value={pinValue} valueTone="soft" chevron />}</li> : null}
          <li><CorpRow title="Account" value={accountValue} valueTone="soft" /></li>
          {/* Review B6 (NV-092): the employee ID lives here, not in the person's first line. */}
          <li><CorpRow title="Employee ID" value={employee.id} valueTone="soft" /></li>
        </CorpRows>
      </CorpCard>
      {canManageCore && employee.active && recoverable ? <CorpCard as="div" ariaLabel="Reset password">
        <CorpRow href={`/app/account-recovery?employee=${encodeURIComponent(employee.id)}`} bold title="Reset password" detail="Give them a link to set a new password" chevron />
      </CorpCard> : null}
      {/* The Owner's account invitation (until the account is activated) and a Manager's management access. */}
      {actor.role==='OWNER'&&(inviting||employee.role==='MANAGER') ? <div className="c-access__panels">
        {inviting ? <EmployeeInvitationPanel actorId={actor.id} employeeId={employee.id} initialStatus={invitation}/> : null}
        {employee.role==='MANAGER'?(ownerScope?<ManagerOperationalScopePanel actorId={actor.id} current={ownerScope} locations={locations}/>:<p className="c-note" role="status">Management access could not be confirmed. Refresh this employee before changing access.</p>):null}
        {/* SCRUM-215: the actions this Manager may take, granted one by one at each location they manage. */}
        {employee.role==='MANAGER'&&ownerScope?<ManagerActionGrants key={`${employee.id}:${ownerScope.scopeRevision}:${ownerScope.roleGeneration}`} employeeId={employee.id} firstName={employee.firstName} lang={accessLang}
          manager={ownerScope.active} locations={locations.map(location=>({id:location.id,name:location.shortName||location.name,active:location.active}))}
          scopeLocationIds={!ownerScope.scope?null:ownerScope.scope.mode==='COMPANY'?'all':ownerScope.scope.locationIds}/>:null}
      </div> : null}
      {canManageCore && employee.id !== actor.id ? <div className="c-access__foot">
        <EmployeeStatusForm employee={employee} locations={locations} actorId={actor.id} actorRole={actor.role} ownerScope={ownerScope} action={saveEmployeeCoreProfileAction} />
      </div> : null}
    </CorpPage>
  </ScopedReadFrame>);

  // Release 1, board O-EditEmployee: a sheet (Cancel · Edit employee · Save). Positions and the hour rules each open their
  // own sheet with its own Save, as before (two separate saves, never mixed into one).
  if (editing === "positions") return (<ScopedReadFrame observation={scopedObservation(source)}>
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

  if (editing === "rules") return (<ScopedReadFrame observation={scopedObservation(source)}>
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
  // Review 30 (D21): "Add hire date" on Christmas bonus hours opens this sheet with from=bonus (and the report's year). The
  // hire date takes focus, Cancel goes back to the report, and the saved state's next step returns there.
  const bonusYear = /^\d{4}$/.test(query.year ?? "") ? query.year : null;
  const fromBonus = query.from === "bonus" ? { href: `/app/reports/christmas-bonus${bonusYear ? `?year=${bonusYear}` : ""}`, label: "Back to Christmas bonus hours", focusHire: true } : undefined;
  return (<ScopedReadFrame observation={scopedObservation(source)}>
    <CorpPage className="c-sheetpage c-editemp" labelledBy="person-edit-title">
      <SheetMarker />
      {canManageCore ? (
        <EmployeeCoreProfileForm employee={employee} locations={locations} actorId={actor.id} actorRole={actor.role} ownerScope={ownerScope} action={saveEmployeeCoreProfileAction} cancelHref={fromBonus?.href ?? base} more={more} employmentDates={employmentDates} bonusApplies={bonusApplies} returnTo={fromBonus} />
      ) : (<>
        <FormHead titleId="person-edit-title" title="Edit employee" left={<FormHeadLink href={base}>Cancel</FormHeadLink>} />
        {/* Final verification F (F05): a Manager editing an Owner sees the sheet's one card, as the Owner's form is: the
          lock note as its first item (grey, set by someone else; same words) and the two pickers at the form's 560 block. */}
        <section className="c-card c-teamform-lock" aria-label="What you can change">
          <BCallout tone="grey" icon="locked" title="Only an Owner can change another Owner">Positions and hours stay available here.</BCallout>
          <div className="c-teamform">{more}</div>
        </section>
      </>)}
    </CorpPage>
  </ScopedReadFrame>);
}
