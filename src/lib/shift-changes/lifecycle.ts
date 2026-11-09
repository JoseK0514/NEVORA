import {sameShiftTerms} from './terms';
import type { TransitionInput, TransitionDecision, TransitionEffect, ConsentSnapshot } from './types';
const terminal = new Set(['APPROVED','DENIED','CANCELLED','EXPIRED']);
/** This is a pure decision, not an authority source. T03 must supply fresh locked inputs. */
export function decideShiftChangeTransition({request:r,command:c,actor,evaluation,deadline}: TransitionInput): TransitionDecision {
  const refuse = (code: Extract<TransitionDecision,{status:'REFUSED'}>['code']): TransitionDecision => ({status:'REFUSED',code});
  if (c.requestId !== r.id || c.expectedRevision !== r.revision) return refuse('CONFLICT');
  if (terminal.has(r.status)) return refuse('TERMINAL');
  const manager = actor.role === 'OWNER' || actor.role === 'MANAGER';
  const requester = actor.id === r.requestedByEmployeeId;
  const target = actor.id === r.targetEmployeeId;
  const next = (nextStatus: typeof r.status, effects: TransitionEffect[] = []): TransitionDecision => ({status:'NEXT',nextStatus,revision:r.revision+1,effects:[...effects,...(terminal.has(nextStatus)?['RELEASE_PARTICIPATION' as const]:[]),'APPEND_EVENT']});
  if (c.kind === 'MANAGER_CLOSE' || c.kind === 'MANAGER_DECLINE') return manager ? next(c.kind === 'MANAGER_CLOSE'?'CANCELLED':'DENIED') : refuse('FORBIDDEN');
  if (c.kind === 'CANCEL') return requester ? next('CANCELLED') : refuse('FORBIDDEN');
  if (c.kind === 'DECLINE') return target && r.status === 'EMPLOYEE_PENDING' ? next('DENIED') : refuse('FORBIDDEN');
  // Withdrawal closes this lifecycle; a new offer must have fresh consent and identity.
  if (c.kind === 'WITHDRAW') return target && r.status === 'MANAGER_PENDING' ? next('CANCELLED',['CLEAR_TARGET_CONSENT']) : refuse('FORBIDDEN');
  if (c.kind !== 'ACCEPT' && c.kind !== 'MANAGER_APPROVE') return refuse('INVALID_TRANSITION');
  if (c.kind === 'MANAGER_APPROVE' && (!manager || r.status !== 'MANAGER_PENDING')) return refuse('FORBIDDEN');
  if (c.kind === 'ACCEPT' && (requester || (r.kind === 'SWAP' ? !target || r.status !== 'EMPLOYEE_PENDING' : r.status !== 'OPEN'))) return refuse('FORBIDDEN');
  if (evaluation.decision === 'BLOCKED' || evaluation.decision === 'UNVERIFIED') return refuse(evaluation.decision);
  if (deadline.status !== 'READY') return refuse('UNVERIFIED');
  if (!deadline.allowed) return refuse('DEADLINE');
  if (r.legacyManual) return refuse('LEGACY_MANUAL');
  if (!r.recordedApprovalMode || !r.effectiveApprovalMode) return refuse('UNVERIFIED');
  if ((!r.requesterConsent || r.requesterConsent.employeeId !== r.requestedByEmployeeId) && !(r.kind==='COVERAGE' && r.releaseAuthorization?.source.employeeId===r.requestedByEmployeeId)) return refuse('CONSENT_REQUIRED');
  const sameTerms = (a:ConsentSnapshot,b:ConsentSnapshot) => sameShiftTerms(a.source,b.source) && (a.target&&b.target?sameShiftTerms(a.target,b.target):a.target===b.target);
  if (c.kind === 'MANAGER_APPROVE' && (!r.targetConsent || r.targetConsent.employeeId !== r.targetEmployeeId || (r.requesterConsent?!sameTerms(r.requesterConsent,r.targetConsent):(!r.releaseAuthorization || !sameShiftTerms(r.releaseAuthorization.source,r.targetConsent.source))))) return refuse('CONSENT_REQUIRED');
  if (c.kind === 'MANAGER_APPROVE') return next('APPROVED',['APPLY_ASSIGNMENTS']);
  const manual = r.recordedApprovalMode === 'MANAGER_REVIEW' || r.effectiveApprovalMode === 'MANAGER_REVIEW' || evaluation.decision === 'MANAGER_REVIEW';
  return next(manual?'MANAGER_PENDING':'APPROVED',manual?['RECORD_TARGET_CONSENT']:['RECORD_TARGET_CONSENT','APPLY_ASSIGNMENTS']);
}
