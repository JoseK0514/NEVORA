import { describe, expect, it } from "@rstest/core";
import type { EnabledConfig } from "./config.server";
import { onSignupHost, signupPageMode, signupResumeUrl } from "./signup-page.server";

const config = { enabled: true, environment: "development", termsVersion: "terms-1", privacyVersion: "privacy-1", portalBaseDomain: "portal.example" } as unknown as EnabledConfig;
const versions = { termsVersion: "terms-1", privacyVersion: "privacy-1", portalBaseDomain: "portal.example" };

describe("signupPageMode: public signup stays closed unless admission is explicitly open", () => {
  it("closes when onboarding is off or mail cannot be sent", () => {
    expect(signupPageMode({ enabled: false, reason: "disabled" }, true, { mode: "open" })).toEqual({ mode: "closed" });
    expect(signupPageMode(config, false, { mode: "open" })).toEqual({ mode: "closed" });
  });
  it("closes for closed admission in every environment", () => {
    for (const environment of ["test", "development", "production"]) expect(signupPageMode({ ...config, environment } as EnabledConfig, true, { mode: "closed" })).toEqual({ mode: "closed" });
  });
  it("offers a private test form for the approved recipient outside production only", () => {
    expect(signupPageMode(config, true, { mode: "approved_recipient", email: "test@example.invalid" })).toEqual({ mode: "private", ...versions });
    expect(signupPageMode({ ...config, environment: "production" } as EnabledConfig, true, { mode: "approved_recipient", email: "test@example.invalid" })).toEqual({ mode: "closed" });
  });
  it("opens only for explicit open admission", () => {
    expect(signupPageMode(config, true, { mode: "open" })).toEqual({ mode: "open", ...versions });
  });
});

describe("signup host", () => {
  const env = { NEVORA_SIGNUP_ORIGIN: "https://signup.example.invalid", NEVORA_ONBOARDING_ENVIRONMENT: "production" };
  it("matches only the configured signup origin's host", () => {
    expect(onSignupHost("signup.example.invalid", env)).toBe(true);
    expect(onSignupHost("SIGNUP.example.invalid", env)).toBe(true);
    expect(onSignupHost("alpha.portal.example", env)).toBe(false);
    expect(onSignupHost(null, env)).toBe(false);
    expect(onSignupHost("signup.example.invalid", {})).toBe(false);
  });
  it("sends the company-host activation page back to the signup verify page", () => {
    expect(signupResumeUrl(env)).toBe("https://signup.example.invalid/onboarding/verify");
    expect(signupResumeUrl({})).toBeNull();
  });
});
