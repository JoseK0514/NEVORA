import {requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireRoles} from '@/lib/auth/permissions';
import {ClockerRecoveryReview} from '@/components/clocker-recovery-review';
import {getWorkspace} from '@/lib/data/workspaces';

export default async function ClockerRecoveryPage({searchParams}: {searchParams?: Promise<{from?: string}>} = {}) {
  const actor = await requireRoles(['OWNER', 'MANAGER']);
  const access=await withOperationalCompany(await requireSessionMutationProof(),async()=>null);if(access.state==='unavailable')return <OperationalUnavailable title="Clocker recovery unavailable" reason={access.reason}/>;
  const workspace = await getWorkspace();
  // Settings is Owner-only, so only an Owner's Back returns there.
  const from = (await searchParams)?.from === 'settings' && actor.role === 'OWNER' ? 'settings' : undefined;
  return <ClockerRecoveryReview key={access.authority} actorId={actor.id} timeZone={workspace.timeZone} from={from} observation={access}/>;
}
