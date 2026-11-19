import { describe, expect, it } from '@rstest/core';
import { publicAnalyticsUrl, redactAnalyticsEvent } from "./redact";

const origin = "https://nevora.example";

describe("publicAnalyticsUrl", () => {
  it.each([
    "/", "/login", "/activate", "/forgot-access", "/reset-access", "/welcome",
    "/privacy", "/terms", "/support", "/account-deletion", "/access-help", "/access-help/sign-in",
  ])("counts the public page %s", (path) => {
    expect(publicAnalyticsUrl(origin + path)).toBe(origin + path);
  });

  it("removes query strings, fragments and trailing slashes", () => {
    expect(publicAnalyticsUrl(`${origin}/reset-access?code=123456&returnTo=%2Fapp%2Femployees%2FE-1#step`)).toBe(`${origin}/reset-access`);
    expect(publicAnalyticsUrl(`${origin}/activate/?token=secret`)).toBe(`${origin}/activate`);
    expect(publicAnalyticsUrl(`${origin}/?utm_source=flyer`)).toBe(`${origin}/`);
  });

  it.each([
    "/app", "/app/employees/E-1001", "/app/schedule?week=2026-11-16", "/clocker/loc-1",
    "/api/healthz", "/healthz", "/ui-preview/home", "/dev-inspect", "/access-help/../app",
    "/access-help/Topic", "/login/extra", "/privacy.json",
  ])("never reports the non-public path %s", (path) => {
    expect(publicAnalyticsUrl(origin + path)).toBeNull();
  });

  it("drops malformed URLs", () => {
    expect(publicAnalyticsUrl("not a url")).toBeNull();
    expect(publicAnalyticsUrl("")).toBeNull();
  });
});

describe("redactAnalyticsEvent", () => {
  it("passes a redacted public page view", () => {
    expect(redactAnalyticsEvent({ type: "pageview", url: `${origin}/login?returnTo=%2Fapp` })).toEqual({ type: "pageview", url: `${origin}/login` });
  });

  it("drops portal page views and every custom event", () => {
    expect(redactAnalyticsEvent({ type: "pageview", url: `${origin}/app/timecards` })).toBeNull();
    expect(redactAnalyticsEvent({ type: "event", url: `${origin}/login` })).toBeNull();
  });
});
