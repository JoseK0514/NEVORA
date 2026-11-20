import { randomUUID } from 'node:crypto';
import { QuietHeader, QuietNav, QuietPage } from '@/components/quiet/quiet';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { listClaimableOpenShifts, readManagedOpenShifts } from '@/lib/data/open-shifts.server';
import { moduleGate } from '@/lib/workspace-presentation/current.server';
import { OpenShiftBoard } from './open-shift-board';

export const metadata = { title: 'Posted open shifts' };

export default async function OpenShiftsPage() {
  const off = await moduleGate('marketplace');
  if (off) return off;
  const proof = await requireSessionMutationProof();
  const management = proof.employee.role === 'OWNER' || proof.employee.role === 'MANAGER';
  const data = await (management ? readManagedOpenShifts(proof) :
    listClaimableOpenShifts(proof).then(shifts => ({shifts, locations: [], positions: []}))).catch(() => null);

  return <QuietPage label="Posted open shifts">
    <QuietNav back={management ? {href: '/app/schedule', label: 'Schedule'} :
      {href: '/app/exchange?tab=available', label: 'Open shifts'}} />
    <QuietHeader title="Posted open shifts" />
    {data ? <OpenShiftBoard actorId={proof.employee.id} management={management} postId={randomUUID()} {...data} /> :
      <p className="q-help" role="alert">Posted shifts couldn’t be loaded. Reload to try again.</p>}
  </QuietPage>;
}
