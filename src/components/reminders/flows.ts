import type {ReminderTransport} from './client';
import type {ReminderEvent, ReminderState} from './machine';

/* Reminders (U10): the two sequences that touch the server after a deliberate press. They only ever use the command
 * the machine holds, so a retry or a lookup can never carry a new id. */

export type ApplyReminder = (event: ReminderEvent) => ReminderState | undefined;

/** Looks the original command up by its own id. `asked` is false for the one automatic lookup after an uncertain send. */
export async function lookupFlow(apply: ApplyReminder, transport: ReminderTransport, asked = true) {
  const state = apply({type: 'lookup', asked});
  if (state?.phase !== 'unknown' || !state.looking) return state;
  return apply({type: 'looked', outcome: await transport('lookup', state.command)});
}

/** Sends the command the machine holds (ready, or a confirmed "nothing was queued"). An uncertain answer is asked
 * about once, right away, by the same id; after that the person decides when to check again. */
export async function sendFlow(apply: ApplyReminder, transport: ReminderTransport, now: () => string = () => new Date().toISOString()) {
  const state = apply({type: 'send'});
  if (state?.phase !== 'sending') return state;
  const after = apply({type: 'sent', outcome: await transport('send', state.command), at: now()});
  return after?.phase === 'unknown' ? lookupFlow(apply, transport, false) : after;
}
