/* The private X-Nevora-Failure response header (backend repairs, Nov 9, 2026: CLAUDE-CONTRACT.md, "Request admission and
 * error recovery"). One place maps each value to what the browser does about it, so every protected read and command the
 * UI sends recovers the same way. Response bodies are untouched: an existing business body (an unknown outcome, a
 * conflict's current state) is read first by its caller and wins over this generic recovery. Nothing here retries a
 * command, makes a new operation ID or decides that an error undid a saved change. */

export const NEVORA_FAILURES = ['authentication_required', 'access_denied', 'actor_mismatch', 'view_invalid', 'origin_mismatch',
  'origin_unavailable', 'request_intent_required', 'cross_site_request', 'json_required', 'invalid_request', 'source_unavailable',
  'conflict'] as const;
export type NevoraFailure = typeof NEVORA_FAILURES[number];

/** What the page does: offer sign-in; say access ended; refresh the page's authority; say the connection can't be
 * confirmed (never suggest signing in again, never name an origin); stop (the request itself was wrong, no retry as
 * another command); say it couldn't load (unknown, not zero); or read again (conflict). */
export type FailureRecovery = 'sign_in' | 'access_ended' | 'refresh_view' | 'origin' | 'contract' | 'unavailable' | 'reread';

export function nevoraFailure(response: Pick<Response, 'headers'>): NevoraFailure | null {
  const value = response.headers.get('x-nevora-failure');
  return value && (NEVORA_FAILURES as readonly string[]).includes(value) ? value as NevoraFailure : null;
}

export function failureRecovery(code: NevoraFailure): FailureRecovery {
  switch (code) {
    case 'authentication_required': return 'sign_in';
    case 'access_denied': case 'actor_mismatch': return 'access_ended';
    case 'view_invalid': return 'refresh_view';
    case 'origin_mismatch': case 'origin_unavailable': return 'origin';
    case 'request_intent_required': case 'cross_site_request': case 'json_required': case 'invalid_request': return 'contract';
    case 'source_unavailable': return 'unavailable';
    case 'conflict': return 'reread';
  }
}

/** Recoveries that must drop protected data already on screen. */
export const clearsProtectedData = (recovery: FailureRecovery) => recovery === 'sign_in' || recovery === 'access_ended' || recovery === 'refresh_view' || recovery === 'origin';

/** The page-level line for each recovery, in the product's message style. "unavailable" and "reread" are said where the
 * read is (its own card), so they have no page-level line. */
export const FAILURE_MESSAGES: Record<Exclude<FailureRecovery, 'unavailable' | 'reread'>, {title: string; body: string}> = {
  sign_in: {title: 'Your session ended', body: 'Sign in again to keep working.'},
  access_ended: {title: 'Your access changed', body: 'This information was cleared from the screen. Ask your manager if you still need it.'},
  refresh_view: {title: 'This page was out of date', body: 'It was cleared and is being refreshed with your current access.'},
  origin: {title: 'This connection isn’t secure', body: 'We cleared this page to protect your information. Signing in again won’t fix this. Ask your Owner to check the NEVORA web address you’re using.'},
  contract: {title: 'That didn’t go through', body: 'Nothing was saved. Reload the page and try again.'},
};

export const FAILURE_EVENT = 'nevora:failure';

/** Tell the page-level notice (NevoraFailureNotice) once per failure. It is a hint for the screen, never authority. */
export function announceFailure(code: NevoraFailure | null) {
  if (!code || typeof window === 'undefined') return;
  const recovery = failureRecovery(code);
  if (recovery === 'unavailable' || recovery === 'reread') return;
  window.dispatchEvent(new CustomEvent(FAILURE_EVENT, {detail: {recovery}}));
}

/** A protected read's outcome for createPrivateSnapshotController: data to parse, or the reason to show instead. Every
 * recovery that clears data reads as access_denied (the controller clears the snapshot and stops polling); the rest read
 * as read_failed (shown as "couldn't load", never as zero; the controller reads again on its schedule). */
export async function privateReadBody(response: Response): Promise<{ok: true; body: unknown} | {ok: false; reason: 'access_denied' | 'read_failed'; failure: NevoraFailure | null}> {
  const failure = nevoraFailure(response);
  if (response.ok) return {ok: true, body: await response.json()};
  announceFailure(failure);
  if (failure) return {ok: false, reason: clearsProtectedData(failureRecovery(failure)) ? 'access_denied' : 'read_failed', failure};
  return {ok: false, reason: response.status === 401 || response.status === 403 ? 'access_denied' : 'read_failed', failure: null};
}
