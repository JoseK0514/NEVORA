import { NUVORA_BRAND } from "../brand";
import { createHash } from 'node:crypto';
import type { NotificationIntent, PushEnvelope } from './types';
export const REQUEST_PUSH_KINDS = ['TIME_OFF_APPROVED','TIME_OFF_DENIED','CALLOUT_APPROVED','CALLOUT_DENIED','SWAP_RESPONSE_REQUIRED','SWAP_APPROVED','SWAP_DENIED','COVERAGE_APPROVED','COVERAGE_DENIED','COVERAGE_INVITATION','COVERAGE_CANCELLED','COVERAGE_EXPIRED','SWAP_CANCELLED','SWAP_EXPIRED','AVAILABILITY_REMINDER','AVAILABILITY_SUMMARY','PAYROLL_PREPARATION','PAYROLL_STATEMENT','MANAGER_REVIEW','SELF_TEST'] as const;
const REQUEST_TYPES = new Set<string>(REQUEST_PUSH_KINDS);
/** Every kind buildPushEnvelope can send. public/fuel-portal-sw.js must accept each one (service-worker.test.ts checks). */
export const PUSH_KINDS = ['COMMUNICATION', 'SCHEDULE_PUBLISHED', 'SCHEDULE_ACKNOWLEDGEMENT_REMINDER', 'SCHEDULE_CHANGED', 'COVERAGE_ATTENTION', ...REQUEST_PUSH_KINDS] as const;
/** Build the bounded service-worker envelope from supported intent kinds. Copy is
 * deliberately generic and excludes source/financial details; ownership generation
 * fences device display and the event-key hash supplies a stable replacement tag. */
export function buildPushEnvelope(intent: NotificationIntent, ownershipGeneration: string): PushEnvelope {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(ownershipGeneration) || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(intent.id) || !Number.isFinite(Date.parse(intent.expiresAt))) throw new Error('Invalid push envelope metadata');
  let title: string;
  let body: string;
  if (intent.type === 'COMMUNICATION' && intent.source.kind === 'COMMUNICATION' && intent.purpose === 'EVENT') {
    title='NEVORA update'; body='Open NEVORA to review an update.';
  } else if (intent.type === 'SCHEDULE_PUBLISHED' || intent.type === 'SCHEDULE_ACKNOWLEDGEMENT_REMINDER') {
    title=`Your ${NUVORA_BRAND.platformLabel} Schedule Is Ready`; body=`Open ${NUVORA_BRAND.platformLabel} to review your schedule.`;
  } else if (intent.type === 'SCHEDULE_CHANGED') {
    title=`Your ${NUVORA_BRAND.platformLabel} Schedule Changed`; body=`Open ${NUVORA_BRAND.platformLabel} to review your schedule.`;
  } else if (intent.type === 'COVERAGE_ATTENTION') {
    title='Coverage Needs Attention'; body=`Open ${NUVORA_BRAND.platformLabel} to review coverage.`;
  } else if (REQUEST_TYPES.has(intent.type)) {
    title=`${NUVORA_BRAND.platformLabel} Request Update`; body=`Open ${NUVORA_BRAND.platformLabel} to review your pending task.`;
  } else throw new Error('Unsupported notification kind');
  return {
    notificationId:intent.id,kind:intent.type,ownershipGeneration,expiresAt:new Date(intent.expiresAt).toISOString(),
    tag:`fuel-${createHash('sha256').update(intent.eventKey).digest('hex').slice(0,32)}`,title,body,
  };
}
