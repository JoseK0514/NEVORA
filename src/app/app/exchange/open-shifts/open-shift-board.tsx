'use client';

import { useActionState, type FormEvent } from 'react';
import { CorpCard, CorpRow, CorpRows } from '@/components/corp/corp';
import { BCallout, BSegs, BState } from '@/components/owner-b/b-kit';
import type { OpenShiftResult, OpenShiftView } from '@/lib/scheduling/open-shifts';
import { schedulingIssueMessage } from '@/lib/scheduling/validate-shift';
import { submitOpenShift } from './actions';
import styles from './open-shifts.module.css';
import { usePortalLang } from '@/lib/i18n/portal-lang';
import { exchangeCopy, exchangeDay, exchangeTime } from '../exchange-copy';

function feedback(result: OpenShiftResult, t: ReturnType<typeof exchangeCopy>) {
  switch (result.state) {
    case 'posted': return t.feedbackPosted;
    case 'claimed': return result.visibility === 'published' ? t.feedbackClaimedPublished :
      t.feedbackClaimedLater;
    case 'withdrawn': return t.feedbackWithdrawn;
    case 'filled': return t.feedbackFilled;
    case 'expired': return t.feedbackExpired;
    case 'ineligible': return schedulingIssueMessage(result.reason) ??
      t.feedbackIneligible;
    case 'conflict': return t.feedbackConflict;
    case 'invalid': return t.feedbackInvalid;
    case 'forbidden': return t.feedbackForbidden;
    case 'outcome_unknown': return t.feedbackUnknown;
    case 'unavailable': return t.feedbackUnavailable;
  }
}

export function OpenShiftBoard({ actorId, management, postId, shifts, locations, positions }: {
  actorId: string;
  management: boolean;
  postId: string;
  shifts: OpenShiftView[];
  locations: {id: string; name: string}[];
  positions: {id: string; name: string}[];
}) {
  const [state, action, pending] = useActionState(submitOpenShift, {postId});
  // G98 (Phase 2): the signed-in person's language (PortalLangProvider in the app layout).
  const lang = usePortalLang(), t = exchangeCopy(lang);
  const stateLabels = {open: t.stateOpen, filled: t.stateFilled, expired: t.stateExpired, withdrawn: t.stateWithdrawn};

  // Final polish (Nov 20, 2026): an Owner's or Manager's board is the corporate kit's (the Time off policies page's parts):
  // the result as a note, the form in one card with a 560px field block and its one filled button on the block's right
  // edge, the postings as rows with a quiet Withdraw. Same form fields, same action. An Employee's list is unchanged.
  if (management) {
    const done = state.result && ['posted', 'claimed', 'withdrawn'].includes(state.result.state);
    // An empty native date or time field shows its format in grey, like a placeholder (data-empty; b-foundation.css).
    const mark = (event: FormEvent<HTMLInputElement>) => event.currentTarget.toggleAttribute('data-empty', !event.currentTarget.value);
    return <>
      {state.result ? <CorpCard ariaLabel={t.result}><div className={styles.note}>
        <BCallout tone={done ? 'green' : 'amber'} icon={done ? undefined : state.result.state === 'outcome_unknown' ? 'unknown' : 'check'} role="status"
          action={state.retry ? <form action={action}>
            <input type="hidden" name="actorId" value={actorId} />
            {Object.entries(state.retry).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
            <button type="submit" className="b-btn b-btn--ghost rs-act" disabled={pending}>{t.retryLast}</button>
          </form> : undefined}>{feedback(state.result, t)}</BCallout>
      </div></CorpCard> : null}
      {locations.length > 0 && positions.length > 0 ? <CorpCard id="post-open-shift" label={t.postOpenShift}>
        <form action={action} className={`rs-fields ${styles.post}`} onReset={event => event.currentTarget.querySelectorAll('input[type="date"], input[type="time"]').forEach(input => input.setAttribute('data-empty', ''))}>
          <input type="hidden" name="kind" value="post" />
          <input type="hidden" name="id" value={state.postId} />
          <input type="hidden" name="actorId" value={actorId} />
          <div className={styles.pair}>
            <div className="rs-field"><label className="rs-field__l" htmlFor="open-shift-location">{t.location}</label>
              <select id="open-shift-location" className={`c-in rs-in ${styles.pick}`} name="locationId" required defaultValue="">
                <option value="" disabled>{t.chooseLocation}</option>
                {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select></div>
            <div className="rs-field"><label className="rs-field__l" htmlFor="open-shift-position">{t.position}</label>
              <select id="open-shift-position" className={`c-in rs-in ${styles.pick}`} name="positionId" required defaultValue="">
                <option value="" disabled>{t.choosePosition}</option>
                {positions.map(position => <option key={position.id} value={position.id}>{position.name}</option>)}
              </select></div>
          </div>
          <div className="rs-field"><label className="rs-field__l" htmlFor="open-shift-date">{t.date}</label>
            <input id="open-shift-date" className="c-in rs-in c-in--date" type="date" name="date" required data-empty="" onInput={mark} /></div>
          <div className={styles.pair}>
            <div className="rs-field"><label className="rs-field__l" htmlFor="open-shift-start">{t.starts}</label>
              <input id="open-shift-start" className="c-in rs-in c-in--time" type="time" name="startTime" required data-empty="" onInput={mark} /></div>
            <div className="rs-field"><label className="rs-field__l" htmlFor="open-shift-end">{t.ends}</label>
              <input id="open-shift-end" className="c-in rs-in c-in--time" type="time" name="endTime" required data-empty="" onInput={mark} /></div>
          </div>
          <div className={styles.foot}><button className="b-btn b-btn--teal rs-act" type="submit" disabled={pending}>{t.postShift}</button></div>
        </form>
      </CorpCard> : <CorpCard ariaLabel={t.postOpenShift}><div className={styles.note}><BCallout tone="grey">{locations.length ?
        t.addPosition : t.needsPublishing}</BCallout></div></CorpCard>}
      {shifts.length ? <CorpCard id="open-shift-postings" label={t.postings} count={shifts.length}>
        <CorpRows label={t.postings}>{shifts.map(shift => {
          const title = `${exchangeDay(shift.date, lang)} · ${exchangeTime(shift.startTime, lang)} – ${exchangeTime(shift.endTime, lang)}`;
          return <li key={shift.id}><CorpRow title={title} detail={<BSegs parts={[shift.locationName, shift.positionName, stateLabels[shift.state]]} />}
            trail={shift.state === 'open' ? <form action={action}>
              <input type="hidden" name="kind" value="withdraw" />
              <input type="hidden" name="id" value={shift.id} />
              <input type="hidden" name="actorId" value={actorId} />
              <button type="submit" className="b-btn b-btn--quiet b-rowact b-rowact--quiet" disabled={pending}
                aria-label={t.withdrawAria(shift.positionName, title)}>{t.withdraw}</button>
            </form> : undefined} /></li>;
        })}</CorpRows>
      </CorpCard> : <CorpCard ariaLabel={t.postings}><div className={styles.note}><BCallout tone="grey" icon="empty">{t.noPostings}</BCallout></div></CorpCard>}
    </>;
  }

  // Batch nav gate (Nov 23, 2026): an Employee's or Lead's list in the same kit parts as the managers' (the result as a note
  // in a card, the postings as rows with a quiet Claim), instead of the older quiet list. Same form fields, same action.
  return <>
    {state.result ? <CorpCard ariaLabel={t.result}><div className={styles.note}>
      <BCallout tone={state.result.state === 'claimed' ? 'green' : 'amber'} icon={state.result.state === 'claimed' ? undefined : state.result.state === 'outcome_unknown' ? 'unknown' : 'check'} role="status"
        action={state.retry ? <form action={action}>
          <input type="hidden" name="actorId" value={actorId} />
          {Object.entries(state.retry).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          <button type="submit" className="b-btn b-btn--ghost rs-act" disabled={pending}>{t.retryLast}</button>
        </form> : undefined}>{feedback(state.result, t)}</BCallout>
    </div></CorpCard> : null}

    {shifts.length ? <CorpCard id="open-shift-claimable" label={t.canClaim} count={shifts.length}>
      <CorpRows label={t.canClaim}>{shifts.map(shift => {
        const title = `${exchangeDay(shift.date, lang)} · ${exchangeTime(shift.startTime, lang)} – ${exchangeTime(shift.endTime, lang)}`;
        return <li key={shift.id}><CorpRow title={title} detail={<BSegs parts={[shift.locationName, shift.positionName]} />}
          trail={shift.state === 'open' ? <form action={action}>
            <input type="hidden" name="kind" value="claim" />
            <input type="hidden" name="id" value={shift.id} />
            <input type="hidden" name="actorId" value={actorId} />
            <button type="submit" className="b-btn b-btn--quiet b-rowact b-rowact--quiet" disabled={pending}
              aria-label={t.claimAria(shift.positionName, title)}>{t.claim}</button>
          </form> : undefined} /></li>;
      })}</CorpRows>
    </CorpCard> : <CorpCard as="div">
      <BState kind="empty" title={t.noneToClaim} />
    </CorpCard>}
  </>;
}
