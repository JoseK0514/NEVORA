import { describe, expect, it } from "vitest";
import { accessAt, parseSignup, planFor } from "./model";
const start = Date.parse("2026-11-07T12:00:00Z");
const base = {
  trialEnd: start + 30 * 86400000,
  paidThrough: null,
  pastDueSince: null,
  subscriptionStatus: null,
};
describe("commerce access", () => {
  it("ends the trial at its exact deadline without granting another trial", () => {
    expect(accessAt(base, base.trialEnd - 1).operational).toBe(true);
    expect(accessAt(base, base.trialEnd).state).toBe("restricted");
  });
  it("keeps prepaid access after cancellation, then restricts", () => {
    const record = {
      ...base,
      subscriptionStatus: "canceled",
      paidThrough: base.trialEnd + 86400000,
    };
    expect(accessAt(record, base.trialEnd).state).toBe("paid");
    expect(accessAt(record, record.paidThrough).operational).toBe(false);
  });
  it("limits failed renewal grace to seven days and never grants it on failed first payment", () => {
    const record = {
      ...base,
      subscriptionStatus: "past_due",
      paidThrough: base.trialEnd,
      pastDueSince: base.trialEnd,
    };
    expect(accessAt(record, base.trialEnd + 6 * 86400000).state).toBe("grace");
    expect(accessAt(record, base.trialEnd + 7 * 86400000).state).toBe(
      "restricted",
    );
    expect(
      accessAt({ ...record, paidThrough: null }, base.trialEnd + 1).operational,
    ).toBe(false);
  });
  it("does not treat an active subscription or a checkout return as proof of payment", () => {
    expect(
      accessAt({ ...base, subscriptionStatus: "active" }, base.trialEnd)
        .operational,
    ).toBe(false);
  });
  it("enforces seat bands with server selected amounts", () => {
    expect(planFor(15)).toEqual({ key: "small", employees: 15, amount: 1900 });
    expect(planFor(16).amount).toBe(2900);
    for (const count of [0, -1, 1.1, 31, NaN])
      expect(() => planFor(count)).toThrow();
  });
});
describe("signup validation", () => {
  const input = {
    email: "owner@example.test",
    password: "fictional-password-123",
    firstName: "Taylor",
    lastName: "Example",
    phone: "7875550101",
    businessName: "Example Shop",
    timeZone: "America/Puerto_Rico",
    locationName: "Main",
    employeeCount: 10,
  };
  it("normalizes email and validates a real named timezone", () => {
    expect(parseSignup({ ...input, email: " OWNER@EXAMPLE.TEST " }).email).toBe(
      "owner@example.test",
    );
    expect(() => parseSignup({ ...input, timeZone: "Not/AZone" })).toThrow();
    expect(() => parseSignup({ ...input, timeZone: "+05:00" })).toThrow();
    expect(() => parseSignup({ ...input, timeZone: "Etc/GMT+5" })).toThrow();
  });
  it("rejects oversized credentials and control characters before password hashing", () => {
    expect(() =>
      parseSignup({ ...input, password: "x".repeat(257) }),
    ).toThrow();
    expect(() =>
      parseSignup({ ...input, businessName: "Bad\nName" }),
    ).toThrow();
    expect(() => parseSignup({ ...input, employeeCount: 99 })).toThrow();
  });
});
