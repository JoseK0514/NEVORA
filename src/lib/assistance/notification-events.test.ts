import { describe, expect, it } from "vitest";
import {
  buildCalloutOutcomeNotification,
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
