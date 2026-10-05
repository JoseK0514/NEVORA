import type { SchedulingSourceFacts } from '../data/scheduling-source-facts';
import type { GenerationSource } from '../data/generation-guards';
import type { SessionEmployee } from '../auth/session';
import type { CalloutReasonCode } from '../data/callouts';
import type { ScheduleStatus, ShiftExchange } from '../domain';
import type { ValidateShiftInput, ValidationIssueCode, ProjectedScheduledHours } from '../scheduling/validate-shift';

export type WorkflowKind = 'SWAP' | 'COVERAGE';
export type ApprovalMode = 'AUTOMATIC_WHEN_VALID' | 'MANAGER_REVIEW';
export type RuleSetting<T> = { status: 'UNKNOWN' } | { status: 'NOT_APPLICABLE'; reviewedBy: string; reviewedAt: string } | { status: 'CONFIGURED'; value: T; revision: number };
export type WorkflowPolicy = { revision: number; mode: ApprovalMode | null; submissionAdvanceMinutes: number | null; completionAdvanceMinutes: number | null };
export type ShiftChangePolicy = { version: 1; revision: number; swap: WorkflowPolicy; coverage: WorkflowPolicy };
export type RuleTimeBasis = 'ELAPSED' | 'WALL_CLOCK';
export type DurationRule = { minutes: number; timeBasis: RuleTimeBasis };
export type DailyDurationRule = DurationRule & { window: 'BUSINESS_CALENDAR_DAY' | 'ROLLING_24_HOURS' };
export type BreakRule = { afterMinutes: number; minimumMinutes: number; paid: boolean; timeBasis: RuleTimeBasis };
export type OvertimeRule = { weeklyMinutes: number; routing: 'MANAGER_REVIEW' | 'ALLOW'; timeBasis: RuleTimeBasis };
export type OperationalRuleProfile = {
  version: 1; revision: number; reviewedBy: string | null; reviewedAt: string | null;
  minimumRest: RuleSetting<DurationRule>; maximumShift: RuleSetting<DurationRule>; maximumDaily: RuleSetting<DailyDurationRule>;
  breaks: RuleSetting<BreakRule>; projectedOvertime: RuleSetting<OvertimeRule>;
};
export type ScheduledBreakFacts = { status: 'UNKNOWN' } | { status: 'KNOWN'; breaks: readonly { start: string; end: string; paid: boolean }[] };
export type ShiftTerms = { shiftId: string; scheduleId: string; workspaceId: string; timeZone: string; weekStart: string; date: string; startTime: string; endTime: string; locationId: string; employeeId: string; assignmentEpisodeId: string; termsRevision:number; positionId: string | null; isDesignatedLead: boolean; scheduledBreaks: ScheduledBreakFacts };
export type SessionMutationProof = { employee: SessionEmployee; sessionTokenHash: string };
export type ConsentSnapshot = { employeeId: string; consentedAt: string; source: ShiftTerms; target: ShiftTerms | null };
export type ShiftChangeRequest = {
  id: string; kind: WorkflowKind; status: ShiftExchange['status']; revision: number; legacyManual: boolean;
  requestedByEmployeeId: string; targetEmployeeId: string | null;
  requesterConsent: ConsentSnapshot | null; targetConsent: ConsentSnapshot | null;
  releaseAuthorization?: {calloutId:string;reviewedBy:string;source:ShiftTerms};
  recordedApprovalMode: ApprovalMode | null; effectiveApprovalMode: ApprovalMode | null;
};
export type OperationalIssueCode = 'MIN_REST' | 'MAX_SHIFT_HOURS' | 'MAX_DAILY_HOURS' | 'BREAK_REQUIREMENT' | 'RULE_UNVERIFIABLE' | 'PROJECTED_OVERTIME_REVIEW';
export type ShiftChangeIssue = { code: ValidationIssueCode | OperationalIssueCode | 'STALE_TERMS' | 'CONSENT_REQUIRED' | 'POLICY_UNKNOWN'; message: string };
export type ProposedAssignment = { shiftId: string; employeeId: string };
export type ShiftChangeEvaluation = { decision: 'ELIGIBLE' | 'MANAGER_REVIEW' | 'BLOCKED' | 'UNVERIFIED'; issues: readonly ShiftChangeIssue[]; affectedWeeks: readonly string[]; proposedAssignments: readonly ProposedAssignment[]; scheduledProjections: readonly (ProjectedScheduledHours & { employeeId: string })[] };
/** Private server source. Do not serialize to clients. */
export type ShiftChangeSnapshot = { source: GenerationSource; facts: SchedulingSourceFacts; observedAt: string; actor: SessionMutationProof; request: ShiftChangeRequest | null; policy: ShiftChangePolicy | null; profiles: readonly { employeeId: string; profile: OperationalRuleProfile }[]; ledger: readonly ShiftTerms[]; publication: readonly { scheduleId: string; status: ScheduleStatus }[] };
export type ShiftChangeResult =
  | { status: 'completed' | 'pending' | 'closed'; operationId: string; requestId: string; revision: number }
  | { status: 'blocked'; issues: readonly ShiftChangeIssue[] }
  | { status: 'unavailable' | 'conflict' }
  | { status: 'outcome-unknown'; operationId: string };
export type DeadlineInput = { stage: 'SUBMIT' | 'COMPLETE'; now: string; earliestShiftStart: string; currentSubmissionAdvanceMinutes: number | null; currentCompletionAdvanceMinutes: number | null; recordedCompletionDeadline: string | null };
export type DeadlineResult = { status: 'READY'; submissionDeadline: string; completionDeadline: string; allowed: boolean } | { status: 'UNVERIFIED' | 'INVALID_POLICY'; allowed: false };
export type CommandIdentity = { operationId: string };
export type ReviewedSource = { sourceShiftId: string; sourceEpisodeId: string; sourceTermsFingerprint: string };
export type ReviewedTarget = { targetShiftId: string; targetEpisodeId: string; targetTermsFingerprint: string };
export type ExistingRequestCommand = CommandIdentity & { requestId: string; expectedRevision: number };
export type ShiftChangeCommand =
  | (CommandIdentity & ReviewedSource & { kind: 'OFFER_COVERAGE' })
  | (CommandIdentity & ReviewedSource & ReviewedTarget & { kind: 'PROPOSE_SWAP' })
  | (ExistingRequestCommand & { kind: 'ACCEPT' | 'DECLINE' | 'CANCEL' | 'WITHDRAW' | 'MANAGER_APPROVE' | 'MANAGER_DECLINE' | 'MANAGER_CLOSE' })
  | (CommandIdentity & ReviewedSource & { kind: 'SUBMIT_CALLOUT'; reasonCode: CalloutReasonCode; reasonNote?: string })
  | (ExistingRequestCommand & { kind: 'APPROVE_CALLOUT' | 'DECLINE_CALLOUT' | 'CANCEL_CALLOUT' });
export type TransitionInput = { request: ShiftChangeRequest; command: Extract<ShiftChangeCommand, ExistingRequestCommand>; actor: SessionEmployee; evaluation: ShiftChangeEvaluation; deadline: DeadlineResult };
export type TransitionEffect = 'RECORD_TARGET_CONSENT' | 'CLEAR_TARGET_CONSENT' | 'APPLY_ASSIGNMENTS' | 'RELEASE_PARTICIPATION' | 'APPEND_EVENT';
export type TransitionDecision = { status: 'REFUSED'; code: 'FORBIDDEN' | 'CONFLICT' | 'TERMINAL' | 'INVALID_TRANSITION' | 'LEGACY_MANUAL' | 'BLOCKED' | 'UNVERIFIED' | 'CONSENT_REQUIRED' | 'DEADLINE' } | { status: 'UNCHANGED' } | { status: 'NEXT'; nextStatus: ShiftChangeRequest['status']; revision: number; effects: readonly TransitionEffect[] };
export type PolicyWrite = { proof: SessionMutationProof; expectedRevision: number; scope: 'swap' | 'coverage'; replacement: Omit<WorkflowPolicy, 'revision'> };
export type PolicyField = 'authorization' | 'expectedRevision' | 'mode' | 'submissionAdvanceMinutes' | 'completionAdvanceMinutes' | 'profile' | 'employeeId';
export type PolicyWriteResult = { status: 'saved'; revision: number } | { status: 'conflict' } | { status: 'invalid'; fieldErrors: readonly { field: PolicyField; message: string }[] };
export type OperationalProfileWrite = { proof: SessionMutationProof; employeeId: string; expectedRevision: number; replacement: Omit<OperationalRuleProfile, 'version' | 'revision' | 'reviewedBy' | 'reviewedAt'> };
export type OperationalRuleInput = Pick<ValidateShiftInput, 'candidate' | 'existingShifts' | 'excludedShiftIds'> & { profile: OperationalRuleProfile; timeZone: string; scheduledBreaks: ScheduledBreakFacts };
export type OperationalRuleResult = { blockers: readonly ShiftChangeIssue[]; unverifiable: readonly ShiftChangeIssue[]; warnings: readonly ShiftChangeIssue[] };
