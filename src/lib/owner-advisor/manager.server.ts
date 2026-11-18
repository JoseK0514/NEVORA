import 'server-only';
import { readOperationalSchedule } from '@/lib/company-access/operational-read.server';
import { readOperationalAuthority } from '@/lib/company-access/operational-scope.server';
import { durationMinutes, isValidIsoDate, isValidWeekStart, weekDates } from '@/lib/date-utils';
import type { SqlExecutor } from '@/lib/notifications/types';
import type { SessionMutationProof } from '@/lib/shift-changes/types';
import {
  MANAGER_ADVISOR_QUESTIONS, type ManagerAdvisorDay, type ManagerAdvisorQuestion, type ManagerAdvisorResponse,
} from './manager-contracts';

type View =
  | { view: 'context' }
  | { view: 'weekly'; weekStart: string; locationId: string }
  | { view: 'answer'; weekStart: string; locationId: string; question: ManagerAdvisorQuestion };

export function parseManagerAdvisorView(params: URLSearchParams): View | null {
  if (!params.size) return { view: 'context' };
  const view = params.get('view');
  const weekStart = params.get('weekStart');
  const locationId = params.get('locationId');
  if (!weekStart || !isValidWeekStart(weekStart) || !weekDates(weekStart).every(isValidIsoDate) ||
      !locationId || locationId.length > 200 || locationId.trim() !== locationId || /[\p{Cc}\p{Cf}]/u.test(locationId)) return null;
  const keys = [...params.keys()].sort().join(',');
  if (view === 'weekly' && keys === 'locationId,view,weekStart') return { view, weekStart, locationId };
  const question = MANAGER_ADVISOR_QUESTIONS.find(key => key === params.get('question'));
  if (view === 'answer' && keys === 'locationId,question,view,weekStart' && question) return { view, weekStart, locationId, question };
  return null;
}

const forbidden = { state: 'error', code: 'forbidden' } as const;
const unavailable = { state: 'error', code: 'unavailable' } as const;

/** Location IDs and indicators are caller selections. All evidence is read
 * through the existing operational schedule under the live Manager session. */
export async function readManagerAdvisor(proof: SessionMutationProof, view: View, executor: SqlExecutor): Promise<ManagerAdvisorResponse> {
  if (proof.employee.role !== 'MANAGER') return forbidden;
  const admission = await readOperationalAuthority(proof, executor);
  if (admission.state !== 'ready') return admission.reason === 'access_denied' ? forbidden : unavailable;
  if (admission.role !== 'MANAGER' || !admission.scope) return forbidden;

  if (view.view === 'context') {
    return {
      state: 'ready', view: 'context', questionMode: 'guided', questions: MANAGER_ADVISOR_QUESTIONS,
      locations: admission.locations.map(({ id, name }) => ({ id, name })),
      observedAt: admission.observedAt, validForMs: admission.validForMs,
    };
  }
  const { locationId, weekStart } = view;
  if (!admission.locations.some(location => location.id === locationId)) return forbidden;
  const source = await readOperationalSchedule(proof, { weekStart, locationId }, executor);
  if (source.state !== 'ready') {
    return ['access_denied', 'source_changed'].includes(source.reason) ? forbidden : unavailable;
  }

  const days = new Map<string, ManagerAdvisorDay>(weekDates(weekStart).map(date => [
    date, { date, draftShifts: 0, publishedShifts: 0, releasedShifts: 0, scheduledMinutes: 0 },
  ]));
  for (const shift of source.data.shifts) {
    if (shift.locationId !== locationId) return unavailable;
    const day = days.get(shift.date);
    if (!day || shift.scheduleStatus === 'ARCHIVED') continue;
    if (shift.isCalloutApproved) {
      day.releasedShifts += 1;
      continue;
    }
    if (shift.scheduleStatus === 'DRAFT') day.draftShifts += 1;
    else day.publishedShifts += 1;
    day.scheduledMinutes += durationMinutes(shift.startTime, shift.endTime);
  }

  // A scope or role change between the first admission and the schedule read
  // must never rebind an in-flight result to a new grant.
  const current = await readOperationalAuthority(proof, executor);
  if (current.state !== 'ready') return current.reason === 'access_denied' ? forbidden : unavailable;
  const location = current.locations.find(item => item.id === locationId);
  if (source.authority !== admission.authority || current.authority !== admission.authority ||
      current.role !== 'MANAGER' || !current.scope || !location) return forbidden;
  const validForMs = Math.min(current.validForMs,
    source.validForMs - Math.max(0, Date.parse(current.observedAt) - Date.parse(source.observedAt)));
  if (!Number.isFinite(validForMs) || validForMs <= 0) return unavailable;

  const observation = { location: { id: location.id, name: location.name }, weekStart, observedAt: source.observedAt, validForMs };
  if (view.view === 'weekly') return { state: 'ready', view: 'weekly', ...observation, days: [...days.values()] };
  const totals = [...days.values()].reduce((sum, day) => ({
    draft_shifts: sum.draft_shifts + day.draftShifts,
    published_shifts: sum.published_shifts + day.publishedShifts,
    released_shifts: sum.released_shifts + day.releasedShifts,
    scheduled_minutes: sum.scheduled_minutes + day.scheduledMinutes,
  }), { draft_shifts: 0, published_shifts: 0, released_shifts: 0, scheduled_minutes: 0 });
  return { state: 'ready', view: 'answer', ...observation, question: view.question, value: totals[view.question] };
}
