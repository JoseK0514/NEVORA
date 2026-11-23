import { randomUUID } from 'node:crypto';
import { CorpCard, CorpNav, CorpPage, CorpTitle } from '@/components/corp/corp';
import { BState } from '@/components/owner-b/b-kit';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { listClaimableOpenShifts, readManagedOpenShifts } from '@/lib/data/open-shifts.server';
import { moduleGate } from '@/lib/workspace-presentation/current.server';
import { readPortalLanguage } from '@/lib/activation/language.server';
import { OpenShiftBoard } from './open-shift-board';
import { exchangeCopy } from '../exchange-copy';

export const metadata = { title: exchangeCopy().titlePosted };

export default async function OpenShiftsPage() {
  const off = await moduleGate('marketplace');
  if (off) return off;
  const proof = await requireSessionMutationProof();
  const management = proof.employee.role === 'OWNER' || proof.employee.role === 'MANAGER';
  const data = await (management ? readManagedOpenShifts(proof) :
    listClaimableOpenShifts(proof).then(shifts => ({shifts, locations: [], positions: []}))).catch(() => null);
  // G98 (Phase 2): the page follows the person's language, read with the proof above. English if that read fails.
  let lang:'en'|'es'='en';try{lang=(await readPortalLanguage(proof)).language;}catch{/* English */}
  const t = exchangeCopy(lang), pageLang = lang === 'es' ? 'es' : undefined;

  // Final polish (Nov 20, 2026): for an Owner or Manager the page is in the corporate frame the other deep pages use (the
  // back link on the band, one 812px column, kit cards). An Employee's page is unchanged.
  if (management) return <CorpPage className="c-page--narrow rs rs--c" labelledBy="open-shifts-title" lang={pageLang}>
    <CorpNav back={{href: '/app/schedule', label: t.backSchedule}} title={t.postedOpenShifts} titleId="open-shifts-nav" phoneOnly />
    <CorpTitle id="open-shifts-title" title={t.postedOpenShifts} wide />
    {data ? <OpenShiftBoard actorId={proof.employee.id} management postId={randomUUID()} {...data} /> :
      <div className="rs-state"><CorpCard ariaLabel={t.postedOpenShifts}><BState alert kind="failed" title={t.postedLoadFailed} line={t.reloadToTry} /></CorpCard></div>}
  </CorpPage>;
  // Batch nav gate (Nov 23, 2026): an Employee's or Lead's page is in the same corporate frame (band with the back link,
  // one 812px column, kit cards with the page gutter) instead of the older quiet frame, whose card ran edge to edge on phones.
  return <CorpPage className="c-page--narrow rs rs--c" labelledBy="open-shifts-title" lang={pageLang}>
    <CorpNav back={{href: '/app/exchange?tab=available', label: t.backOpenShifts}} title={t.postedOpenShifts} titleId="open-shifts-nav" phoneOnly />
    <CorpTitle id="open-shifts-title" title={t.postedOpenShifts} wide />
    {data ? <OpenShiftBoard actorId={proof.employee.id} management={false} postId={randomUUID()} {...data} /> :
      <div className="rs-state"><CorpCard ariaLabel={t.postedOpenShifts}><BState alert kind="failed" title={t.postedLoadFailed} line={t.reloadToTry} /></CorpCard></div>}
  </CorpPage>;
}
