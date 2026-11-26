import type {SessionMutationProof} from '@/lib/shift-changes/types';
import {readOperationalEmployeeHours,readScopedEmployeeSummary} from '@/lib/company-access/operational-read.server';
import {scopedObservation} from '@/lib/company-access/observation';
import type {PersonHours} from '@/lib/person-hours';
import {durationSentence} from '@/lib/duration-format';
import {employeeInitials,employeeRoleLabel} from '@/lib/employee-display';
import {CORP_NO_VALUE,CorpAvatar,CorpCard,CorpNav,CorpPage,CorpRow,CorpRows,CorpTitle} from '@/components/corp/corp';
import {TeamLivePill,TeamLiveProvider} from '@/components/team-live';
import {BSegs} from '@/components/owner-b/b-kit';
import {OperationalUnavailable} from './operational-unavailable';
import {ScopedReadFrame} from './scoped-read-frame';
import {readPortalLanguage} from '@/lib/activation/language.server';
import {accessCopy,type AccessLang} from './access-copy';
import '@/components/team/team-forms.css';

/** G17 (Jose, Nov 23, 2026): a Manager limited to some locations opens a person who works at one of them. The page shows
 * only what the scoped Team list already shows (name, role, the person's locations among the Manager's) plus the hours
 * the existing scoped read allows, and the way to the schedule at one of those locations. Contact details, pay, time off,
 * restrictions, sign-in and every edit stay company-wide: they aren't read here, and the edit and access views say so.
 * Someone outside the Manager's locations, or in another company, is refused by the server read. */
export async function ScopedPerson({proof,employeeId,view}:{proof:SessionMutationProof;employeeId:string;
  /** 'overview' is the person page; 'company' is a view of it that needs company-wide access (edit, access and sign-in). */
  view:'overview'|'company'}) {
  // Signed-in Spanish (Nov 23, 2026): the person's language; English if that read fails.
  let lang:AccessLang='en';try{lang=(await readPortalLanguage(proof)).language;}catch{/* English */}
  const t=accessCopy(lang).person;
  const summary=await readScopedEmployeeSummary(proof,employeeId);
  if(summary.state!=='ready')return <OperationalUnavailable title={t.unavailable} reason={summary.reason} scoped={summary.reason==='access_denied'} lang={lang}/>;
  // The person is in the Manager's scope; editing them or their sign-in still needs company-wide access.
  if(view==='company')return <OperationalUnavailable title={t.unavailable} reason="access_denied" lang={lang}/>;
  const {employee,locations}=summary.data;
  let hours:PersonHours|null=null;
  try{const read=await readOperationalEmployeeHours(proof,employeeId);if(read.state==='ready')hours=read.data;}catch{/* the card stays out; the page stays */}
  const name=`${employee.firstName} ${employee.lastName}`;
  const roleLabel=lang==='es'?accessCopy('es').team.roles[employee.role]:employeeRoleLabel(employee.role);
  const places=locations.map(location=>location.name);
  const shiftsAt=locations.find(location=>location.active);
  const minutes=(value:number|null)=>value===null?CORP_NO_VALUE:durationSentence(value,'0 h');
  const scheduled=(value:number|null)=>value===null?{value:t.notAvailable,detail:t.scheduleUnread}:{value:minutes(value)};
  return <ScopedReadFrame observation={scopedObservation(summary)} lang={lang}>
    <TeamLiveProvider partial>
      <CorpPage className="c-person c-page--narrow" labelledBy="person-title">
        <CorpNav back={{href:'/app/employees',label:t.team}} title={name} titleId="person-nav-title" phoneOnly/>
        <CorpTitle id="person-title" title={name} wide/>
        <CorpCard id="person-who" ariaLabel={name}>
          <div className="c-person__who">
            <CorpAvatar name={name} initials={employeeInitials(employee.firstName,employee.lastName)} large/>
            <span className="c-row__main">
              <span className="c-row__title c-row__title--b"><span>{roleLabel}</span></span>
              {places.length?<span className="c-person__roles"><BSegs parts={places}/></span>:null}
              <span className="c-row__detail"><span className="c-person__state"><TeamLivePill employeeId={employee.id}/></span></span>
            </span>
          </div>
        </CorpCard>
        {hours?<CorpCard id="person-hours" label={t.hours}>
          <CorpRows label={t.hours}>
            <li><CorpRow title={t.scheduledToday} {...scheduled(hours.scheduledTodayMinutes)} valueTone="soft"/></li>
            <li><CorpRow title={t.scheduledWeek} {...scheduled(hours.scheduledWeekMinutes)} valueTone="soft"/></li>
            <li><CorpRow title={t.clockedWeek} detail={t.includesBreaks} value={minutes(hours.workedWeekMinutes)} valueTone="soft"/></li>
          </CorpRows>
        </CorpCard>:null}
        {shiftsAt?<CorpCard as="div" ariaLabel={t.work}>
          <CorpRows label={t.work}>
            <li><CorpRow href={`/app/schedule?location=${encodeURIComponent(shiftsAt.id)}`} title={t.shifts} chevron/></li>
          </CorpRows>
        </CorpCard>:null}
      </CorpPage>
    </TeamLiveProvider>
  </ScopedReadFrame>;
}
