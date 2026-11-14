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
export default async function DelegatedCorrectionPage({params}:{params:Promise<{employeeId:string}>}){
 const session=await requireRoles(MANAGER_ROLES),proof=await requireSessionMutationProof(),workspace=await getWorkspace(),access=await withOperationalCompany(proof,async()=>null),{employeeId}=await params;
 if(access.state==='unavailable')return <OperationalUnavailable title="Time corrections unavailable" reason={access.reason}/>;
 const authority=correctionAuthority(proof),recoveryScope=delegatedRecoveryScope(workspace.id);
 return <ScopedReadFrame observation={scopedObservation(access)}><CorpPage className="c-page--narrow" labelledBy="delegated-title"><CorpNav back={{href:'/app/timecards',label:'Time'}} title="Request time correction" phoneOnly/><CorpTitle id="delegated-title" title="Request time correction" sub="A different authorized person must review the request."/><CorpCard><CorpBody><DelegatedTimeCorrectionForm key={JSON.stringify([recoveryScope,session.id,authority,employeeId])} employeeId={employeeId} actorId={session.id} authority={authority} recoveryScope={recoveryScope}/></CorpBody></CorpCard></CorpPage></ScopedReadFrame>;
}
