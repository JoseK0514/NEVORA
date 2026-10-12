import {requireRoles} from '@/lib/auth/permissions';
import {ClockerRecoveryReview} from '@/components/clocker-recovery-review';
import {getWorkspace} from '@/lib/data/workspaces';

export default async function ClockerRecoveryPage() {
  const actor = await requireRoles(['OWNER', 'MANAGER']);
  const workspace = await getWorkspace();
  return <ClockerRecoveryReview actorId={actor.id} timeZone={workspace.timeZone}/>;
}
