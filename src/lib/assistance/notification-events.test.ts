import { describe, expect, it } from "vitest";
import {
  buildCalloutOutcomeNotification,
  buildCoverageInvitationNotification,
  buildExchangeOutcomeNotification,
  buildSchedulePublicationNotification,
  buildSwapResponseRequestedNotification,
  buildTimeOffOutcomeNotification,
} from "./notification-events";

describe("notification event builders", () => {
  it("builds a stable changed-schedule event for the affected employee", () => {
    const input = {
      employeeId: "E-1",
      revisionId: "rev-2",
      firstPublication: false,
      changed: true,
    };

    const first = buildSchedulePublicationNotification(input);
    const retry = buildSchedulePublicationNotification(input);

    expect(first).toEqual(retry);
    expect(first).toMatchObject({
      employeeId: "E-1",
      type: "SCHEDULE_CHANGED",
      title: "Schedule updated",
      actionHref: "/app/schedule",
    });
  });

  it("does not notify an unchanged employee on republish", () => {
    expect(
      buildSchedulePublicationNotification({
        employeeId: "E-1",
        revisionId: "rev-2",
        firstPublication: false,
        changed: false,
      }),
    ).toBeNull();
  });

  it("uses different event keys for different employees on the same source event", () => {
    const one = buildSchedulePublicationNotification({
      employeeId: "E-1",
      revisionId: "rev-2",
      firstPublication: true,
      changed: true,
    });
    const two = buildSchedulePublicationNotification({
      employeeId: "E-2",
      revisionId: "rev-2",
      firstPublication: true,
      changed: true,
    });

    expect(one?.eventKey).not.toBe(two?.eventKey);
  });

  it("routes time-off outcomes to the employee request history", () => {
    const approved = buildTimeOffOutcomeNotification({
      employeeId: "E-1",
      requestId: "request-1",
      status: "APPROVED",
    });
    const denied = buildTimeOffOutcomeNotification({
      employeeId: "E-1",
      requestId: "request-1",
      status: "DENIED",
    });

    expect(approved).toMatchObject({
      type: "TIME_OFF_APPROVED",
      actionHref: "/app/requests?tab=my",
    });
    expect(denied).toMatchObject({
      type: "TIME_OFF_DENIED",
      actionHref: "/app/requests?tab=my",
    });
    expect(approved.eventKey).not.toBe(denied.eventKey);
  });

  it("routes call-out outcomes to shift requests", () => {
    const event = buildCalloutOutcomeNotification({
      employeeId: "E-1",
      calloutId: "callout-1",
      status: "APPROVED",
    });

    expect(event).toMatchObject({
      type: "CALLOUT_APPROVED",
      actionHref: "/app/exchange?tab=requests",
    });
  });

  it("routes incoming swap-response requests to the requests tab", () => {
    const event = buildSwapResponseRequestedNotification({
      employeeId: "E-2",
      exchangeId: "exchange-1",
      requesterName: "Alex Rivera",
    });

    expect(event).toMatchObject({
      type: "SWAP_RESPONSE_REQUIRED",
      title: "Swap request",
      actionHref: "/app/exchange?tab=requests",
    });
  });

  it("routes resolved exchange outcomes to history", () => {
    const event = buildExchangeOutcomeNotification({
      employeeId: "E-1",
      exchangeId: "exchange-1",
      status: "APPROVED",
      kind: "SWAP",
    });

    expect(event).toMatchObject({
      type: "SWAP_APPROVED",
      actionHref: "/app/exchange?tab=history",
    });
  });
});

describe('routine event vocabulary compatibility',()=>{
  it('builds routine acknowledgement, availability and grouped review events through the existing assistance module', async()=>{
    const builders=await import('./notification-events');
    expect(builders.buildAcknowledgementReminderNotification('E-1','rev-1')).toMatchObject({employeeId:'E-1',type:'SCHEDULE_ACKNOWLEDGEMENT_REMINDER',actionHref:'/app/schedule'});
    expect(builders.buildAvailabilityReminderNotification('E-1','2026-10-05')).toMatchObject({employeeId:'E-1',type:'AVAILABILITY_REMINDER',actionHref:'/app/availability'});
    expect(builders.buildAvailabilitySummaryNotification('M-1','2026-10-05').eventKey).not.toBe(builders.buildAvailabilitySummaryNotification('M-2','2026-10-05').eventKey);
    expect(builders.buildManagerReviewNotification('M-1','summary',true).type).toBe('COVERAGE_ATTENTION');
    expect(builders.buildSelfTestNotification('E-1','test').actionHref).toBe('/app');
  });
});

// These assertions exercise consumer-visible event copy while protecting existing routes and event keys.
describe('NEVORA routine notifications', () => {
  it('brands schedule review without changing its source key or destination', async () => {
    const { buildAcknowledgementReminderNotification } = await import('./notification-events');
    expect(buildAcknowledgementReminderNotification('E-1', 'rev-1')).toEqual({
      employeeId: 'E-1', type: 'SCHEDULE_ACKNOWLEDGEMENT_REMINDER', title: 'Schedule review reminder',
      body: 'Open NEVORA to review and acknowledge your schedule.', actionHref: '/app/schedule',
      eventKey: 'schedule-reminder:rev-1:E-1',
    });
  });
  it('brands availability reminder and summary without changing their routing or identity', async () => {
    const { buildAvailabilityReminderNotification, buildAvailabilitySummaryNotification } = await import('./notification-events');
    expect(buildAvailabilityReminderNotification('E-1', '2026-10-05')).toEqual({
      employeeId: 'E-1', type: 'AVAILABILITY_REMINDER', title: 'Availability reminder',
      body: 'Open NEVORA to review and submit your availability.', actionHref: '/app/availability',
      eventKey: 'availability-reminder:2026-10-05:E-1',
    });
    expect(buildAvailabilitySummaryNotification('M-1', '2026-10-05')).toEqual({
      employeeId: 'M-1', type: 'AVAILABILITY_SUMMARY', title: 'Availability review',
      body: 'Open NEVORA to review availability.', actionHref: '/app/availability',
      eventKey: 'availability-summary:2026-10-05:M-1',
    });
  });
  it.each([false, true])('brands manager review with coverage=%s while preserving classification', async coverage => {
    const { buildManagerReviewNotification } = await import('./notification-events');
    expect(buildManagerReviewNotification('M-1', 'summary', coverage)).toEqual({
      employeeId: 'M-1', type: coverage ? 'COVERAGE_ATTENTION' : 'MANAGER_REVIEW',
      title: coverage ? 'Coverage needs attention' : 'Requests need review',
      body: 'Open NEVORA to review pending tasks.', eventKey: 'manager-review:summary:M-1',
    });
  });
  it('brands the self-test while preserving its portal destination and stable source key', async () => {
    const { buildSelfTestNotification } = await import('./notification-events');
    expect(buildSelfTestNotification('E-1', 'test')).toEqual({
      employeeId: 'E-1', type: 'SELF_TEST', title: 'NEVORA notification test',
      body: 'Open NEVORA to review your notification settings.', actionHref: '/app',
      eventKey: 'self-test:test:E-1',
    });
  });
});

it('uses privacy-safe generic swap copy when no requester name is supplied', () => {
  expect(buildSwapResponseRequestedNotification({ employeeId: 'QA-E', exchangeId: 'QA-x', requesterName: '' }).body).toBe('A teammate asked to trade shifts with you.');
});

it.each(['APPROVED','DENIED'] as const)('persists can’t-work wording for %s notifications',status=>{
 const event=buildCalloutOutcomeNotification({employeeId:'Fictional',calloutId:'fictional-request',status});
 expect(event.title).toBe(`Can’t-work request ${status==='APPROVED'?'approved':'declined'}`);
 expect(event.body).toBe(status==='APPROVED'?'Your can’t-work request was approved. The shift is now open for cover.':'Your can’t-work request was declined. It’s still your shift.');
 expect(event.eventKey).toBe(`callout:fictional-request:${status}:Fictional`);
 expect(event.title+' '+event.body).not.toMatch(/call.?out|denied|rejected/i);
});

it('keeps coverage invitation context and uses Shift lead without absence details',()=>{
 expect(buildCoverageInvitationNotification({employeeId:'E-1',date:'2030-01-01',startTime:'09:00',endTime:'17:00',locationName:'Fictional',positionName:'Server',isDesignatedLead:true})).toEqual({employeeId:'E-1',type:'COVERAGE_INVITATION',title:'Coverage available',body:'2030-01-01 · 09:00–17:00 · Fictional · Server · Shift lead. View shift details before volunteering.',eventKey:''});
});
