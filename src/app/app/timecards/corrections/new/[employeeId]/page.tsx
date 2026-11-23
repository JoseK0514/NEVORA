import {requireRoles,MANAGER_ROLES} from '@/lib/auth/permissions';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {getWorkspace} from '@/lib/data/workspaces';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {scopedObservation} from '@/lib/company-access/observation';
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import {delegatedRecoveryScope} from '@/lib/time-corrections/delegated-authority.server';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {CorpPage,CorpNav,CorpTitle,CorpCard,CorpBody} from '@/components/corp/corp';
import {DelegatedTimeCorrectionForm} from '@/components/delegated-time-correction-form';
import { readPageLang } from '@/lib/i18n/page-lang.server';
import { ROUTE_COPY } from '../../../../route-copy';
/* Phase 2 gate (Nov 23): the title is drawn once per width (the phone band, or the wide title on desktop), and
 * "another manager" is said once, by the confirmation beside the Send button. */
/** RA-25 (Nov 14, 2026): the tab and screen readers name the page as its heading does ("Request time correction · NEVORA"). */
export async function generateMetadata() { return { title: ROUTE_COPY[await readPageLang()].requestCorrection }; }
export default async function DelegatedCorrectionPage({params}:{params:Promise<{employeeId:string}>}){const t = ROUTE_COPY[await readPageLang()];
 const session=await requireRoles(MANAGER_ROLES),proof=await requireSessionMutationProof(),workspace=await getWorkspace(),access=await withOperationalCompany(proof,async()=>null),{employeeId}=await params;
 if(access.state==='unavailable')return <OperationalUnavailable title={t.requestCorrectionUnavailable} reason={access.reason}/>;
 const authority=correctionAuthority(proof),recoveryScope=delegatedRecoveryScope(workspace.id);
 return <ScopedReadFrame observation={scopedObservation(access)}><CorpPage className="c-page--narrow" labelledBy="delegated-title"><CorpNav back={{href:'/app/timecards',label:t.time}} title={t.requestCorrection} phoneOnly/><CorpTitle id="delegated-title" title={t.requestCorrection} wide/><CorpCard><CorpBody><DelegatedTimeCorrectionForm key={JSON.stringify([recoveryScope,session.id,authority,employeeId])} employeeId={employeeId} actorId={session.id} authority={authority} recoveryScope={recoveryScope}/></CorpBody></CorpCard></CorpPage></ScopedReadFrame>;
}
