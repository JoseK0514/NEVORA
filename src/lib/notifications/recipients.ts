import { businessDate } from '../business-time';
import { NUVORA_BRAND } from "../brand";
import { randomUUID } from 'node:crypto';
import { addDays } from '../date-utils';
import { diffPublishedShifts } from '../assistance/publication-diff';
import { buildAcknowledgementState } from '../assistance/acknowledgement-state';
import {
  buildCoverageInvitationNotification,buildSchedulePublicationNotification, buildTimeOffOutcomeNotification, buildCalloutOutcomeNotification,
  buildSwapResponseRequestedNotification, buildExchangeOutcomeNotification, buildManagerReviewNotification,
  buildAvailabilityReminderNotification, buildAvailabilitySummaryNotification, buildSelfTestNotification,
  type NotificationEvent,
} from '../assistance/notification-events';
import { destinationForSource, isReviewRole, isSelfServiceRecipient, canAccessPublishedAssignment } from './destinations';
import { nextRoutineTime, notificationEventKey, planReminder, notificationBoundary, notificationShiftStart } from './policy';
import type { SourceSnapshot, RecipientAccess, PushEnvironment, NotificationPolicy, NotificationIntent, ScheduleSourceSnapshot } from './types';
const HOUR_MS = 3600000;
export function buildNotificationIntents(input: { before?: SourceSnapshot; after: SourceSnapshot; actorEmployeeId?: string; recipients: readonly RecipientAccess[]; environment: PushEnvironment; now: Date; policy: NotificationPolicy }): NotificationIntent[] {
  const { after, before, now, policy, environment, actorEmployeeId } = input;
  const shiftStart = (shift: {date:string;startTime:string;endTime:string}) => notificationShiftStart(shift,policy.timeZone);
  let destinationSource = after;
  if (after.kind === 'SCHEDULE' && before?.kind === 'SCHEDULE') {
    destinationSource = {...after, previousShifts:before.currentShifts};
  }
  const recipients = [...new Map(input.recipients.filter(recipient => recipient.active).map(recipient => [recipient.employeeId,recipient])).values()];
  const intents: NotificationIntent[] = [];
  function make(event: NotificationEvent, recipient: RecipientAccess, options: { expiresAt: number; dueAt?: number; purpose?: NotificationIntent['purpose']; urgency?: NotificationIntent['urgency']; effectiveVersion?: string; itemKeys?: readonly string[] }): NotificationIntent | null {
    if (!isReviewRole(recipient) && ((after.kind==='EXCHANGE' && !recipient.allowedLocationIds.includes(after.record.sourceShift.locationId)) || (after.kind==='CALLOUT' && !recipient.allowedLocationIds.includes(after.record.locationId)))) return null;
    const actionHref = destinationForSource(destinationSource,recipient);
    if (!actionHref || after.kind !== 'COMMUNICATION' && recipient.employeeId === actorEmployeeId) return null;
    const urgency = options.urgency ?? 'normal';
    const due = new Date(options.dueAt ?? now.getTime());
    const dueAt = urgency === 'high' ? due : nextRoutineTime(due,policy);
    if (!Number.isFinite(options.expiresAt) || dueAt.getTime() >= options.expiresAt) return null;
    const intent: NotificationIntent = {
      ...event, id:randomUUID(), actionHref, environment, source:after.source,
      effectiveVersion:options.effectiveVersion ?? after.source.version,
      purpose:options.purpose ?? 'EVENT', urgency, dueAt:dueAt.toISOString(), expiresAt:new Date(options.expiresAt).toISOString(), itemKeys:options.itemKeys,
    };
    intent.eventKey = notificationEventKey(intent);
    return intent;
  }
  // Pending-manager SUMMARY intents are collection seeds. The reminder processor
  // must group them under its manager/day lock before creating deliverable summaries.
  function review(recipient: RecipientAccess, coverageStart?: number) {
    if (!isReviewRole(recipient)) return;
    const high = coverageStart !== undefined && coverageStart >= now.getTime() && coverageStart - now.getTime() <= policy.urgentLeadHours * HOUR_MS;
    const intent = make(buildManagerReviewNotification(recipient.employeeId,after.source.id,coverageStart !== undefined),recipient,{
      expiresAt:Math.min(now.getTime()+72*HOUR_MS,coverageStart ?? Infinity),
      dueAt:high ? now.getTime() : now.getTime()+policy.managerCollectionMinutes*60000,
      purpose:'SUMMARY',urgency:high ? 'high' : 'normal',
    });
    if (intent) {
      if(after.kind==='EXCHANGE' && after.semanticNeedKey)intent.eventKey=[environment,'COVERAGE_ATTENTION',recipient.employeeId,after.semanticNeedKey,high?'URGENT':'ROUTINE'].join(':');
      intents.push(intent);
    }
  }
  if (after.kind === 'SCHEDULE') {
    const old: ScheduleSourceSnapshot | undefined = before?.kind === 'SCHEDULE' ? before : undefined;
    const previous = old?.currentShifts ?? after.previousShifts;
    for (const recipient of recipients) {
      const personalPrevious = previous.filter(shift => canAccessPublishedAssignment(recipient,shift));
      const personalCurrent = after.currentShifts.filter(shift => canAccessPublishedAssignment(recipient,shift));
      if ([...personalPrevious,...personalCurrent].some(shift=>!Number.isFinite(shiftStart(shift)))) continue;
      const personalChanges = diffPublishedShifts(personalPrevious,personalCurrent);
      const changed = personalChanges.length > 0;
      const firstPublication = changed && personalPrevious.length === 0;
      destinationSource = {...after,previousShifts:personalPrevious,currentShifts:personalCurrent};
      const supplied = after.employeePublications?.[recipient.employeeId];
      const inherited = old?.employeePublications?.[recipient.employeeId];
      const projection = supplied ?? inherited;
      const effectivePublication = inherited ?? (old && supplied?.effectiveVersion === after.revision.id ? undefined : supplied);
      const effectiveVersion = changed ? after.revision.id : effectivePublication?.effectiveVersion ?? old?.revision.id ?? after.revision.id;
      const publishedAt = changed ? after.revision.createdAt : effectivePublication?.publishedAt ?? old?.revision.createdAt ?? after.revision.createdAt;
      // The original effective revision comes from immutable history, never a global version bump.
      const anchor = Date.parse(publishedAt);
      const effective = effectiveVersion;
      const baseExpiry = Math.min(anchor+7*24*HOUR_MS,notificationBoundary(`${addDays(after.revision.weekStart,7)}T00:00`,policy.timeZone));
      const changedStarts = personalChanges.flatMap(change => [change.before,change.after]).filter(shift => shift?.employeeId === recipient.employeeId).map(shift => shiftStart(shift!)).filter(start => start >= now.getTime());
      const urgentStart = !firstPublication ? Math.min(...changedStarts.filter(start => start-now.getTime() <= policy.urgentLeadHours*HOUR_MS)) : Infinity;
      const event = buildSchedulePublicationNotification({employeeId:recipient.employeeId,revisionId:effective,firstPublication,changed});
      if (event) {
        const intent = make(event,recipient,{effectiveVersion:effective,expiresAt:Math.min(baseExpiry,urgentStart),urgency:Number.isFinite(urgentStart)?'high':'normal'});
        if (intent) intents.push(intent);
      }
      if (!isSelfServiceRecipient(recipient)) continue;
      // Without history, an unchanged republish cannot safely establish a new reminder budget.
      if (!changed && !projection && !old) continue;
      const acknowledgement = buildAcknowledgementState({
        employeeId:recipient.employeeId,latestRevisionId:after.revision.id,
        acknowledgementRevisionId:projection?.acknowledgement?.acknowledgedRevisionId,
        acknowledgedRevisionShifts:projection?.acknowledgedRevisionShifts?.filter(shift => canAccessPublishedAssignment(recipient,shift)),
        latestRevisionShifts:personalCurrent,
      });
      if (!acknowledgement.needsAcknowledgement) continue;
      const nextStart = Math.min(...personalCurrent.filter(shift => !shift.isCalloutApproved && shiftStart(shift) > now.getTime()).map(shiftStart));
      if (!Number.isFinite(nextStart) || !destinationForSource(destinationSource,recipient)) continue;
      const seed: NotificationIntent = {
        ...(event ?? {employeeId:recipient.employeeId,type:'SCHEDULE_PUBLISHED',title:'Schedule review',body:`Open ${NUVORA_BRAND.platformLabel} to review your schedule.`,eventKey:''}),
        id:randomUUID(),environment,source:after.source,effectiveVersion:effective,purpose:'EVENT',urgency:'normal',dueAt:new Date(anchor).toISOString(),expiresAt:new Date(Math.min(baseExpiry,nextStart)).toISOString(),actionHref:destinationForSource(destinationSource,recipient)!,
      };
      const reminder = planReminder({intent:seed,now,resolved:false,policy});
      if (reminder) intents.push(reminder);
    }
    return intents;
  }
  if (after.kind === 'AVAILABILITY') {
    const deadline = after.settings.availabilityDeadline ? Date.parse(after.settings.availabilityDeadline) : NaN;
    if (!Number.isFinite(deadline)) return [];
    const submitted = new Set(after.submissions.filter(row=>row.submitted).map(row=>row.employeeId));
    const missing = recipients.filter(recipient=>isSelfServiceRecipient(recipient) && !submitted.has(recipient.employeeId));
    if (now.getTime() < deadline) {
      for (const recipient of missing) {
        const seed = make(buildAvailabilityReminderNotification(recipient.employeeId,after.settings.weekStart),recipient,{expiresAt:deadline,purpose:'REMINDER'});
        const reminder = seed && planReminder({intent:seed,now,resolved:false,policy});
        if (reminder) intents.push(reminder);
      }
    } else if (missing.length) {
      for (const recipient of recipients.filter(isReviewRole)) {
        const intent = make(buildAvailabilitySummaryNotification(recipient.employeeId,after.settings.weekStart),recipient,{expiresAt:deadline+72*HOUR_MS,dueAt:deadline,purpose:'SUMMARY'});
        if (intent) intents.push(intent);
      }
    }
    return intents;
  }
  if (after.kind === 'MANAGER_SUMMARY') {
    const coverageTime = (dateTime: string) => notificationBoundary(dateTime,policy.timeZone);
    const relevant = after.items.filter(item => {
      if (item.type === 'COVERAGE_GAP') return item.dateTime !== undefined && coverageTime(item.dateTime) > now.getTime();
      return ['TIME_OFF','EXCHANGE','CALLOUT','AVAILABILITY_MISSING'].includes(item.type);
    });
    destinationSource = {...after, items:relevant};
    if (!relevant.length) return [];
    for (const recipient of recipients.filter(isReviewRole)) {
      const coverageStart = Math.min(...relevant.filter(item=>item.type==='COVERAGE_GAP' && item.dateTime).map(item=>coverageTime(item.dateTime!)).filter(start=>start>=now.getTime()));
      const high = coverageStart-now.getTime() <= policy.urgentLeadHours*HOUR_MS;
      const due = high ? now : nextRoutineTime(new Date(now.getTime()+policy.managerCollectionMinutes*60000),policy);
      const day = businessDate(due,policy.timeZone);
      const itemKeys = relevant.map(item=>[environment,after.weekStart,item.type,item.id,recipient.employeeId,day].map(encodeURIComponent).join(':')).sort();
      const intent = make(buildManagerReviewNotification(recipient.employeeId,after.source.id,relevant.some(item=>item.type==='COVERAGE_GAP')),recipient,{expiresAt:Math.min(Date.parse(after.expiresAt),coverageStart),dueAt:due.getTime(),purpose:'SUMMARY',urgency:high?'high':'normal',itemKeys});
      if (intent) {
        intent.eventKey = [environment,'MANAGER_SUMMARY',recipient.employeeId,day,...itemKeys].map(encodeURIComponent).join(':');
        intents.push(intent);
      }
    }
    return intents;
  }
  if (after.kind === 'COMMUNICATION') {
    if (environment !== 'test') return [];
    for (const recipient of recipients) {
      const intent=make({employeeId:recipient.employeeId,type:'COMMUNICATION',title:'NEVORA update',body:'Open NEVORA to review an update.',eventKey:''},recipient,{expiresAt:after.expiresAt?Date.parse(after.expiresAt):now.getTime()+30*24*HOUR_MS});
      if (intent) intents.push(intent);
    }
    return intents;
  }
  if (after.kind === 'SELF_TEST') {
    for (const recipient of recipients) {
      const intent = make(buildSelfTestNotification(recipient.employeeId,after.source.id),recipient,{expiresAt:Date.parse(after.expiresAt),purpose:'TEST'});
      if (intent) intents.push(intent);
    }
    return intents;
  }
  // Same status/version means no successful business transition occurred.
  if (before && before.kind === after.kind && 'record' in before && before.source.version === after.source.version) return [];
  for (const recipient of recipients) {
    let event: NotificationEvent | undefined;
    if (after.kind === 'TIME_OFF') {
      if (after.record.status === 'PENDING') { review(recipient); continue; }
      if (recipient.employeeId === after.record.employeeId && (after.record.status==='APPROVED'||after.record.status==='DENIED')) event = buildTimeOffOutcomeNotification({employeeId:recipient.employeeId,requestId:after.record.id,status:after.record.status});
    } else if (after.kind === 'CALLOUT') {
      if (after.record.status === 'PENDING') { review(recipient); continue; }
      if (recipient.employeeId === after.record.employeeId && (after.record.status==='APPROVED'||after.record.status==='DENIED')) event = buildCalloutOutcomeNotification({employeeId:recipient.employeeId,calloutId:after.record.id,status:after.record.status});
    } else if (after.kind === 'EXCHANGE') {
      if (after.record.status === 'MANAGER_PENDING') { review(recipient); continue; }
      if (after.record.status === 'OPEN') {
        if (isReviewRole(recipient)) { review(recipient,shiftStart(after.record.sourceShift)); continue; }
        if (isSelfServiceRecipient(recipient) && after.eligibleEmployeeIds?.includes(recipient.employeeId)) event=buildCoverageInvitationNotification({...after.record.sourceShift,employeeId:recipient.employeeId});
      }
      if (['CANCELLED','EXPIRED'].includes(after.record.status) && (recipient.employeeId===after.record.requestedByEmployeeId || recipient.employeeId===after.record.targetEmployeeId)) event={employeeId:recipient.employeeId,type:`${after.record.kind}_${after.record.status}`,title:after.record.status==='EXPIRED'?'Request expired':'Request cancelled',body:'Review the current request status.',eventKey:''};
      if (after.record.status==='EMPLOYEE_PENDING' && recipient.employeeId===after.record.targetEmployeeId) event = buildSwapResponseRequestedNotification({employeeId:recipient.employeeId,exchangeId:after.record.id,requesterName:after.record.requestedByName});
      if ((after.record.status==='APPROVED'||after.record.status==='DENIED') && (recipient.employeeId===after.record.requestedByEmployeeId || recipient.employeeId===after.record.targetEmployeeId)) event = buildExchangeOutcomeNotification({employeeId:recipient.employeeId,exchangeId:after.record.id,status:after.record.status,kind:after.record.kind});
    }
    if (!event) continue;
    const expiry = after.kind === 'EXCHANGE' && !['CANCELLED','EXPIRED'].includes(after.record.status) ? Math.min(now.getTime()+72*HOUR_MS,after.completionDeadline?Date.parse(after.completionDeadline):Infinity,shiftStart(after.record.sourceShift),after.record.targetShift ? shiftStart(after.record.targetShift):Infinity) : now.getTime()+72*HOUR_MS;
    const intent = make(event,recipient,{expiresAt:expiry});
    if (intent) intents.push(intent);
  }
  return intents;
}
