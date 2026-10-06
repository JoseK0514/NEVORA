import type { SourceSnapshot, RecipientAccess } from './types';
import { diffPublishedShifts, type PublishedShiftSnapshot } from '../assistance/publication-diff';
export function isReviewRole(recipient: RecipientAccess): boolean {
  return recipient.role === 'OWNER' || recipient.role === 'MANAGER';
}
export function isSelfServiceRecipient(recipient: RecipientAccess): boolean {
  return recipient.role === 'EMPLOYEE' || recipient.role === 'LEAD';
}
export function canAccessPublishedAssignment(recipient: RecipientAccess, shift: PublishedShiftSnapshot): boolean {
  return shift.employeeId === recipient.employeeId && (isReviewRole(recipient) || recipient.allowedLocationIds.includes(shift.locationId));
}
const ROUTE_PARAMS: Record<string, readonly string[]> = {
  '/app': [], '/app/schedule': ['week','employeeId'], '/app/availability': ['week','employeeId'],
  '/app/requests': ['tab','requestId'], '/app/exchange': ['tab','requestId'],
  '/app/schedule/coverage': ['week','date','locationId','start','end','lead'],
  '/app/notifications/open': ['notificationId'],
};
function safeId(value: string): boolean {
  return /^[A-Za-z0-9_ :.-]{1,128}$/.test(value) && !value.includes('..');
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value;
}
export function safeNotificationOpenPath(notificationId: string): string | null {
  return safeId(notificationId) ? `/app/notifications/open?notificationId=${encodeURIComponent(notificationId)}` : null;
}
export function safeReturnTo(candidate: string | undefined): string | null {
  if (!candidate || candidate.length > 2048 || /[\\\u0000-\u0020\u007f#]/.test(candidate) || !candidate.startsWith('/') || candidate.startsWith('//')) return null;
  const rawPath = candidate.split('?')[0];
  if (rawPath.includes('%') || rawPath.split('/').some(segment => segment === '.' || segment === '..')) return null;
  const allowed = ROUTE_PARAMS[rawPath];
  if (!allowed) return null;
  const url = new URL(candidate, 'https://fuel.invalid');
  if (url.pathname !== rawPath || url.origin !== 'https://fuel.invalid') return null;
  const seen = new Set<string>();
  for (const [key,value] of url.searchParams) {
    if (seen.has(key) || !allowed.includes(key)) return null;
    seen.add(key);
    if (key === 'week' || key === 'date') { if (!validDate(value)) return null; }
    else if (key === 'start' || key === 'end') { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null; }
    else if (key === 'lead') { if (value !== '1') return null; }
    else if (key === 'tab') {
      if (!(rawPath === '/app/requests' ? ['new','my','team','pending','approved','declined'] : ['available','requests','my','history','pending','coverage','activity']).includes(value)) return null;
    } else if (!safeId(value)) return null;
  }
  if (rawPath === '/app/notifications/open' && !seen.has('notificationId')) return null;
  return candidate;
}
export function destinationForSource(source: SourceSnapshot, recipient: RecipientAccess): string | null {
  if (!recipient.active) return null;
  const encode = encodeURIComponent;
  switch (source.kind) {
    case 'SCHEDULE': {
      const personalChanges = diffPublishedShifts([...source.previousShifts],[...source.currentShifts]).filter(change => change.affectedEmployeeIds.includes(recipient.employeeId));
      const relevantAssignments = personalChanges.length
        ? personalChanges.flatMap(change => [change.before,change.after]).filter((shift): shift is PublishedShiftSnapshot => shift !== undefined)
        : [...source.previousShifts,...source.currentShifts];
      const hasAccess = isReviewRole(recipient) || relevantAssignments.some(shift => canAccessPublishedAssignment(recipient,shift));
      return hasAccess ? safeReturnTo(`/app/schedule?week=${encode(source.revision.weekStart)}`) : null;
    }
    case 'TIME_OFF':
      if (isReviewRole(recipient)) {
        if (source.record.status === 'CANCELLED') return null;
        const tab = {PENDING:'pending',APPROVED:'approved',DENIED:'declined'}[source.record.status];
        return tab ? safeReturnTo(`/app/requests?tab=${tab}&requestId=${encode(source.record.id)}`) : null;
      }
      return source.record.employeeId === recipient.employeeId ? safeReturnTo(`/app/requests?tab=my&requestId=${encode(source.record.id)}`) : null;
    case 'EXCHANGE': {
      const participant = source.record.requestedByEmployeeId === recipient.employeeId || source.record.targetEmployeeId === recipient.employeeId;
      const reviewer = isReviewRole(recipient);
      const invited=source.record.status==='OPEN' && source.record.kind==='COVERAGE' && source.eligibleEmployeeIds?.includes(recipient.employeeId) && isSelfServiceRecipient(recipient);
      if (!participant && !reviewer && !invited) return null;
      const terminal = ['APPROVED','DENIED','CANCELLED','EXPIRED'].includes(source.record.status);
      if (!terminal && !reviewer && !recipient.allowedLocationIds.includes(source.record.sourceShift.locationId)) return null;
      if (reviewer && source.record.status === 'EMPLOYEE_PENDING') return null;
      const tab = reviewer
        ? terminal ? 'activity' : source.record.status === 'OPEN' ? 'coverage' : 'pending'
        : terminal ? 'history' : invited ? 'available' : 'requests';
      return safeReturnTo(`/app/exchange?tab=${tab}&requestId=${encode(source.record.id)}`);
    }
    case 'CALLOUT':
      if (!isReviewRole(recipient) && (source.record.employeeId !== recipient.employeeId || (source.record.status === 'PENDING' && !recipient.allowedLocationIds.includes(source.record.locationId)))) return null;
      return safeReturnTo(`/app/exchange?tab=${isReviewRole(recipient) ? source.record.status === 'PENDING' ? 'pending' : 'activity' : 'requests'}&requestId=${encode(source.record.id)}`);
    case 'AVAILABILITY':
      return isReviewRole(recipient) || isSelfServiceRecipient(recipient) ? safeReturnTo(`/app/availability?week=${encode(source.settings.weekStart)}`) : null;
    case 'MANAGER_SUMMARY':
      return isReviewRole(recipient) ? source.items.map(item => {
        const href = safeReturnTo(item.href);
        if (!href) return null;
        const url = new URL(href,'https://fuel.invalid');
        if (item.type === 'TIME_OFF') {
          if (url.pathname !== '/app/requests') return null;
          if (!['pending','approved','declined'].includes(url.searchParams.get('tab') ?? '')) url.searchParams.set('tab','pending');
        } else if (item.type === 'EXCHANGE' || item.type === 'CALLOUT') {
          if (url.pathname !== '/app/exchange') return null;
          const tab = url.searchParams.get('tab');
          if (!['pending','coverage','activity'].includes(tab ?? '')) url.searchParams.set('tab',tab === 'history' ? 'activity' : 'pending');
        }
        return safeReturnTo(`${url.pathname}${url.search}`);
      }).find(href => href !== null) ?? null : null;
    case 'SELF_TEST':
      return source.employeeId === recipient.employeeId ? '/app' : null;
  }
}

/** Append only a derived fragment after the existing route/query validation. */
export function withRequestFragment(candidate: string): string | null {
  const safe = safeReturnTo(candidate);
  if (!safe) return null;
  const url = new URL(safe, 'https://fuel.invalid');
  const id = url.searchParams.get('requestId');
  return id && ['/app/requests', '/app/exchange'].includes(url.pathname) ? `${safe}#request-${encodeURIComponent(id)}` : safe;
}
