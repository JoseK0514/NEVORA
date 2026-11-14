import {scopedObservation} from '@/lib/company-access/observation';
import {readOperationalAuthority,withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {MANAGER_ROLES,requireRoles} from '@/lib/auth/permissions';
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import {managerReviewRecoveryKey} from '@/lib/time-corrections/review-recovery';
import {ManagerCorrectionRecoveryBoundary} from '@/components/manager-correction-recovery';
import {ManagerTimeCorrections} from '@/components/manager-time-corrections';
import {CorpNav,CorpPage,CorpTitle} from '@/components/corp/corp';
import './corrections.css';

export const metadata={title:'Time corrections'};

/* Owner premium (A9): employees' time corrections are a Time job, so they are reviewed here, one tap from Timecards.
 * The same queue, decisions and receipts as before (ManagerTimeCorrections, its own protected read and actions); only
 * the place changes. #correction-… links focus the request as they did on Who's working. */
export default async function TimeCorrectionsPage(){
  const session=await requireRoles(MANAGER_ROLES);
  const proof=await requireSessionMutationProof(),access=await readOperationalAuthority(proof);
  if(access.state==='unavailable')return <OperationalUnavailable title="Time corrections unavailable" reason={access.reason}/>;
  const source=await withOperationalCompany(proof,async()=>null);
  if(source.state==='unavailable')return <OperationalUnavailable title="Time corrections unavailable" reason={source.reason}/>;
  const authority=correctionAuthority(proof);
  return <ManagerCorrectionRecoveryBoundary key={managerReviewRecoveryKey(session.id,authority,source.authority,'time-corrections')}>
    <ScopedReadFrame observation={scopedObservation(source)}>
      <CorpPage className="c-tcx c-page--narrow" labelledBy="tcx-title">
        <CorpNav back={{href:'/app/timecards',label:'Time'}} title="Time corrections" titleId="tcx-nav-title" phoneOnly/>
        <CorpTitle id="tcx-title" title="Time corrections" sub="Fixes your team asked for. You’ll always see the original time." wide/>
        <p className="c-phone-sub">Fixes your team asked for. You’ll always see the original time.</p>
        <ManagerTimeCorrections key={authority} actorId={session.id} authority={authority}/>
      </CorpPage>
    </ScopedReadFrame>
  </ManagerCorrectionRecoveryBoundary>;
}
