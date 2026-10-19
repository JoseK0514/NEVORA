import {requireRoles} from '@/lib/auth/permissions';
import {ClockerRecoveryReview} from '@/components/clocker-recovery-review';
import {getWorkspace} from '@/lib/data/workspaces';

export default async function ClockerRecoveryPage({searchParams}: {searchParams?: Promise<{from?: string}>} = {}) {
  const actor = await requireRoles(['OWNER', 'MANAGER']);
  const workspace = await getWorkspace();
  // Settings is Owner-only, so only an Owner's Back returns there.
  const from = (await searchParams)?.from === 'settings' && actor.role === 'OWNER' ? 'settings' : undefined;
  return <ClockerRecoveryReview actorId={actor.id} timeZone={workspace.timeZone} from={from}/>;
}
