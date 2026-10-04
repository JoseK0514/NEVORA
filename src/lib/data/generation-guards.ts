import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { scheduleWeekLockStatements } from './notification-transactions';

// Conservative complete scheduling source. All input-table rows participate, so
// foreign-week shifts, absent memberships and cascading coverage deletes conflict.
// Parent-before-child order also protects against uncooperative FK writers.
const tables = [
  'locations','positions','employees','employee_location_eligibility','employee_positions',
  'employee_scheduling_settings','location_staffing_settings','location_coverage_windows',
  'coverage_window_position_requirements','availability_windows','weekly_availability_windows',
  'weekly_availability_submissions','availability_exceptions','time_off_requests','schedule_week_settings',
  'schedules','shifts','shift_callouts','shift_exchanges','schedule_publication_revisions',
  'schedule_publication_revision_shifts','schedule_generation_exclusions',
] as const;
export type GenerationSourceRow = Record<string, unknown>;
export type GenerationSource = Record<typeof tables[number] | 'workspaces', GenerationSourceRow[]>;
const order: Partial<Record<keyof GenerationSource,string>> = {
  schedule_generation_exclusions:'id COLLATE "C"',
  employee_location_eligibility:'employee_id,location_id', employee_positions:'employee_id,position_id',
  employee_scheduling_settings:'employee_id',location_staffing_settings:'location_id',
  coverage_window_position_requirements:'coverage_window_id,position_id',
  weekly_availability_submissions:'week_start,employee_id',schedule_week_settings:'week_start',
};
const sourceSql = `jsonb_build_object(${['workspaces',...tables].map(name =>
  `'${name}',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY ${order[name as keyof GenerationSource] ?? 'id COLLATE "C"'}) FROM ${name} t),'[]'::jsonb)`
).join(',')})`;
export async function readGenerationSource(executor: SqlExecutor): Promise<{source:GenerationSource;changedAt:string}> {
  const [row] = await executor.query<{source:GenerationSource;changedAt:string}>({
    text:`SELECT ${sourceSql} AS source,to_jsonb(clock_timestamp()) AS "changedAt"`,values:[],
  });
  if (!row) throw new Error('Generation source unavailable.');
  return row;
}
export class GenerationConflictError extends Error {
  constructor() { super('Scheduling inputs changed or are busy; reload and try again.'); }
}
export class GenerationPermissionError extends Error {
  constructor() { super('An active Owner or Manager in the active workspace is required.'); }
}
export class GenerationScopeError extends Error {
  constructor() { super('The explicit workspace, location, week and DRAFT schedule must match.'); }
}
export class GenerationTargetNotDraftError extends GenerationScopeError {
  constructor(readonly locationNames: string[]) { super(); }
}
export function generationSourceGuard(source:GenerationSource):SqlStatement {
  return {text:`SELECT (CASE WHEN ${sourceSql}=$1::jsonb THEN '1' ELSE 'generation_source_conflict' END)::integer`,values:[JSON.stringify(source)]};
}
export function generationMutationGuards(source:GenerationSource,weeks:readonly string[]):SqlStatement[] {
  return [
    {text:"SET LOCAL lock_timeout='1500ms'",values:[]},
    {text:"SET LOCAL statement_timeout='5000ms'",values:[]},
    // FIRST lock: do not upgrade SHARE, and retain FK KEY SHARE compatibility.
    {text:'SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR NO KEY UPDATE',values:[]},
    ...scheduleWeekLockStatements(weeks),
    ...tables.map(table=>({text:`LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE`,values:[]})),
    // Separate statement: fresh READ COMMITTED snapshot after every lock wait.
    generationSourceGuard(source),
  ];
}
export async function withGenerationRetry<T>(work:()=>Promise<T>):Promise<T> {
  for(let attempt=0;attempt<3;attempt++) {
    try{return await work();} catch(error) {
      const code=error && typeof error==='object' && 'code' in error ? String(error.code) : '';
      const named=code==='22P02' && error instanceof Error && error.message.includes('generation_source_conflict');
      if(code==='55P03' || code==='57014') throw new GenerationConflictError();
      if(!named && code!=='40001' && code!=='40P01') throw error;
      if(attempt===2) throw new GenerationConflictError();
    }
  }
  throw new GenerationConflictError();
}
