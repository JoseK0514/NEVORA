// U11 (Nov 17, 2026): every recovery state in English and Spanish. The request and reset contracts themselves (fields,
// lengths, the hedged acceptance, the proof's custody) are covered by account-recovery.test.tsx and are not touched here.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RecoveryRequest } from "./recovery-request";
import { RecoveryReset } from "./recovery-reset";
import { AssistedRecovery } from "./assisted-recovery";
import { ACCESS_COPY, fill } from "./access-recovery/copy";
import { OFFLINE_MESSAGE } from "./access-recovery/recovery-guidance";
import { AUTH_COPY, authMessage } from "@/lib/auth-copy";

const REFERENCE = "3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const ACCEPTED = "If the details match an active account, we’ll email recovery steps. Can’t use that email? Ask your manager or Owner for help.";
const FAILED = "Recovery could not be confirmed. Keep your current access and try again.";
const UNAVAILABLE = "Recovery is unavailable. Try again or contact your manager for assisted recovery.";
const INVALID = "This recovery code has expired, was already used, or cannot be verified. Request a new code or contact your manager.";
const UNCERTAIN = "The reset outcome could not be confirmed. Try signing in with your new password before requesting another code.";
const RESET = "Password reset. You’re signed out on every device. Sign in with your new password.";
type Lang = "en" | "es";
const request = (lang: Lang, props: Partial<Parameters<typeof RecoveryRequest>[0]> = {}) => renderToStaticMarkup(<RecoveryRequest hydrated busy={false} done={false} message="" onSubmit={() => {}} lang={lang} {...props} />);
const reset = (lang: Lang, props: Partial<Parameters<typeof RecoveryReset>[0]> = {}) => renderToStaticMarkup(<RecoveryReset hydrated busy={false} done={false} message="" onSubmit={() => {}} proofRef={() => {}} lang={lang} {...props} />);
const step = (lang: Lang, n: number) => fill(ACCESS_COPY[lang].steps.of, { n, total: 3 });
const ENGLISH = /Step \d|password|Sign in|recovery|Employee ID|offline|Support reference|email|Check your|code/i;
const text = (html: string) => html.replace(/<[^>]+>/g, " ");

describe.each(["en", "es"] as const)("forgot password in %s", lang => {
  const t = AUTH_COPY[lang], u = ACCESS_COPY[lang].recovery;

  it("before you start: step 1 and what will happen, in order", () => {
    const html = request(lang);
    expect(html).toContain(step(lang, 1));
    expect(html).toContain(`<ol class="ar-before" aria-label="${u.beforeLabel}">`);
    const at = u.before.map(line => html.indexOf(line));
    expect(at.every(index => index > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html).toContain(t.requestRecovery);
  });

  it("check your email: an email was asked for, never that it was sent or arrived", () => {
    const html = request(lang, { done: true, message: ACCEPTED });
    for (const line of [t.checkEmail.title, u.requestedSub, authMessage(lang, ACCEPTED), u.notConfirmed, t.checkEmail.expires, t.checkEmail.nothing, u.askAgain, t.backToSignIn, step(lang, 2)]) expect(html).toContain(line);
    expect(html).toMatch(/class="q-auth__receipt" role="status" tabindex="-1"/);
    expect(text(html)).not.toMatch(/Email sent|was sent to|We sent|has been sent|Correo enviado|Te enviamos el|Ya enviamos/i);
    expect(html).not.toContain("<form");
  });

  it.each([[FAILED, "requestFailed"], [UNAVAILABLE, "requestUnavailable"], ["Your access ended. Sign in again.", "ended"]] as const)("refusal %s: what happened, then what to do next", (message, key) => {
    const html = request(lang, { message, supportReference: REFERENCE });
    expect(html).toContain(authMessage(lang, message));
    expect(html).toContain(`<span class="ar-alert__next">${u.next[key]}</span>`);
    expect(html).toContain('id="recovery-error" class="q-error q-auth__alert" role="alert" tabindex="-1"');
    // The form stays for another try, and the reference of this one reply shows under the message.
    expect(html).toContain('name="employeeId"');
    expect(html).toContain(REFERENCE);
    expect(request(lang, { message })).not.toContain("ar-ref");
  });

  it("offline: nothing was sent, amber, no Support reference", () => {
    const html = request(lang, { message: OFFLINE_MESSAGE, supportReference: REFERENCE });
    expect(html).toMatch(new RegExp(`id="recovery-offline" class="q-auth__alert q-auth__alert--wait" role="alert" tabindex="-1"><svg[^>]*>.*?</svg><span>${u.offline}</span>`));
    expect(html).toContain('aria-describedby="recovery-offline recovery-employee-id-invalid"');
    expect(html).not.toContain('id="recovery-error"');
    expect(html).not.toContain("q-error q-auth__alert");
    expect(html).not.toContain(REFERENCE);
  });
});

describe.each(["en", "es"] as const)("new password in %s", lang => {
  const t = AUTH_COPY[lang], u = ACCESS_COPY[lang].recovery;

  it("the form: step 3, the code, two passwords and the live checks", () => {
    const html = reset(lang);
    for (const line of [step(lang, 3), t.recoveryCode, t.newPassword, t.atLeast8, t.resetPassword]) expect(html).toContain(line);
    expect(html).toMatch(/<span class="q-auth__invalid"><svg[^>]*width="16" height="16"[^>]*>.*?<\/svg><span id="reset-proof-invalid"><\/span><\/span>/);
  });

  it("passwords differ: said once at the top with the next step", () => {
    const html = reset(lang, { message: "Passwords do not match." });
    for (const line of [t.checkPasswords, authMessage(lang, "Passwords do not match."), u.next.mismatch]) expect(html).toContain(line);
    expect(html).toContain("q-auth__receipt--error");
  });

  it("code expired, used or not valid: red, with a way to ask for a new one", () => {
    const html = reset(lang, { message: INVALID });
    for (const line of [t.useNewCode, authMessage(lang, INVALID), u.next.invalidCode, t.requestNewCode]) expect(html).toContain(line);
    expect(html).toContain("q-auth__receipt--error");
    expect(html).toContain('href="/forgot-access"');
  });

  it("reply lost: not confirmed is amber, never failed and never done; sign in first", () => {
    const html = reset(lang, { message: UNCERTAIN });
    for (const line of [t.checkSignInFirst, authMessage(lang, UNCERTAIN), t.trySigningIn]) expect(html).toContain(line);
    expect(html).toContain("q-auth__receipt q-auth__receipt--wait");
    expect(html).not.toContain("q-auth__receipt--error");
    expect(html).not.toContain(t.resetDoneTitle);
    expect(html).toContain('href="/login"');
  });

  it("server could not confirm (503): amber, hedged, and a Support reference when there is one", () => {
    const html = reset(lang, { message: FAILED, supportReference: REFERENCE });
    for (const line of [t.resetNotConfirmed, u.next.resetUnavailable, REFERENCE]) expect(html).toContain(line);
    expect(html).toContain("q-auth__receipt--wait");
    expect(text(html)).not.toMatch(/was not changed|no cambió\./);
  });

  it("offline: nothing was sent, the code is not spent", () => {
    const html = reset(lang, { message: OFFLINE_MESSAGE });
    expect(html).toContain(u.offline);
    expect(html).toContain("q-auth__alert--wait");
    expect(html).toContain('name="proof"');
  });

  it("done: what changed, what did not, and the next step", () => {
    const html = reset(lang, { done: true, message: RESET });
    for (const line of [t.resetDoneTitle, t.reset.doneLine, u.doneNote, t.signIn]) expect(html).toContain(line);
    expect(html).toMatch(/class="q-auth__receipt" role="status" tabindex="-1"/);
    expect(html).toMatch(/<span class="q-auth__mark" aria-hidden="true"><svg/);
    expect(html).not.toContain("<form");
  });
});

it("Spanish recovery pages show no English in any state", () => {
  const pages = [request("es"), request("es", { done: true, message: ACCEPTED }), request("es", { message: FAILED, supportReference: REFERENCE }), request("es", { message: UNAVAILABLE }), request("es", { message: OFFLINE_MESSAGE }),
    reset("es"), reset("es", { message: "Passwords do not match." }), reset("es", { message: INVALID }), reset("es", { message: UNCERTAIN }), reset("es", { message: FAILED, supportReference: REFERENCE }), reset("es", { message: OFFLINE_MESSAGE }), reset("es", { done: true, message: RESET })];
  for (const [index, html] of pages.entries()) expect(text(html.replace(/<noscript>.*?<\/noscript>/g, "")), `page ${index}`).not.toMatch(ENGLISH);
});

describe("help someone sign in (signed in: English on screen, Spanish proven here)", () => {
  const issued = { proof: "A".repeat(43), expiresAt: "2026-11-17T16:30:00Z", employeeId: "QA-MARIA" };
  const assisted = (lang: Lang, props: Partial<Parameters<typeof AssistedRecovery>[0]> = {}) => renderToStaticMarkup(<AssistedRecovery hydrated busy={false} message="" issued={null} timeZone="America/Puerto_Rico" onSubmit={() => {}} onStartAgain={() => {}} lang={lang} {...props} />);

  it.each(["en", "es"] as const)("before: the three steps, how long a code lasts and who can't be helped this way, in %s", lang => {
    const u = ACCESS_COPY[lang].assisted, html = assisted(lang);
    for (const line of [u.howLabel, ...u.how, u.lasts, u.limits]) expect(html).toContain(line);
    expect(html).toContain('<section class="ar-how b-card" aria-labelledby="assisted-how-title">');
  });

  it.each(["en", "es"] as const)("with a code: what the helper does, what the other person does, and until when, in %s", lang => {
    const u = ACCESS_COPY[lang].assisted, html = assisted(lang, { issued });
    for (const line of [u.handoverLabel, u.you, fill(u.youDo, { id: "QA-MARIA" }), u.they, u.theyDo, u.time, u.after, u.copyLink, u.showCode, u.seePage]) expect(html).toContain(line);
    // The time is the code's own expiry in the company's zone: 12:30 PM in Puerto Rico.
    expect(html).toContain(fill(u.timeDo, { time: "@" }).split("@")[0]);
    expect(html).toMatch(/12:30/);
    expect(html).toContain('href="/reset-access"');
    // The how-it-works card gives way to the handover; the code is never in a link or a Support reference.
    expect(html).not.toContain("ar-how");
    expect(html).not.toContain("ar-ref");
    expect(html).toContain('<p class="ar-codeacts__status" role="status" aria-live="polite"></p>');
  });

  it("the Spanish guidance has no English sentence of its own", () => {
    const html = assisted("es") + assisted("es", { issued });
    const en = ACCESS_COPY.en.assisted;
    for (const line of [en.howLabel, ...en.how, en.lasts, en.limits, en.handoverLabel, en.theyDo, en.after, en.copyLink, en.showCode, en.seePage]) expect(html).not.toContain(line);
  });

  it.each(["en", "es"] as const)("offline: nothing was sent and no code was made, in %s", lang => {
    const u = ACCESS_COPY[lang].assisted, html = assisted(lang, { message: OFFLINE_MESSAGE, supportReference: REFERENCE });
    expect(html).toContain(u.offlineTitle);
    expect(html).toContain(u.offline);
    expect(html).toContain('data-tone="info"');
    expect(html).not.toContain(REFERENCE);
    expect(html).not.toContain(ACCESS_COPY.en.assisted.notConfirmedTitle);
  });

  it("a refusal keeps its message and shows the Support reference of that reply when there is one", () => {
    const message = "The recovery code could not be confirmed. Check current access before preparing another code.";
    const html = assisted("en", { message, supportReference: REFERENCE });
    expect(html).toContain(ACCESS_COPY.en.assisted.notConfirmedTitle);
    expect(html).toContain(ACCESS_COPY.en.assisted.notConfirmed);
    expect(html).toContain(REFERENCE);
    expect(assisted("en", { message })).not.toContain("ar-ref");
  });
});
