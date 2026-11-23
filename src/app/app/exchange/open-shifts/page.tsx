import { randomUUID } from 'node:crypto';
import { CorpCard, CorpNav, CorpPage, CorpTitle } from '@/components/corp/corp';
import { BState } from '@/components/owner-b/b-kit';
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

  // Final polish (Nov 20, 2026): for an Owner or Manager the page is in the corporate frame the other deep pages use (the
  // back link on the band, one 812px column, kit cards). An Employee's page is unchanged.
  if (management) return <CorpPage className="c-page--narrow rs rs--c" labelledBy="open-shifts-title">
    <CorpNav back={{href: '/app/schedule', label: 'Schedule'}} title="Posted open shifts" titleId="open-shifts-nav" phoneOnly />
    <CorpTitle id="open-shifts-title" title="Posted open shifts" wide />
    {data ? <OpenShiftBoard actorId={proof.employee.id} management postId={randomUUID()} {...data} /> :
      <div className="rs-state"><CorpCard ariaLabel="Posted open shifts"><BState alert kind="failed" title="Posted shifts couldn’t be loaded" line="Reload to try again." /></CorpCard></div>}
  </CorpPage>;
  return <QuietPage label="Posted open shifts">
    <QuietNav back={{href: '/app/exchange?tab=available', label: 'Open shifts'}} />
    <QuietHeader title="Posted open shifts" />
    {data ? <OpenShiftBoard actorId={proof.employee.id} management={false} postId={randomUUID()} {...data} /> :
      <p className="q-help" role="alert">Posted shifts couldn’t be loaded. Reload to try again.</p>}
  </QuietPage>;
}
