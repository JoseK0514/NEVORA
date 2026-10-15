import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireRoles} from '@/lib/auth/permissions';
import {ClockerRecoveryReview} from '@/components/clocker-recovery-review';
import {getWorkspace} from '@/lib/data/workspaces';

export default async function ClockerRecoveryPage() {
  const actor = await requireRoles(['OWNER', 'MANAGER']);
  const access=await withOperationalCompany(await requireSessionMutationProof(),async()=>null);if(access.state==='unavailable')return <OperationalUnavailable title="Clocker recovery unavailable" reason={access.reason}/>;
  const workspace = await getWorkspace();
  return <ScopedReadFrame observation={access}><ClockerRecoveryReview actorId={actor.id} timeZone={workspace.timeZone}/></ScopedReadFrame>;
}
