/** When NEVORA may celebrate. A moment is allowed only when the server has
 * already confirmed the outcome, the person is the one it happened to (or the
 * manager who just published a schedule), it isn't about money, payroll
 * actions, the Clocker or an error, and nothing else was celebrated this
 * session. Everything else gets a calm receipt. */
export const CELEBRATIONS = {
  SCHEDULE_CONFIRMED: 'You’re set for the week',
  SCHEDULE_PUBLISHED: 'Schedule is live',
  TIME_OFF_APPROVED: 'Time off approved',
  SHIFT_CHANGE_APPROVED: 'Shift change approved',
  INBOX_CLEAR: 'Inbox clear',
  PAYDAY_AVAILABLE: 'Your statement is ready',
} as const;
export type CelebrationKind = keyof typeof CELEBRATIONS;

export type CelebrationRequest = {
  kind: string;
  /** A stable id for this one occurrence (week, request id, statement id, date). */
  key: string;
  /** True only when the triggering state came from a server read or receipt. */
  serverConfirmed: boolean;
  /** Where it would appear; these areas never celebrate. */
  area?: 'portal' | 'payroll-action' | 'clocker' | 'error' | 'loading';
};

export type CelebrationMemory = { sessionUsed: boolean; seenKeys: ReadonlySet<string> };
export type CelebrationDecision = { celebrate: true; kind: CelebrationKind } | { celebrate: false; reason: 'not_allowed' | 'unconfirmed' | 'excluded_area' | 'session_used' | 'already_seen' | 'no_key' };

export function decideCelebration(request: CelebrationRequest, memory: CelebrationMemory): CelebrationDecision {
  if (!(request.kind in CELEBRATIONS)) return { celebrate: false, reason: 'not_allowed' };
  if (request.serverConfirmed !== true) return { celebrate: false, reason: 'unconfirmed' };
  if (request.area && request.area !== 'portal') return { celebrate: false, reason: 'excluded_area' };
  if (!request.key.trim()) return { celebrate: false, reason: 'no_key' };
  if (memory.seenKeys.has(`${request.kind}:${request.key}`)) return { celebrate: false, reason: 'already_seen' };
  if (memory.sessionUsed) return { celebrate: false, reason: 'session_used' };
  return { celebrate: true, kind: request.kind as CelebrationKind };
}

const SESSION = 'nevora:celebrated';
const SEEN = 'nevora:celebrations-seen';
let pageSessionUsed = false; // fallback when storage is blocked
const pageSeen = new Set<string>();

function readMemory(): CelebrationMemory {
  let sessionUsed = pageSessionUsed, seen = new Set(pageSeen);
  try { sessionUsed = sessionUsed || window.sessionStorage.getItem(SESSION) === '1'; } catch { /* storage blocked */ }
  try { for (const key of JSON.parse(window.localStorage.getItem(SEEN) ?? '[]') as string[]) seen.add(key); } catch { /* storage blocked or malformed */ }
  return { sessionUsed, seenKeys: seen };
}

function remember(kind: CelebrationKind, key: string) {
  const id = `${kind}:${key}`;
  pageSessionUsed = true; pageSeen.add(id);
  try { window.sessionStorage.setItem(SESSION, '1'); } catch { /* storage blocked */ }
  try {
    const seen = new Set(JSON.parse(window.localStorage.getItem(SEEN) ?? '[]') as string[]); seen.add(id);
    window.localStorage.setItem(SEEN, JSON.stringify([...seen].slice(-200)));
  } catch { /* storage blocked */ }
}

/** Decide in the browser and, if allowed, use up this session's celebration. */
export function claimCelebration(request: CelebrationRequest): CelebrationDecision {
  const decision = decideCelebration(request, readMemory());
  if (decision.celebrate) remember(decision.kind, request.key);
  else if (decision.reason === 'session_used' && request.kind in CELEBRATIONS) remember(request.kind as CelebrationKind, request.key); // don't replay it later
  return decision;
}
