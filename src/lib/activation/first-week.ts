const steps = [
  ['ROSTER', '/app/employees'],
  ['LOCATION_AND_RULES', '/app/schedule/settings#coverage-staffing'],
  ['FIRST_SCHEDULE_PUBLISHED', '/app/schedule'],
  ['TABLET_SETUP', '/app/settings/clocker'],
  ['FIRST_TIMECARD_REVIEW', '/app/timecards'],
] as const;

export type FirstWeekStepId = (typeof steps)[number][0];
export type FirstWeekProgress = {
  state: 'ready';
  steps: Array<{ id: FirstWeekStepId; status: 'complete' | 'pending'; href: string }>;
  completedCount: number;
  nextStep: FirstWeekStepId | null;
};

export function projectFirstWeek(source: unknown): FirstWeekProgress {
  if (!source || typeof source !== 'object' || !('hasActiveLocation' in source) ||
      typeof source.hasActiveLocation !== 'boolean') throw Error('setup_source_unavailable');
  const facts = source as Record<string, unknown>;
  const items = steps.map(([id, href]) => {
    const complete = facts[id];
    if (typeof complete !== 'boolean') throw Error('setup_source_unavailable');
    const destination = id === 'LOCATION_AND_RULES' && !facts.hasActiveLocation ? '/app/settings/locations' : href;
    return { id, href: destination, status: complete ? 'complete' as const : 'pending' as const };
  });
  return {
    state: 'ready',
    steps: items,
    completedCount: items.filter(step => step.status === 'complete').length,
    nextStep: items.find(step => step.status === 'pending')?.id ?? null,
  };
}
