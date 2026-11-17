import type {ManagerReminderCommand} from '@/lib/manager-reminders/types';

/* Reminders (U10, Nov 17, 2026): the client state machine for one person's reminder. It consumes the three
 * endpoints of docs/handoffs/2026-11-16-backend-phase4-claude-contract.md (B09) and
 * src/lib/manager-reminders/README.md exactly:
 *   POST /api/manager/reminders/eligibility   read only, takes the proposed command
 *   POST /api/manager/reminders               the command
 *   GET  /api/manager/reminders/operations/id the original command's receipt
 * Rules the machine keeps: one command (one id) per deliberate reminder; the command is frozen from the moment it
 * is sent until its result is known; an unknown result is only ever looked up by the original id; a queue receipt
 * is "queued", never "sent" or "delivered"; eligibility is advice, not permission. Pure and synchronous: the hook
 * (use-reminders.ts) does the requests and feeds the outcomes in. */

export type ReminderCommand = ManagerReminderCommand;
export type ReminderSource =
  | {kind: 'AVAILABILITY'; weekStart: string; expectedDeadline: string}
  | {kind: 'COMMUNICATION'; communicationId: string; expectedRevisionId: string};
export type ReminderTarget = {employeeId: string; name: string; source: ReminderSource};

export type ReminderRequest = 'eligibility' | 'send' | 'lookup';
export type HeldReason = 'activation_held' | 'module_off';
export type BlockedReason = 'signed_out' | 'access_denied' | 'invalid_command';
export type ConflictReason = 'changed' | 'expires_first';

/** A server answer (or the lack of one) in the machine's own words. */
export type ReminderOutcome =
  | {kind: 'ready'; dueAt: string; expiresAt: string; timeZone: string; observedAt: string}
  | {kind: 'cooldown'; nextEligibleAt: string | null}
  | {kind: 'committed'; operationId: string; notificationId: string; disposition: 'queued' | 'already_queued'}
  | {kind: 'held'; reason: HeldReason}
  | {kind: 'blocked'; reason: BlockedReason}
  | {kind: 'conflict'; reason: ConflictReason}
  | {kind: 'not_found'}
  | {kind: 'failed'; reference: string | null}
  | {kind: 'unknown'};

export type ReminderState =
  | {phase: 'checking'; command: ReminderCommand; kept?: boolean}
  | {phase: 'ready'; command: ReminderCommand; dueAt: string; expiresAt: string; timeZone: string}
  | {phase: 'cooldown'; command: ReminderCommand; nextEligibleAt: string | null}
  | {phase: 'sending'; command: ReminderCommand}
  | {phase: 'queued'; command: ReminderCommand; operationId: string; notificationId: string; disposition: 'queued' | 'already_queued'; at: string | null}
  /* `kept`: the hold was the answer to a lookup, so the command's own result is still open and its id stays. */
  | {phase: 'held'; command: ReminderCommand; reason: HeldReason; kept: boolean}
  | {phase: 'blocked'; command: ReminderCommand; reason: BlockedReason}
  | {phase: 'conflict'; command: ReminderCommand; reason: ConflictReason}
  | {phase: 'unknown'; command: ReminderCommand; looking: boolean; note: 'first' | 'still' | 'access'; asked?: boolean}
  | {phase: 'not_sent'; command: ReminderCommand}
  | {phase: 'error'; command: ReminderCommand; reference: string | null};

export type ReminderEvent =
  | {type: 'recheck'}
  | {type: 'eligibility'; outcome: ReminderOutcome}
  | {type: 'send'}
  | {type: 'sent'; outcome: ReminderOutcome; at: string}
  /* `asked`: the person pressed "Check again" (the first lookup after an uncertain command is automatic). */
  | {type: 'lookup'; asked?: boolean}
  | {type: 'looked'; outcome: ReminderOutcome}
  | {type: 'source'; command: ReminderCommand};

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const isInstant = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

/** The exact command body for one person. The id is minted once here and travels with the body from then on. */
export function buildCommand(target: ReminderTarget, authority: string, operationId: string): ReminderCommand {
  const base = {operationId, authority, employeeId: target.employeeId};
  return target.source.kind === 'AVAILABILITY'
    ? {kind: 'AVAILABILITY', ...base, weekStart: target.source.weekStart, expectedDeadline: target.source.expectedDeadline}
    : {kind: 'COMMUNICATION', ...base, communicationId: target.source.communicationId, expectedRevisionId: target.source.expectedRevisionId};
}

/** Same person, same source, same session: the same reminder. */
export function sameReminder(a: ReminderCommand, b: ReminderCommand) {
  if (a.kind !== b.kind || a.employeeId !== b.employeeId || a.authority !== b.authority) return false;
  return a.kind === 'AVAILABILITY' && b.kind === 'AVAILABILITY' ? a.weekStart === b.weekStart && a.expectedDeadline === b.expectedDeadline
    : a.kind === 'COMMUNICATION' && b.kind === 'COMMUNICATION' ? a.communicationId === b.communicationId && a.expectedRevisionId === b.expectedRevisionId : false;
}

/** While a command is out, or its result is not known, nothing may replace it. */
export const frozen = (state: ReminderState) => state.phase === 'sending' || state.phase === 'unknown' || state.phase === 'not_sent' || state.phase === 'queued' || ((state.phase === 'held' || state.phase === 'checking') && !!state.kept);

export const initialReminder = (command: ReminderCommand): ReminderState => ({phase: 'checking', command});

/** Reads one HTTP answer. `status` 0 means no answer arrived (offline, timeout, interrupted). A body that does not
 * fit the contract is never trusted: on a read it is a failed check, on a command it is an unknown result. */
export function parseReminderResponse(request: ReminderRequest, status: number, body: unknown, command: ReminderCommand, reference: string | null = null): ReminderOutcome {
  const uncertain: ReminderOutcome = request === 'eligibility' ? {kind: 'failed', reference: isUuid(reference) ? reference : null} : {kind: 'unknown'};
  if (!status || !body || typeof body !== 'object' || Array.isArray(body)) return uncertain;
  const b = body as Record<string, unknown>, reason = typeof b.reason === 'string' ? b.reason : '';
  switch (b.status) {
    case 'ready':
      if (request !== 'eligibility' || status !== 200 || b.canQueue !== true || b.targetEmployeeId !== command.employeeId || !isInstant(b.dueAt) || !isInstant(b.expiresAt) || typeof b.timeZone !== 'string' || !b.timeZone) return uncertain;
      return {kind: 'ready', dueAt: b.dueAt, expiresAt: b.expiresAt, timeZone: b.timeZone, observedAt: isInstant(b.observedAt) ? b.observedAt : b.dueAt};
    case 'cooldown':
      if (request !== 'eligibility' || status !== 200 || b.canQueue !== false || !(b.nextEligibleAt === null || isInstant(b.nextEligibleAt))) return uncertain;
      return {kind: 'cooldown', nextEligibleAt: b.nextEligibleAt as string | null};
    case 'committed':
      // A receipt counts only for the command it was asked about.
      if (status !== 200 || b.operationId !== command.operationId || !isUuid(b.notificationId) || (b.disposition !== 'queued' && b.disposition !== 'already_queued')) return uncertain;
      return {kind: 'committed', operationId: command.operationId, notificationId: b.notificationId, disposition: b.disposition};
    case 'held':
      return {kind: 'held', reason: 'activation_held'};
    case 'blocked':
      return {kind: 'blocked', reason: status === 401 ? 'signed_out' : reason === 'invalid_command' ? 'invalid_command' : 'access_denied'};
    case 'conflict':
      return {kind: 'conflict', reason: reason === 'source_expires_before_delivery' ? 'expires_first' : 'changed'};
    case 'unavailable':
      if (reason === 'module_off') return {kind: 'held', reason: 'module_off'};
      if (request === 'lookup' && reason === 'operation_not_found') return {kind: 'not_found'};
      return uncertain;
    default:
      return uncertain;
  }
}

function fromEligibility(command: ReminderCommand, outcome: ReminderOutcome, kept = false): ReminderState {
  switch (outcome.kind) {
    case 'ready': return {phase: 'ready', command, dueAt: outcome.dueAt, expiresAt: outcome.expiresAt, timeZone: outcome.timeZone};
    case 'cooldown': return {phase: 'cooldown', command, nextEligibleAt: outcome.nextEligibleAt};
    // The read prefers the original receipt of this very command: it is already in the queue.
    case 'committed': return {phase: 'queued', command, operationId: outcome.operationId, notificationId: outcome.notificationId, disposition: outcome.disposition, at: null};
    case 'held': return {phase: 'held', command, reason: outcome.reason, kept};
    case 'blocked': return {phase: 'blocked', command, reason: outcome.reason};
    case 'conflict': return {phase: 'conflict', command, reason: outcome.reason};
    case 'failed': return {phase: 'error', command, reference: outcome.reference};
    default: return {phase: 'error', command, reference: null};
  }
}

export function reduceReminder(state: ReminderState, event: ReminderEvent): ReminderState {
  const {command} = state;
  switch (event.type) {
    case 'recheck':
      // A command that went out is never re-read as if it were new: its own lookup settles it first.
      return state.phase === 'sending' || state.phase === 'unknown' || state.phase === 'queued' ? state : {phase: 'checking', command, kept: state.phase === 'held' && state.kept};
    case 'eligibility':
      return state.phase === 'checking' ? fromEligibility(command, event.outcome, !!state.kept) : state;
    case 'send':
      // Ready, or a confirmed "nothing was queued": the exact original body and id go out (again).
      return state.phase === 'ready' || state.phase === 'not_sent' ? {phase: 'sending', command} : state;
    case 'sent': {
      if (state.phase !== 'sending') return state;
      const o = event.outcome;
      if (o.kind === 'committed') return {phase: 'queued', command, operationId: o.operationId, notificationId: o.notificationId, disposition: o.disposition, at: o.disposition === 'queued' ? event.at : null};
      if (o.kind === 'held') return {phase: 'held', command, reason: o.reason, kept: false};
      if (o.kind === 'blocked') return {phase: 'blocked', command, reason: o.reason};
      if (o.kind === 'conflict') return {phase: 'conflict', command, reason: o.reason};
      // Everything else (outcome_unknown, a lost answer, an answer we cannot read) is unknown, never failed.
      return {phase: 'unknown', command, looking: false, note: 'first'};
    }
    case 'lookup':
      return state.phase === 'unknown' && !state.looking ? {...state, looking: true, asked: !!event.asked} : state;
    case 'looked': {
      if (state.phase !== 'unknown' || !state.looking) return state;
      const o = event.outcome;
      if (o.kind === 'committed') return {phase: 'queued', command, operationId: o.operationId, notificationId: o.notificationId, disposition: o.disposition, at: null};
      if (o.kind === 'not_found') return {phase: 'not_sent', command};
      if (o.kind === 'held') return {phase: 'held', command, reason: o.reason, kept: true};
      // A refused or failed lookup proves nothing about the original command: it stays unknown, with its id.
      return {phase: 'unknown', command, looking: false, note: o.kind === 'blocked' ? 'access' : state.asked ? 'still' : 'first'};
    }
    case 'source':
      // The page re-read its source (a new deadline, a new revision, a new session). A frozen command stays as it is.
      if (frozen(state) || sameReminder(command, event.command)) return state;
      return {phase: 'checking', command: event.command};
  }
}

/** Counts for "Remind 4 people": only people the server said can be queued right now. */
export const canSend = (state: ReminderState | undefined) => state?.phase === 'ready';
