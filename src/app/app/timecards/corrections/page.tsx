import {scopedObservation} from '@/lib/company-access/observation';
import {readOperationalAuthority} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {MANAGER_ROLES,requireRoles} from '@/lib/auth/permissions';
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import {managerReviewRecoveryKey} from '@/lib/time-corrections/review-recovery';
import {ManagerCorrectionRecoveryBoundary} from '@/components/manager-correction-recovery';
import {ManagerTimeCorrections} from '@/components/manager-time-corrections';
import {CorpNav,CorpPage} from '@/components/corp/corp';
import {getWorkspace} from '@/lib/data/workspaces';
import './corrections.css';
import { readPageLang } from '@/lib/i18n/page-lang.server';
import { ROUTE_COPY } from '../../route-copy';

export async function generateMetadata() { return { title: ROUTE_COPY[await readPageLang()].timeCorrections }; }

/* Owner premium (A9): employees' time corrections are a Time job, so they are reviewed here, one tap from Timecards.
 * The same queue, decisions and receipts as before (ManagerTimeCorrections, its own protected read and actions); only
 * the place changes. #correction-… links focus the request as they did on Who's working. */
export default async function TimeCorrectionsPage(){const t = ROUTE_COPY[await readPageLang()];
  const session=await requireRoles(MANAGER_ROLES);
  const proof=await requireSessionMutationProof(),access=await readOperationalAuthority(proof);
  if(access.state==='unavailable')return <OperationalUnavailable lang={await readPageLang()} title={ROUTE_COPY[await readPageLang()].timeCorrectionsUnavailable} reason={access.reason}/>;
  if(!access.scope)return <OperationalUnavailable lang={await readPageLang()} title={ROUTE_COPY[await readPageLang()].timeCorrectionsUnavailable} reason="access_denied" scoped/>;
  const scoped=access.scope.mode==='LOCATIONS';
  const authority=correctionAuthority(proof),workspace=await getWorkspace();
  return <ManagerCorrectionRecoveryBoundary key={managerReviewRecoveryKey(session.id,authority,access.authority,'time-corrections')}>
    <ScopedReadFrame observation={scopedObservation(access)}>
      <CorpPage className="c-tcx c-page--narrow" labelledBy="tcx-title">
        <CorpNav back={scoped ? {href:'/app/inbox',label:t.thingsToDo} : {href:'/app/timecards',label:t.time}} title={t.timeCorrections} titleId="tcx-nav-title" phoneOnly/>
        {/* OW-015 / OW-004: the queue draws the title and its one sub-line (the count, the note about times). */}
        <ManagerTimeCorrections key={authority} actorId={session.id} authority={authority} band={{zone:workspace.timeZone}}/>
      </CorpPage>
    </ScopedReadFrame>
  </ManagerCorrectionRecoveryBoundary>;
}
