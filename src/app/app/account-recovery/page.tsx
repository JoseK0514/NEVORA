import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireRoles} from '@/lib/auth/permissions';
import {AccountRecovery} from '@/components/account-recovery';
import {getWorkspace} from '@/lib/data/workspaces';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Account recovery" };

export default async function AccountRecoveryPage({searchParams}:{searchParams?:Promise<{employee?:string;from?:string}>} = {}) {
 const actor=await requireRoles(['OWNER','MANAGER']);
 const access=await withOperationalCompany(await requireSessionMutationProof(),async()=>null);
 if(access.state==='unavailable')return <OperationalUnavailable title="Account recovery unavailable" reason={access.reason}/>;
 const params=await searchParams;
 // Only a prefill; the server still checks the employee and attestation.
 const employee=params?.employee?.trim().slice(0,200)||undefined;
 const {timeZone}=await getWorkspace();
 return <ScopedReadFrame observation={access}><AccountRecovery kind="assisted" actorId={actor.id} employeeId={employee} timeZone={timeZone} from={params?.from==='settings'&&actor.role==='OWNER'?'settings':undefined} pins={actor.role==='OWNER'}/></ScopedReadFrame>;
}
