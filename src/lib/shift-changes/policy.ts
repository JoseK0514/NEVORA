import type { DeadlineInput, DeadlineResult, OperationalRuleProfile, RuleSetting, ShiftChangePolicy, WorkflowPolicy } from './types';
const object = (raw: unknown): raw is Record<string, unknown> => !!raw && typeof raw === 'object' && !Array.isArray(raw);
const revision = (raw: unknown): raw is number => Number.isSafeInteger(raw) && (raw as number) >= 0;
const minutes = (raw: unknown): raw is number => Number.isSafeInteger(raw) && (raw as number) >= 0 && (raw as number) <= 525600;
const instant = (raw: unknown): raw is string => typeof raw === 'string' && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(raw) && Number.isFinite(Date.parse(raw));
export function isWorkflowPolicy(raw: unknown): raw is WorkflowPolicy {
  return object(raw) && revision(raw.revision) && (raw.mode === null || raw.mode === 'AUTOMATIC_WHEN_VALID' || raw.mode === 'MANAGER_REVIEW')
    && (raw.submissionAdvanceMinutes === null || minutes(raw.submissionAdvanceMinutes)) && (raw.completionAdvanceMinutes === null || minutes(raw.completionAdvanceMinutes))
    && (raw.submissionAdvanceMinutes === null || raw.completionAdvanceMinutes === null || raw.submissionAdvanceMinutes >= raw.completionAdvanceMinutes);
}
export function resolveShiftChangePolicy(raw: unknown): ShiftChangePolicy | null {
  if (!object(raw) || raw.version !== 1 || !revision(raw.revision) || !isWorkflowPolicy(raw.swap) || !isWorkflowPolicy(raw.coverage)) return null;
  const scope = (s: WorkflowPolicy): WorkflowPolicy => ({revision:s.revision,mode:s.mode,submissionAdvanceMinutes:s.submissionAdvanceMinutes,completionAdvanceMinutes:s.completionAdvanceMinutes});
  return {version:1,revision:raw.revision,swap:scope(raw.swap),coverage:scope(raw.coverage)};
}
export function unknownOperationalRuleProfile(): OperationalRuleProfile {
  return {version:1,revision:0,reviewedBy:null,reviewedAt:null,minimumRest:{status:'UNKNOWN'},maximumShift:{status:'UNKNOWN'},maximumDaily:{status:'UNKNOWN'},breaks:{status:'UNKNOWN'},projectedOvertime:{status:'UNKNOWN'}};
}
const timeBasis = (raw: unknown) => raw === 'ELAPSED' || raw === 'WALL_CLOCK';
const duration = (raw: unknown) => object(raw) && minutes(raw.minutes) && timeBasis(raw.timeBasis);
const breakRule = (raw: unknown) => object(raw) && minutes(raw.afterMinutes) && minutes(raw.minimumMinutes) && typeof raw.paid === 'boolean' && timeBasis(raw.timeBasis);
const overtime = (raw: unknown) => object(raw) && minutes(raw.weeklyMinutes) && (raw.routing === 'ALLOW' || raw.routing === 'MANAGER_REVIEW') && timeBasis(raw.timeBasis);
function setting<T>(raw: unknown, valid: (value: unknown) => boolean): RuleSetting<T> {
  if (!object(raw)) return {status:'UNKNOWN'};
  if (raw.status === 'NOT_APPLICABLE' && typeof raw.reviewedBy === 'string' && raw.reviewedBy.length > 0 && raw.reviewedBy.length <= 128 && instant(raw.reviewedAt)) return {status:'NOT_APPLICABLE',reviewedBy:raw.reviewedBy,reviewedAt:raw.reviewedAt};
  if (raw.status === 'CONFIGURED' && revision(raw.revision) && raw.revision > 0 && valid(raw.value)) return {status:'CONFIGURED',revision:raw.revision,value:raw.value as T};
  return {status:'UNKNOWN'};
}
export function resolveOperationalRuleProfile(raw: unknown): OperationalRuleProfile {
  if (!object(raw) || raw.version !== 1 || !revision(raw.revision) || typeof raw.reviewedBy !== 'string' || !raw.reviewedBy || !instant(raw.reviewedAt)) return unknownOperationalRuleProfile();
  return {version:1,revision:raw.revision,reviewedBy:raw.reviewedBy,reviewedAt:raw.reviewedAt,minimumRest:setting(raw.minimumRest,duration),maximumShift:setting(raw.maximumShift,duration),maximumDaily:setting(raw.maximumDaily,v=>duration(v) && object(v) && (v.window === 'BUSINESS_CALENDAR_DAY' || v.window === 'ROLLING_24_HOURS')),breaks:setting(raw.breaks,breakRule),projectedOvertime:setting(raw.projectedOvertime,overtime)};
}
export function evaluateRequestDeadlines(input: DeadlineInput): DeadlineResult {
  const {currentSubmissionAdvanceMinutes:submission,currentCompletionAdvanceMinutes:completion} = input;
  if (submission === null || completion === null) return {status:'UNVERIFIED',allowed:false};
  if (!minutes(submission) || !minutes(completion) || submission < completion || !instant(input.now) || !instant(input.earliestShiftStart) || (input.recordedCompletionDeadline !== null && !instant(input.recordedCompletionDeadline))) return {status:'INVALID_POLICY',allowed:false};
  const start = Date.parse(input.earliestShiftStart);
  const submitAt = start - submission * 60000;
  const completeAt = Math.min(start - completion * 60000, input.recordedCompletionDeadline === null ? Infinity : Date.parse(input.recordedCompletionDeadline));
  return {status:'READY',submissionDeadline:new Date(submitAt).toISOString(),completionDeadline:new Date(completeAt).toISOString(),allowed:Date.parse(input.now) < (input.stage === 'SUBMIT' ? Math.min(submitAt,completeAt) : completeAt)};
}
