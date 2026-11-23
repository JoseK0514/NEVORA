'use client';

import { useActionState, type FormEvent } from 'react';
import { CorpCard, CorpRow, CorpRows } from '@/components/corp/corp';
import { BCallout, BSegs, BState } from '@/components/owner-b/b-kit';
import { formatDayLabel, formatTime } from '@/lib/date-utils';
import type { OpenShiftResult, OpenShiftView } from '@/lib/scheduling/open-shifts';
import { schedulingIssueMessage } from '@/lib/scheduling/validate-shift';
import { submitOpenShift } from './actions';
import styles from './open-shifts.module.css';

function feedback(result: OpenShiftResult) {
  switch (result.state) {
    case 'posted': return 'Open shift posted.';
    case 'claimed': return result.visibility === 'published' ? 'Shift claimed. It’s on your schedule.' :
      'Shift claimed. It will appear on your schedule when the location’s week is published.';
    case 'withdrawn': return 'The posting was withdrawn.';
    case 'filled': return 'This shift has already been filled.';
    case 'expired': return 'This shift has already started.';
    case 'ineligible': return schedulingIssueMessage(result.reason) ??
      'The schedule for this shift has changed. This shift is no longer available to claim.';
    case 'conflict': return 'The posting or schedule changed. Reload and try again.';
    case 'invalid': return 'Choose an active location and position and enter valid future shift times.';
    case 'forbidden': return 'You no longer have access to do that.';
    case 'outcome_unknown': return 'We couldn’t confirm the result. Retry the same action.';
    case 'unavailable': return 'This posting is unavailable. Reload to try again.';
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
  const stateLabels = {open: 'Open', filled: 'Filled', expired: 'Expired', withdrawn: 'Withdrawn'};

  // Final polish (Nov 20, 2026): an Owner's or Manager's board is the corporate kit's (the Time off policies page's parts):
  // the result as a note, the form in one card with a 560px field block and its one filled button on the block's right
  // edge, the postings as rows with a quiet Withdraw. Same form fields, same action. An Employee's list is unchanged.
  if (management) {
    const done = state.result && ['posted', 'claimed', 'withdrawn'].includes(state.result.state);
    // An empty native date or time field shows its format in grey, like a placeholder (data-empty; b-foundation.css).
    const mark = (event: FormEvent<HTMLInputElement>) => event.currentTarget.toggleAttribute('data-empty', !event.currentTarget.value);
    return <>
      {state.result ? <CorpCard ariaLabel="Result"><div className={styles.note}>
        <BCallout tone={done ? 'green' : 'amber'} icon={done ? undefined : state.result.state === 'outcome_unknown' ? 'unknown' : 'check'} role="status"
          action={state.retry ? <form action={action}>
            <input type="hidden" name="actorId" value={actorId} />
            {Object.entries(state.retry).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
            <button type="submit" className="b-btn b-btn--ghost rs-act" disabled={pending}>Retry last action</button>
          </form> : undefined}>{feedback(state.result)}</BCallout>
      </div></CorpCard> : null}
      {locations.length > 0 && positions.length > 0 ? <CorpCard id="post-open-shift" label="Post an open shift">
        <form action={action} className={`rs-fields ${styles.post}`} onReset={event => event.currentTarget.querySelectorAll('input[type="date"], input[type="time"]').forEach(input => input.setAttribute('data-empty', ''))}>
          <input type="hidden" name="kind" value="post" />
          <input type="hidden" name="id" value={state.postId} />
          <input type="hidden" name="actorId" value={actorId} />
          <div className={styles.pair}>
            <div className="rs-field"><label className="rs-field__l" htmlFor="open-shift-location">Location</label>
              <select id="open-shift-location" className={`c-in rs-in ${styles.pick}`} name="locationId" required defaultValue="">
                <option value="" disabled>Choose a location</option>
                {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select></div>
            <div className="rs-field"><label className="rs-field__l" htmlFor="open-shift-position">Position</label>
              <select id="open-shift-position" className={`c-in rs-in ${styles.pick}`} name="positionId" required defaultValue="">
                <option value="" disabled>Choose a position</option>
                {positions.map(position => <option key={position.id} value={position.id}>{position.name}</option>)}
              </select></div>
          </div>
          <div className="rs-field"><label className="rs-field__l" htmlFor="open-shift-date">Date</label>
            <input id="open-shift-date" className="c-in rs-in c-in--date" type="date" name="date" required data-empty="" onInput={mark} /></div>
          <div className={styles.pair}>
            <div className="rs-field"><label className="rs-field__l" htmlFor="open-shift-start">Starts</label>
              <input id="open-shift-start" className="c-in rs-in c-in--time" type="time" name="startTime" required data-empty="" onInput={mark} /></div>
            <div className="rs-field"><label className="rs-field__l" htmlFor="open-shift-end">Ends</label>
              <input id="open-shift-end" className="c-in rs-in c-in--time" type="time" name="endTime" required data-empty="" onInput={mark} /></div>
          </div>
          <div className={styles.foot}><button className="b-btn b-btn--teal rs-act" type="submit" disabled={pending}>Post shift</button></div>
        </form>
      </CorpCard> : <CorpCard ariaLabel="Post an open shift"><div className={styles.note}><BCallout tone="grey">{locations.length ?
        'Add an active position before posting a shift.' : 'Posting and withdrawal require schedule publishing permission at a managed location.'}</BCallout></div></CorpCard>}
      {shifts.length ? <CorpCard id="open-shift-postings" label="Shift postings" count={shifts.length}>
        <CorpRows label="Shift postings">{shifts.map(shift => {
          const day = formatDayLabel(shift.date);
          const title = `${day.weekday}, ${day.day} · ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`;
          return <li key={shift.id}><CorpRow title={title} detail={<BSegs parts={[shift.locationName, shift.positionName, stateLabels[shift.state]]} />}
            trail={shift.state === 'open' ? <form action={action}>
              <input type="hidden" name="kind" value="withdraw" />
              <input type="hidden" name="id" value={shift.id} />
              <input type="hidden" name="actorId" value={actorId} />
              <button type="submit" className="b-btn b-btn--quiet b-rowact b-rowact--quiet" disabled={pending}
                aria-label={`Withdraw ${shift.positionName} shift on ${title}`}>Withdraw</button>
            </form> : undefined} /></li>;
        })}</CorpRows>
      </CorpCard> : <CorpCard ariaLabel="Shift postings"><div className={styles.note}><BCallout tone="grey" icon="empty">No posted shifts at your locations yet.</BCallout></div></CorpCard>}
    </>;
  }

  // Batch nav gate (Nov 23, 2026): an Employee's or Lead's list in the same kit parts as the managers' (the result as a note
  // in a card, the postings as rows with a quiet Claim), instead of the older quiet list. Same form fields, same action.
  return <>
    {state.result ? <CorpCard ariaLabel="Result"><div className={styles.note}>
      <BCallout tone={state.result.state === 'claimed' ? 'green' : 'amber'} icon={state.result.state === 'claimed' ? undefined : state.result.state === 'outcome_unknown' ? 'unknown' : 'check'} role="status"
        action={state.retry ? <form action={action}>
          <input type="hidden" name="actorId" value={actorId} />
          {Object.entries(state.retry).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          <button type="submit" className="b-btn b-btn--ghost rs-act" disabled={pending}>Retry last action</button>
        </form> : undefined}>{feedback(state.result)}</BCallout>
    </div></CorpCard> : null}

    {shifts.length ? <CorpCard id="open-shift-claimable" label="Shifts you can claim" count={shifts.length}>
      <CorpRows label="Shifts you can claim">{shifts.map(shift => {
        const day = formatDayLabel(shift.date);
        const title = `${day.weekday}, ${day.day} · ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`;
        return <li key={shift.id}><CorpRow title={title} detail={<BSegs parts={[shift.locationName, shift.positionName]} />}
          trail={shift.state === 'open' ? <form action={action}>
            <input type="hidden" name="kind" value="claim" />
            <input type="hidden" name="id" value={shift.id} />
            <input type="hidden" name="actorId" value={actorId} />
            <button type="submit" className="b-btn b-btn--quiet b-rowact b-rowact--quiet" disabled={pending}
              aria-label={`Claim ${shift.positionName} shift on ${title}`}>Claim</button>
          </form> : undefined} /></li>;
      })}</CorpRows>
    </CorpCard> : <CorpCard as="div">
      <BState kind="empty" title="There are no posted shifts you can claim right now." />
    </CorpCard>}
  </>;
}
