import "server-only";
import { readOnboardingConfig, readSignupOrigin, type DisabledConfig, type EnabledConfig } from "./config.server";
import { readSignupAdmission, type SignupAdmission } from "./admission.server";
import { verificationDelivery } from "./verification-delivery.server";

type Environment = Readonly<Record<string, string | undefined>>;

/** What the signup page may offer. The registration API stays the real gate: it refuses every address the current
 * admission does not allow, whatever this page shows.
 * - `open`: admission is explicitly open (the only public-signup switch) and mail can be sent.
 * - `private`: admission is limited to the approved test recipient and this is not production. The form is shown on the
 *   protected staging deployment with a "Private test" line, because the public config deliberately hides policy
 *   versions in this mode and the integration inbox still needs a real form to exercise.
 * - `closed`: everything else, including every production deployment that is not explicitly open. */
export type SignupPage =
  | { mode: "open" | "private"; termsVersion: string; privacyVersion: string; portalBaseDomain: string }
  | { mode: "closed" };

export function signupPageMode(config: EnabledConfig | DisabledConfig, senderConfigured: boolean, admission: SignupAdmission): SignupPage {
  if (!config.enabled || !senderConfigured) return { mode: "closed" };
  const versions = { termsVersion: config.termsVersion, privacyVersion: config.privacyVersion, portalBaseDomain: config.portalBaseDomain };
  if (admission.mode === "open") return { mode: "open", ...versions };
  if (admission.mode === "approved_recipient" && config.environment !== "production") return { mode: "private", ...versions };
  return { mode: "closed" };
}

export function readSignupPage(env: Environment = process.env): SignupPage {
  const config = readOnboardingConfig(env);
  return signupPageMode(config, config.enabled && verificationDelivery(env, config) !== null, readSignupAdmission(env));
}

/** The signup pages belong to the configured signup origin only. A company host (or any other host) that reaches one
 * of these paths gets a not-found page rather than a form whose writes the API would refuse anyway. */
export function onSignupHost(host: string | null, env: Environment = process.env): boolean {
  const origin = readSignupOrigin(env);
  return !!origin && !!host && new URL(origin).host === host.toLowerCase();
}

/** The portal base domain for showing and checking workplace addresses on the verified journey, or null when
 * onboarding is not configured here. */
export function signupPortalDomain(env: Environment = process.env): string | null {
  const config = readOnboardingConfig(env);
  return config.enabled ? config.portalBaseDomain : null;
}

/** Where the company-host activation page sends someone back to: the signup origin's verify page, which resumes from
 * the signup cookie. Null when this deployment has no valid signup origin. */
export function signupResumeUrl(env: Environment = process.env): string | null {
  const origin = readSignupOrigin(env);
  return origin ? origin + "/onboarding/verify" : null;
}
