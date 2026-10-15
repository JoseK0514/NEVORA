import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireRoles} from '@/lib/auth/permissions';
import {AccountRecovery} from '@/components/account-recovery';
import './assisted-recovery.css';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';

export default async function AccountRecoveryPage(){const actor=await requireRoles(['OWNER','MANAGER']);const access=await withOperationalCompany(await requireSessionMutationProof(),async()=>null);if(access.state==='unavailable')return <OperationalUnavailable title="Account recovery unavailable" reason={access.reason}/>;return <ScopedReadFrame observation={access}><div className="employee-view"><AccountRecovery kind="assisted" actorId={actor.id}/></div></ScopedReadFrame>;}
