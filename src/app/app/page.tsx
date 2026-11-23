import {readFeatureFlags} from '../../lib/feature-flags';
import {scopedObservation} from '@/lib/company-access/observation';
import {mobileAccessEnabled} from "@/components/mobile-access/config.server";
import {MobileOnboardingGuide} from "@/components/mobile-access/onboarding-guide";
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {BRouteError} from '@/components/owner-b/b-route-error';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {ManagerCorrectionRecoveryBoundary} from '@/components/manager-correction-recovery';
import {managerReviewRecoveryKey} from '@/lib/time-corrections/review-recovery';
import {readOperationalAuthority} from '@/lib/company-access/operational-scope.server';
import {ScopedManagementHome} from '@/components/company-access/scoped-operational-views';
import {ScopedHomeLive,ScopedWhosWorking} from '@/components/company-access/scoped-home';
import {readOperationalSchedule} from '@/lib/company-access/operational-read.server';
import {ActionMenu} from '@/components/action-menu';
import {MapPinIcon} from '@phosphor-icons/react/dist/ssr/MapPin';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import Link from 'next/link';
import type {HomeShortcut} from '@/components/owner-b/home-b';
import {loadManagerDashboardData} from '@/lib/data/manager-dashboard';
import {getWorkspace} from '@/lib/data/workspaces';
import {businessDate} from '@/lib/business-time';
import {EmployeeDashboard} from '@/components/employee-dashboard';
import type {HomeWeek} from '@/components/employee-home-quiet';
import {readEmployeeWeeklyReview} from '@/lib/data/employee-weekly-review.server';
import {ManagerDashboard,type ManagerDashboardView} from '@/components/manager-dashboard';
import {readPortalLanguage} from '@/lib/activation/language.server';
import {readPageLang} from '@/lib/i18n/page-lang.server';
import {HOME_PAGE_COPY} from './home-page-copy';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {homeAuthority} from '@/lib/data/employee-home.server';
import {isManagerRole} from '@/lib/auth/permissions';
import {currentPresentation} from '@/lib/workspace-presentation/current.server';
import {requestTypeAllowed} from '@/lib/workspace-presentation/modules';
import {addDays,durationMinutes,formatWeekRange,isValidWeekStart,weekDates,weekStartFor} from '@/lib/date-utils';
import {redirect} from 'next/navigation';
import {readHomePayrollStatus,readNextPay} from './my-pay/next-pay';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {payrollFeatureEnabled} from '@/lib/payroll/service';
import {retiredViewDestination} from '@/lib/retired-views';

const DASHBOARD_VIEWS: ManagerDashboardView[] = [
  "overview",
  "attendance",
  "team",
  "activity",
];


function validDashboardView(value?: string): ManagerDashboardView {
  return DASHBOARD_VIEWS.includes(value as ManagerDashboardView)
    ? (value as ManagerDashboardView)
    : "overview";
}

function validWeek(value?: string) {
  return (
    value && isValidWeekStart(value)
  );
}

export async function generateMetadata() { return { title: { absolute: HOME_PAGE_COPY[await readPageLang()].title } }; }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; week?: string; day?: string; location?: string; employee?: string }>;
}) {
  const session = await requireSession();
  const workspace = await getWorkspace();
  const manager = isManagerRole(session.role);
  const params = await searchParams;
  const currentDate = businessDate(new Date(), workspace.timeZone);
  const currentWeek = weekStartFor(currentDate);
  const lang = await readPageLang(), t = HOME_PAGE_COPY[lang];

  if (!manager) {
    const proof=await requireSessionMutationProof();
    // v5 Home's week at a glance: the same own published-schedule read the Schedule page uses (read only).
    // Upscale M7: the following week too (same read), so "Coming up" can list the next shifts across the week boundary.
    const followingWeek=addDays(currentWeek,7);
    const [review,following]=await Promise.all([readEmployeeWeeklyReview(proof,currentWeek),readEmployeeWeeklyReview(proof,followingWeek)]);
    const own=(read:typeof review)=>read.shifts.map(({id,date,startTime,endTime,locationId,positionName,isDesignatedLead})=>({id,date,startTime,endTime,lead:isDesignatedLead,where:[positionName,read.locations.find(location=>location.id===locationId)?.shortName].filter(Boolean).join(' · ')}));
    const week:HomeWeek|null=review.state==='unavailable'?null:{weekStart:currentWeek,today:currentDate,dates:Array.from({length:7},(_,day)=>addDays(currentWeek,day)),shifts:own(review),next:following.state==='unavailable'?null:{weekStart:followingWeek,shifts:own(following)}};
    // A Lead's Home adds Today's team: message everyone on today's team (the existing Updates compose), when Updates is on.
    const presentation=await currentPresentation();
    const teamMessage=session.role==='LEAD'&&presentation.modules.updates;
    // Direction B: hours worked this week (the Time tab's own read) and the next payday (pay schedule), Employees and Leads.
    const b=session.role==='EMPLOYEE'||session.role==='LEAD'?{lead:session.role==='LEAD',hoursAuthority:employeeViewAuthority(proof,'hours'),payday:payrollFeatureEnabled()&&presentation.modules.payStatements?(await readNextPay(workspace.timeZone).catch(()=>null))?.payday??null:null,shortcuts:[...(presentation.modules.timeOff?['timeOff'as const]:[]),...(presentation.modules.marketplace?['callout'as const,'swap'as const]:[]),'fixTime'as const]}:undefined;
    return <EmployeeDashboard b={b} intro={mobileAccessEnabled()?<MobileOnboardingGuide employeeId={session.id} lang={lang} timeOffEnabled={(await currentPresentation()).modules.timeOff}/>:null} authority={homeAuthority(proof)} timeAuthority={correctionAuthority(proof)} displayName={session.firstName} timeZone={workspace.timeZone} workspaceName={workspace.name} week={week} teamMessage={teamMessage} corporate={session.role==='EMPLOYEE'||session.role==='LEAD'}/>;
  }

  const proof=await requireSessionMutationProof();
  const authority=await readOperationalAuthority(proof);
  if(authority.state==='unavailable')return <OperationalUnavailable lang={lang} title={t.unavailable} reason={authority.reason}/>;
  if(authority.scope?.mode!=='COMPANY'){
    if(authority.scope?.mode!=='LOCATIONS'||!authority.locations.length)return <ScopedManagementHome view={authority}/>;
    // Nov 22, 2026 (Jose: the same screens other Managers have, limited to their place): the location Manager's Home is
    // the company Manager's Direction B Home, fed by the reads that already follow this Manager's scope. The band names the
    // place; with several places, a menu chooses one (as on the Schedule). Payroll and timecard counts have no scoped
    // read, so they are left out; nothing company-wide is read.
    const one=authority.locations.length===1?authority.locations[0]:null;
    const chosen=one?undefined:authority.locations.find(location=>location.id===params.location);
    const placeName=(location:{name:string;shortName:string})=>location.shortName||location.name;
    const homeHref=chosen?`/app?location=${encodeURIComponent(chosen.id)}`:'/app';
    // Home's own "Who's working" view, from the same scoped reads (the company view's attendance review is company-wide).
    if(params.view==='attendance')return <ScopedReadFrame observation={authority}><ScopedWhosWorking homeHref={homeHref} locationId={chosen?.id} place={one?placeName(one):chosen?placeName(chosen):undefined}/></ScopedReadFrame>;
    const place=one?<span className="b-date b-place"><MapPinIcon size={15} weight="bold" aria-hidden="true"/>{placeName(one)}</span>
      :<ActionMenu id="b-home-location-menu" label={t.location} title={t.location} ariaLabel={t.locationIs(chosen?placeName(chosen):t.allLocations)} align="start"
        triggerClassName="b-btn b-btn--glass" triggerContent={<><MapPinIcon size={15} weight="bold" aria-hidden="true"/>{chosen?placeName(chosen):t.allLocations}<CaretDownIcon size={13} weight="bold" aria-hidden="true"/></>}>
        <Link className="nevora-action-menu-item" href="/app?location=all" aria-current={chosen?undefined:'page'}><strong>{t.allLocations}</strong></Link>
        {authority.locations.map(location=><Link key={location.id} className="nevora-action-menu-item" href={`/app?location=${encodeURIComponent(location.id)}`} aria-current={chosen?.id===location.id?'page':undefined}><strong>{placeName(location)}</strong></Link>)}
      </ActionMenu>;
    // This week: the week's shifts at this Manager's places (drafts included, as on the company Home), from the scoped
    // schedule read the Schedule uses. A failed read leaves the card out rather than drawing zeros.
    const source=await readOperationalSchedule(proof,{weekStart:currentWeek,...(chosen?{locationId:chosen.id}:{})}).catch(()=>null);
    const shifts=source?.state==='ready'&&source.authority===authority.authority?source.data.shifts:null;
    const {modules}=await currentPresentation();
    const homeB={firstName:session.firstName,place,
      days:weekDates(currentWeek).map(date=>({date,weekday:new Date(`${date}T12:00:00Z`).toLocaleDateString(t.locale,{weekday:'short',timeZone:'UTC'}).replace('.',''),shiftCount:(shifts??[]).filter(shift=>shift.date===date).length})),
      scheduledHours:(shifts??[]).reduce((total,shift)=>total+durationMinutes(shift.startTime,shift.endTime),0)/60,
      people:new Set((shifts??[]).map(shift=>shift.employeeId)).size,
      ...(shifts?{}:{thisWeek:false as const}),
      // Add shift opens the scoped shift form; Time off opens the requests this Manager may decide (a closed page says who
      // decides when they may not). Add employee and Send update are company-wide, so they aren't offered.
      shortcuts:['shift',...(modules.timeOff?['timeOff' as const]:[])] as HomeShortcut[]};
    const dateLabel=new Intl.DateTimeFormat(t.locale,{timeZone:'UTC',weekday:'long',month:'long',day:'numeric'}).format(new Date(`${currentDate}T12:00:00Z`));
    return <ScopedReadFrame observation={authority}><ScopedHomeLive key={`${authority.authority}:${chosen?.id??'all'}`} greeting={t.welcome(session.firstName)} dateLabel={dateLabel}
      timeZone={workspace.timeZone} workspaceName={workspace.name} weekStart={currentWeek} actorId={session.id} locationId={chosen?.id} homeB={homeB}
      week={{weekStart:currentWeek,weekLabel:formatWeekRange(currentWeek),plannedShifts:shifts?.length??0,availabilitySubmitted:0,availabilityEligible:0,locations:[]}}/></ScopedReadFrame>;
  }
  const retired = retiredViewDestination(params);
  if (retired) redirect(retired);
  const weekStart = validWeek(params.week) ? params.week! : currentWeek;
  const view = validDashboardView(params.view);
  const previousWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const source=await withOperationalCompany(proof,()=>loadManagerDashboardData(weekStart,proof));
  if(source.state==='unavailable'&&source.reason!=='read_failed')return <OperationalUnavailable lang={lang} title={t.unavailable} reason={source.reason}/>;
  const dashboardData=source.state==='ready'?source.data:null;
  const reviewAuthority=correctionAuthority(proof);
  const recoveryKey=managerReviewRecoveryKey(session.id,reviewAuthority,source.state==='ready'?source.authority:authority.authority,view);
  // WR-59: the same kit error page as app/app/error.tsx. IS-50: "Try again" reloads this exact view (week, day, location, person).
  // IS-51: only the view's own context; one-time flags (decided=…) stay out so a toast never repeats.
  const retry=new URLSearchParams((['view','week','day','location','employee'] as const).flatMap(key=>{const value=params[key];return typeof value==='string'&&value?[[key,value]]:[];})).toString();
  // Phase 2 (package D, optional): the one Direction B route error screen. It was the older kit page, which had no band
  // under Direction B. The words and both actions are unchanged; Try again stays a link to this exact view.
  if(!dashboardData)return <ManagerCorrectionRecoveryBoundary key={recoveryKey}><BRouteError title={t.didntLoad} sub={t.nothingChanged}
    spoken={t.spoken} line={t.checkConnection}
    retryHref={retry?`/app?${retry}`:'/app'} away={view!=='overview'?{href:'/app',label:t.backHome}:undefined}/></ManagerCorrectionRecoveryBoundary>;
  const {dashboard,locations,availabilitySubmissionSummary,coverageRulesConfigured,managerActions,daySummaries,hourRows,latestRevision,coverageMinutes}=dashboardData;

  const {modules}=await currentPresentation();
  // MK1: Home's "Next payday" row, from the date My pay shows (none when pay statements are off or there's no schedule).
  const nextPay=view==='overview'&&modules.payStatements?await readNextPay(workspace.timeZone):null;
  const payrollStatus=session.role==='OWNER'&&view==='overview'&&modules.payStatements&&readFeatureFlags(process.env).payroll?await readHomePayrollStatus(proof):null;
  // SCRUM-218: the Owner's first-week setup card speaks the Owner's portal language (saved choice, then this device's).
  let setupLang:'en'|'es'='en';
  if(session.role==='OWNER'&&view==='overview'){try{setupLang=(await readPortalLanguage(proof)).language;}catch{/* English */}}
  return (<ManagerCorrectionRecoveryBoundary key={recoveryKey}><ScopedReadFrame observation={scopedObservation(source.state==='ready'?source:null)}>
    <ManagerDashboard
      setupLang={setupLang}
      shortcutModules={{updates:modules.updates,timeOff:modules.timeOff}}
      role={session.role === "OWNER" ? "OWNER" : "MANAGER"}
      actorId={session.id}
      correctionAuthority={reviewAuthority}
      workspaceName={workspace.name}
      timeZone={workspace.timeZone}
      firstName={session.firstName}
      greeting={t.welcome(session.firstName)}
      dateLabel={new Intl.DateTimeFormat(t.locale,{timeZone:'UTC',weekday:'long',month:'long',day:'numeric'}).format(new Date(`${currentDate}T12:00:00Z`))}
      weekStart={weekStart}
      weekLabel={formatWeekRange(weekStart)}
      previousWeek={previousWeek}
      nextWeek={nextWeek}
      view={view}
      readyLocationCount={dashboard.readyLocationCount}
      totalLocations={locations.length}
      availabilitySubmitted={availabilitySubmissionSummary.submittedEmployees}
      availabilityEligible={availabilitySubmissionSummary.eligibleEmployees}
      activeEmployees={availabilitySubmissionSummary.activeEmployees}
      unavailableAllWeek={availabilitySubmissionSummary.unavailableAllWeek}
      coverageIssueCount={dashboard.totalCoverageGaps}
      coverageConfigured={coverageRulesConfigured}
      pendingRequestCount={dashboard.pendingRequestCount}
      managerActions={managerActions.filter(item=>requestTypeAllowed(item.type,modules))}
      locations={dashboard.locationReadiness}
      days={daySummaries}
      coverage={coverageMinutes?.all}
      hours={hourRows}
      nextPay={nextPay}
      payrollStatus={payrollStatus}
      latestRevision={
        latestRevision
          ? {
              revisionNumber: latestRevision.revisionNumber,
              sourceType: latestRevision.sourceType,
              createdAt: latestRevision.createdAt,
            }
          : null
      }
    />
  </ScopedReadFrame></ManagerCorrectionRecoveryBoundary>);
}
