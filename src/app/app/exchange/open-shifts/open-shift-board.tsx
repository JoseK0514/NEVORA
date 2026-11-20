'use client';

import { useActionState } from 'react';
import { QuietList, QuietRow, QuietSection } from '@/components/quiet/quiet';
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

  return <>
    {state.result ? <p className="q-help" role="status">{feedback(state.result)}</p> : null}
    {state.retry ? <form action={action}>
      <input type="hidden" name="actorId" value={actorId} />
      {Object.entries(state.retry).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <button type="submit" className="q-btn q-btn--sec" disabled={pending}>Retry last action</button>
    </form> : null}
    {management && locations.length > 0 && positions.length > 0 ? <QuietSection title="Post an open shift">
      <form action={action} className={styles.form}>
        <input type="hidden" name="kind" value="post" />
        <input type="hidden" name="id" value={state.postId} />
        <input type="hidden" name="actorId" value={actorId} />
        <label>Location<select name="locationId" required defaultValue="">
          <option value="" disabled>Choose a location</option>
          {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select></label>
        <label>Position<select name="positionId" required defaultValue="">
          <option value="" disabled>Choose a position</option>
          {positions.map(position => <option key={position.id} value={position.id}>{position.name}</option>)}
        </select></label>
        <label>Date<input type="date" name="date" required /></label>
        <label>Starts<input type="time" name="startTime" required /></label>
        <label>Ends<input type="time" name="endTime" required /></label>
        <button className="q-btn" type="submit" disabled={pending}>Post shift</button>
      </form>
    </QuietSection> : management ? <p className="q-help">{locations.length ?
      'Add an active position before posting a shift.' : 'Posting and withdrawal require schedule publishing permission at a managed location.'}</p> : null}

    {shifts.length ? <QuietList label={management ? 'Shift postings' : 'Shifts you can claim'}>
      {shifts.map(shift => {
        const day = formatDayLabel(shift.date);
        const kind = management ? 'withdraw' : 'claim';
        const title = `${day.weekday}, ${day.day} · ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`;
        return <QuietRow key={shift.id} title={title} detail={`${shift.locationName} · ${shift.positionName}${management ? ' · ' + stateLabels[shift.state] : ''}`}
          control={shift.state === 'open' ? <form action={action}>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="id" value={shift.id} />
            <input type="hidden" name="actorId" value={actorId} />
            <button type="submit" className="q-btn q-btn--sec" disabled={pending}
              aria-label={`${management ? 'Withdraw' : 'Claim'} ${shift.positionName} shift on ${title}`}>
              {management ? 'Withdraw' : 'Claim'}
            </button>
          </form> : undefined} />;
      })}
    </QuietList> : <p className="q-help">{management ? 'No shift postings at your authorized locations.' :
      'There are no posted shifts you can claim right now.'}</p>}
  </>;
}
