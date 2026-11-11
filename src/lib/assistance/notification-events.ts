import { NUVORA_BRAND } from "../brand";
export type NotificationEvent = {
  employeeId: string;
  type: string;
  title: string;
  body: string;
  actionHref?: string;
  eventKey: string;
};

function eventKey(...parts: string[]) {
  return parts.join(":");
}

export function buildSchedulePublicationNotification(input: {
  employeeId: string;
  revisionId: string;
  firstPublication: boolean;
  changed: boolean;
}): NotificationEvent | null {
  if (!input.firstPublication && !input.changed) {
    return null;
  }

  const changed = !input.firstPublication;

  return {
    employeeId: input.employeeId,
    type: changed ? "SCHEDULE_CHANGED" : "SCHEDULE_PUBLISHED",
    title: changed ? "Schedule updated" : "Schedule published",
    body: changed
      ? "Your published schedule changed. Review your latest shifts."
      : "Your schedule is ready to review and acknowledge.",
    actionHref: "/app/schedule",
    eventKey: eventKey("schedule", input.revisionId, input.employeeId),
  };
}

export function buildTimeOffOutcomeNotification(input: {
  employeeId: string;
  requestId: string;
  status: "APPROVED" | "DENIED";
}): NotificationEvent {
  const approved = input.status === "APPROVED";

  return {
    employeeId: input.employeeId,
    type: approved ? "TIME_OFF_APPROVED" : "TIME_OFF_DENIED",
    title: approved ? "Time off approved" : "Time off declined",
    body: approved
      ? "Your time-off request was approved."
      : "Your time-off request was declined. Review the request for details.",
    actionHref: "/app/requests?tab=my",
    eventKey: eventKey(
      "time-off",
      input.requestId,
      input.status,
      input.employeeId,
    ),
  };
}

export function buildCalloutOutcomeNotification(input: {
  employeeId: string;
  calloutId: string;
  status: "APPROVED" | "DENIED";
}): NotificationEvent {
  const approved = input.status === "APPROVED";

  return {
    employeeId: input.employeeId,
    type: approved ? "CALLOUT_APPROVED" : "CALLOUT_DENIED",
    title: approved ? "Can’t-work request approved" : "Can’t-work request declined",
    body: approved
      ? "Your can’t-work request was approved. The shift is now open for cover."
      : "Your can’t-work request was declined. It’s still your shift.",
    actionHref: "/app/exchange?tab=requests",
    eventKey: eventKey(
      "callout",
      input.calloutId,
      input.status,
      input.employeeId,
    ),
  };
}

export function buildSwapResponseRequestedNotification(input: {
  employeeId: string;
  exchangeId: string;
  requesterName: string;
}): NotificationEvent {
  return {
    employeeId: input.employeeId,
    type: "SWAP_RESPONSE_REQUIRED",
    title: "Swap request",
    body: `${input.requesterName.trim() || 'A teammate'} asked to trade shifts with you.`,
    actionHref: "/app/exchange?tab=requests",
    eventKey: eventKey("swap-response", input.exchangeId, input.employeeId),
  };
}

export function buildExchangeOutcomeNotification(input: {
  employeeId: string;
  exchangeId: string;
  status: "APPROVED" | "DENIED";
  kind: "COVERAGE" | "SWAP";
}): NotificationEvent {
  const approved = input.status === "APPROVED";
  const noun = input.kind === "SWAP" ? "Swap" : "Coverage request";

  return {
    employeeId: input.employeeId,
    type: `${input.kind}_${input.status}`,
    title: `${noun} ${approved ? "approved" : "declined"}`,
    body: approved
      ? `Your ${noun.toLowerCase()} was approved.`
      : `Your ${noun.toLowerCase()} was declined.`,
    actionHref: "/app/exchange?tab=history",
    eventKey: eventKey(
      "exchange",
      input.exchangeId,
      input.status,
      input.employeeId,
    ),
  };
}

/** Routine workflow events share this vocabulary with the durable outbox. */
export function buildAcknowledgementReminderNotification(employeeId: string, revisionId: string): NotificationEvent {
  return { employeeId, type: 'SCHEDULE_ACKNOWLEDGEMENT_REMINDER', title: 'Schedule review reminder', body: `Open ${NUVORA_BRAND.platformLabel} to review and acknowledge your schedule.`, actionHref: '/app/schedule', eventKey: eventKey('schedule-reminder',revisionId,employeeId) };
}
export function buildAvailabilityReminderNotification(employeeId: string, weekStart: string): NotificationEvent {
  return { employeeId, type: 'AVAILABILITY_REMINDER', title: 'Availability reminder', body: `Open ${NUVORA_BRAND.platformLabel} to review and submit your availability.`, actionHref: '/app/availability', eventKey: eventKey('availability-reminder',weekStart,employeeId) };
}
export function buildManagerReviewNotification(employeeId: string, sourceId: string, coverage = false): NotificationEvent {
  return { employeeId, type: coverage ? 'COVERAGE_ATTENTION' : 'MANAGER_REVIEW', title: coverage ? 'Coverage needs attention' : 'Requests need review', body: `Open ${NUVORA_BRAND.platformLabel} to review pending tasks.`, eventKey: eventKey('manager-review',sourceId,employeeId) };
}
export function buildAvailabilitySummaryNotification(employeeId: string, weekStart: string): NotificationEvent {
  return { employeeId, type: 'AVAILABILITY_SUMMARY', title: 'Availability review', body: `Open ${NUVORA_BRAND.platformLabel} to review availability.`, actionHref: '/app/availability', eventKey: eventKey('availability-summary',weekStart,employeeId) };
}
export function buildSelfTestNotification(employeeId: string, sourceId: string): NotificationEvent {
  return { employeeId, type: 'SELF_TEST', title: `${NUVORA_BRAND.platformLabel} notification test`, body: `Open ${NUVORA_BRAND.platformLabel} to review your notification settings.`, actionHref: '/app', eventKey: eventKey('self-test',sourceId,employeeId) };
}

/** Peer invitation uses reviewed shift context only, never an absence reason. */
export function buildCoverageInvitationNotification(input:{employeeId:string;date:string;startTime:string;endTime:string;locationName:string;positionName?:string;isDesignatedLead?:boolean}):NotificationEvent {
 const context=[input.date,`${input.startTime}–${input.endTime}`,input.locationName,input.positionName,input.isDesignatedLead?'Shift lead':undefined].filter(Boolean).join(' · ');
 return {employeeId:input.employeeId,type:'COVERAGE_INVITATION',title:'Coverage available',body:`${context}. View shift details before volunteering.`,eventKey:''};
}
