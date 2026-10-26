import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {companyOnlyRefusal} from '@/components/company-access/company-only-state';
import {requireRoles} from '@/lib/auth/permissions';
import {AccountRecovery} from '@/components/account-recovery';
import {getWorkspace} from '@/lib/data/workspaces';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {RoleUnavailableState} from '@/components/quiet-system-state';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';

export default async function AccountRecoveryPage({searchParams}:{searchParams?:Promise<{employee?:string;from?:string}>} = {}) {
 // UX-E-47: Employees and Leads get the one "Not available for your role" page.
 const session=await requireSession();
 if(session.role!=='OWNER'&&session.role!=='MANAGER')return <RoleUnavailableState/>;
 const actor=await requireRoles(['OWNER','MANAGER']);
 const proof=await requireSessionMutationProof();
 // B-12: account recovery stays with Owners and company-wide Managers.
 const access=await withOperationalCompany(proof,async()=>null);
 if(access.state==='unavailable')return companyOnlyRefusal(proof,'Account recovery unavailable',access.reason);
 const params=await searchParams;
 // Only a prefill; the server still checks the employee and attestation.
 const employee=params?.employee?.trim().slice(0,200)||undefined;
 const {timeZone}=await getWorkspace();
 return <ScopedReadFrame observation={access}><AccountRecovery kind="assisted" actorId={actor.id} employeeId={employee} timeZone={timeZone} from={params?.from==='settings'&&actor.role==='OWNER'?'settings':undefined}/></ScopedReadFrame>;
}
