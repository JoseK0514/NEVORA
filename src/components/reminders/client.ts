import {parseReminderResponse, type ReminderCommand, type ReminderOutcome, type ReminderRequest} from './machine';

/* Reminders (U10): the three requests. Same origin, private, never cached, never redirected. The headers are the
 * contract's: the reminder intent and the session's communication authority, which also travels in the body. */

const PATHS: Record<ReminderRequest, (command: ReminderCommand) => string> = {
  eligibility: () => '/api/manager/reminders/eligibility',
  send: () => '/api/manager/reminders',
  lookup: command => `/api/manager/reminders/operations/${encodeURIComponent(command.operationId)}`,
};
/** A read may give up early; a command waits longer than the server's own 10 second limit before it is "unknown". */
const TIMEOUT_MS: Record<ReminderRequest, number> = {eligibility: 12000, send: 15000, lookup: 12000};

export type ReminderTransport = (request: ReminderRequest, command: ReminderCommand, signal?: AbortSignal) => Promise<ReminderOutcome>;

export const reminderRequest: ReminderTransport = async (request, command, signal) => {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), TIMEOUT_MS[request]);
  const stop = () => controller.abort();
  signal?.addEventListener('abort', stop, {once: true});
  try {
    const lookup = request === 'lookup';
    const response = await fetch(PATHS[request](command), {
      method: lookup ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: {'X-Nevora-Reminder': '1', 'X-Nevora-Reminder-Authority': command.authority, ...(lookup ? {} : {'Content-Type': 'application/json'})},
      ...(lookup ? {} : {body: JSON.stringify(command)}),
    });
    const body: unknown = await response.json().catch(() => null);
    // B10: the support reference is this response's own header, shown only when it is a real reference.
    return parseReminderResponse(request, response.status, body, command, response.headers.get('X-Nevora-Request-Id'));
  } catch {
    return parseReminderResponse(request, 0, null, command);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', stop);
  }
};
