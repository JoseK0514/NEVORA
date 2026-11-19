import { describe, expect, it } from "@rstest/core";
import type { EnabledConfig } from "./config.server";
import { onSignupHost, readSignupPage, signupPageMode, signupResumeUrl } from "./signup-page.server";

const config = { enabled: true, environment: "development", termsVersion: "terms-1", privacyVersion: "privacy-1", portalBaseDomain: "portal.example" } as unknown as EnabledConfig;
const versions = { termsVersion: "terms-1", privacyVersion: "privacy-1", portalBaseDomain: "portal.example" };

describe("signupPageMode: public signup stays closed unless admission is explicitly open", () => {
  it("closes when onboarding is off or mail cannot be sent", () => {
    expect(signupPageMode({ enabled: false, reason: "disabled" }, true, { mode: "open" }, true)).toEqual({ mode: "closed" });
    expect(signupPageMode(config, false, { mode: "open" }, true)).toEqual({ mode: "closed" });
  });
  it("closes for closed admission in every environment", () => {
    for (const environment of ["test", "development", "production"]) expect(signupPageMode({ ...config, environment } as EnabledConfig, true, { mode: "closed" }, false)).toEqual({ mode: "closed" });
  });
  it("offers a private test form for the approved recipient outside production only", () => {
    expect(signupPageMode(config, true, { mode: "approved_recipient", email: "test@example.invalid" }, false)).toEqual({ mode: "private", ...versions });
    expect(signupPageMode({ ...config, environment: "production" } as EnabledConfig, true, { mode: "approved_recipient", email: "test@example.invalid" }, false)).toEqual({ mode: "closed" });
  });
  it("opens only for explicit open admission, never for the API's unset default", () => {
    expect(signupPageMode(config, true, { mode: "open" }, true)).toEqual({ mode: "open", ...versions });
    expect(signupPageMode(config, true, { mode: "open" }, false)).toEqual({ mode: "closed" });
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

describe("readSignupPage composes the real configuration readers", () => {
  const key = (n: number) => Buffer.alloc(32, n).toString("base64url");
  const base = {
    NEVORA_ONBOARDING_ENABLED: "true", NEVORA_ONBOARDING_ENVIRONMENT: "development", NEVORA_SIGNUP_ORIGIN: "http://localhost:3100",
    NEVORA_PORTAL_BASE_DOMAIN: "portal.example.test", NEVORA_CONTROL_DATABASE_URL: "postgresql://fictional@127.0.0.1:5432/fictional_control",
    NEVORA_SIGNUP_SESSION_SECRET: key(7), NEVORA_WORKSPACE_TOKEN_SECRET: key(8), NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY: key(9),
    NEVORA_ONBOARDING_RETENTION_DAYS: "7", NEVORA_ONBOARDING_OPERATOR_REF: "fictional-operator", NEVORA_ONBOARDING_VERIFICATION_PLATFORM_LIMIT_15M: "100",
    NEVORA_ONBOARDING_REGION: "aws-us-east-1", NEVORA_ONBOARDING_TERMS_VERSION: "terms-1", NEVORA_ONBOARDING_PRIVACY_VERSION: "privacy-1",
    NEVORA_ONBOARDING_EMAIL_ENABLED: "true", FUEL_PORTAL_ORIGIN: "http://localhost:3100", NEVORA_RECOVERY_SMTP_HOST: "127.0.0.1",
    NEVORA_RECOVERY_SMTP_PORT: "2526", NEVORA_RECOVERY_FROM: "noreply@example.test",
  };
  it("is closed for an unset admission mode even though the API would admit everyone", () => {
    expect(readSignupPage(base).mode).toBe("closed");
  });
  it("is open only for the written open mode", () => {
    expect(readSignupPage({ ...base, NEVORA_ONBOARDING_ADMISSION_MODE: "open" }).mode).toBe("open");
    expect(readSignupPage({ ...base, NEVORA_ONBOARDING_ADMISSION_MODE: "closed" }).mode).toBe("closed");
  });
  it("is a private test for the approved recipient outside production, and closed without mail", () => {
    expect(readSignupPage({ ...base, NEVORA_ONBOARDING_ADMISSION_MODE: "approved_recipient", NEVORA_STAGING_EMAIL_RECIPIENT: "owner@example.test" }).mode).toBe("private");
    expect(readSignupPage({ ...base, NEVORA_ONBOARDING_ADMISSION_MODE: "open", NEVORA_ONBOARDING_EMAIL_ENABLED: "false" }).mode).toBe("closed");
  });
});
