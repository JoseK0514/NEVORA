export const MANAGER_ADVISOR_HEADER = 'x-nevora-manager-advisor';

export const MANAGER_ADVISOR_QUESTIONS = [
  'draft_shifts', 'published_shifts', 'released_shifts', 'scheduled_minutes',
] as const;

export type ManagerAdvisorQuestion = typeof MANAGER_ADVISOR_QUESTIONS[number];
export type ManagerAdvisorLocation = { id: string; name: string };
export type ManagerAdvisorDay = {
  date: string;
  draftShifts: number;
  publishedShifts: number;
  releasedShifts: number;
  scheduledMinutes: number;
};
type Observation = { observedAt: string; validForMs: number };
type WeekObservation = Observation & { weekStart: string; location: ManagerAdvisorLocation };

export type ManagerAdvisorResponse =
  | (Observation & { state: 'ready'; view: 'context'; questionMode: 'guided'; locations: ManagerAdvisorLocation[]; questions: readonly ManagerAdvisorQuestion[] })
  | (WeekObservation & { state: 'ready'; view: 'weekly'; days: ManagerAdvisorDay[] })
  | (WeekObservation & { state: 'ready'; view: 'answer'; question: ManagerAdvisorQuestion; value: number })
  | { state: 'error'; code: 'invalid' | 'disabled' | 'forbidden' | 'unavailable' };
