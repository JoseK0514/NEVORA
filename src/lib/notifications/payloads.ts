import { createHash } from 'node:crypto';
import type { NotificationIntent, PushEnvelope } from './types';
const REQUEST_TYPES = new Set(['TIME_OFF_APPROVED','TIME_OFF_DENIED','CALLOUT_APPROVED','CALLOUT_DENIED','SWAP_RESPONSE_REQUIRED','SWAP_APPROVED','SWAP_DENIED','COVERAGE_APPROVED','COVERAGE_DENIED','AVAILABILITY_REMINDER','AVAILABILITY_SUMMARY','MANAGER_REVIEW','SELF_TEST']);
export function buildPushEnvelope(intent: NotificationIntent, ownershipGeneration: string): PushEnvelope {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(ownershipGeneration) || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(intent.id) || !Number.isFinite(Date.parse(intent.expiresAt))) throw new Error('Invalid push envelope metadata');
  let title: string;
  let body: string;
  if (intent.type === 'SCHEDULE_PUBLISHED' || intent.type === 'SCHEDULE_ACKNOWLEDGEMENT_REMINDER') {
    title='Your Fuel Schedule Is Ready'; body='Open Fuel to review your schedule.';
  } else if (intent.type === 'SCHEDULE_CHANGED') {
    title='Your Fuel Schedule Changed'; body='Open Fuel to review your schedule.';
  } else if (intent.type === 'COVERAGE_ATTENTION') {
    title='Coverage Needs Attention'; body='Open Fuel to review coverage.';
  } else if (REQUEST_TYPES.has(intent.type)) {
    title='Fuel Request Update'; body='Open Fuel to review your pending task.';
  } else throw new Error('Unsupported notification kind');
  return {
    notificationId:intent.id,kind:intent.type,ownershipGeneration,expiresAt:new Date(intent.expiresAt).toISOString(),
    tag:`fuel-${createHash('sha256').update(intent.eventKey).digest('hex').slice(0,32)}`,title,body,
  };
}
