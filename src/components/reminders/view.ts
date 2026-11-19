import {reminderAfter, reminderCopy, reminderTime, type ReminderLang} from './copy';
import type {ReminderState} from './machine';

/* Reminders (U10): what one state says on a row and in the list of a confirmation. One place, so the row, the
 * "several people" list and the results read the same. Tone follows the app's rule: grey is the normal state,
 * amber means wait or check, red stops you. Nothing here says "sent" or "delivered" for a queue receipt. */

export type ReminderTone = 'grey' | 'amber' | 'red';
export type ReminderAction = 'open' | 'refresh' | 'check' | 'retry' | 'again' | 'signin' | 'support';
export type ReminderLine = {
  /** `pill` is the Remind button, `placeholder` the quiet bar while eligibility loads, `text` everything else. */
  kind: 'pill' | 'placeholder' | 'text';
  text: string; tone: ReminderTone; action?: ReminderAction; actionLabel?: string; busy?: boolean; detail?: string;
};

export function reminderLine(state: ReminderState, options: {lang?: ReminderLang; timeZone: string; actor?: 'OWNER' | 'MANAGER'; now?: Date}): ReminderLine {
  const lang = options.lang ?? 'en', t = reminderCopy[lang];
  switch (state.phase) {
    case 'checking': return {kind: 'placeholder', text: t.checking, tone: 'grey'};
    case 'ready': return {kind: 'pill', text: t.remind, tone: 'grey', action: 'open'};
    case 'sending': return {kind: 'text', text: t.sending, tone: 'grey', busy: true};
    case 'cooldown': return {kind: 'text', tone: 'grey', text: state.nextEligibleAt ? t.cooldown(reminderAfter(state.nextEligibleAt, options.timeZone, lang, options.now)) : t.cooldownNone};
    case 'queued': return {kind: 'text', tone: 'grey', text: state.disposition === 'already_queued' ? t.alreadyQueued : state.at ? t.queuedAt(reminderTime(state.at, options.timeZone, lang)) : t.queued};
    case 'held': return {kind: 'text', tone: 'amber', text: state.reason === 'module_off' ? t.heldModule : t.heldActivation};
    case 'blocked':
      if (state.reason === 'signed_out') return {kind: 'text', tone: 'red', text: t.signedOut, action: 'signin', actionLabel: t.signIn};
      if (state.reason === 'invalid_command') return {kind: 'text', tone: 'red', text: t.stale, action: 'refresh', actionLabel: t.refresh};
      // Manual Owner help (contract: manual_handoff / not_sent): nothing was sent, no access was added.
      return {kind: 'text', tone: 'red', text: options.actor === 'MANAGER' ? t.noAccessManager : t.noAccessOwner, action: 'support', actionLabel: t.support};
    case 'conflict': return {kind: 'text', tone: 'amber', text: state.reason === 'expires_first' ? t.expiresFirst : t.changed, action: 'refresh', actionLabel: t.refresh};
    case 'unknown':
      return {kind: 'text', tone: 'amber', busy: state.looking, action: 'check', actionLabel: state.looking ? t.looking : t.checkAgain,
        text: state.note === 'access' ? t.unknownAccess : state.note === 'still' ? t.unknownStill : t.unknown};
    case 'not_sent': return {kind: 'text', tone: 'amber', text: t.notSent, action: 'again', actionLabel: t.sendAgain};
    case 'error': return {kind: 'text', tone: 'amber', text: t.error, action: 'retry', actionLabel: t.tryAgain, detail: state.reference ? t.reference(state.reference) : undefined};
  }
}
