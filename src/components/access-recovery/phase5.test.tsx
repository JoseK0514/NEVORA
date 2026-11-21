import React from "react";
import { describe, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";
import { AUTH_COPY, authMessage, type AuthLang } from "@/lib/auth-copy";
import { MOBILE_ACCESS_COPY } from "@/components/mobile-access/copy";
import { MobileRecoveryRequest, MobileRecoveryReset } from "@/components/mobile-access/recovery-views";
import { MobileActivationView } from "@/components/mobile-access/activation-view";
import { RecoveryRequest } from "@/components/recovery-request";
import { RecoveryReset } from "@/components/recovery-reset";
import { ActivationInvitationView, type ActivationPhase } from "@/app/activate/activation-invitation";
import { ACCESS_COPY, fill } from "./copy";
import { AssistedReceipt } from "./assisted-receipt";
import { PasswordPair } from "./password-pair";
import { OFFLINE_MESSAGE } from "./recovery-guidance";
import { noteParts } from "@/components/auth-premium/note-parts";
import { BGlyph } from "@/components/owner-b/b-kit";

const saysNote = (html: string, message: string) => { const { title, body } = noteParts(message); if (title) expect(html).toContain(`<p class="b-callout__t">${title}</p>`); if (body) expect(html).toContain(body); };
const glyph = (meaning: Parameters<typeof BGlyph>[0]["meaning"]) => renderToStaticMarkup(<BGlyph meaning={meaning} solid />);

rs.stubGlobal("React", React);

/* Phase 5, package B (Nov 17, 2026): one word for the task ("reset"), imperative titles, the accepted link, the password
 * pair, the one-line finish, the helper's reset link, and the phone pages with the same guidance as every other width.
 * The signed-out pages render both languages; the helper's receipt is signed in (English on screen), so its Spanish is
 * proven here. */

const LANGS: AuthLang[] = ["en", "es"];
const text = (html: string) => html.replace(/<noscript>.*?<\/noscript>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const strings = (value: unknown, path = ""): [string, string][] => typeof value === "string" ? [[path, value]]
  : Array.isArray(value) ? value.flatMap((item, index) => strings(item, `${path}[${index}]`))
  : value && typeof value === "object" ? Object.entries(value).flatMap(([key, item]) => strings(item, path ? `${path}.${key}` : key)) : [];
const PROOF = "Zx9".repeat(14) + "A";
const REFERENCE = "3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const INVALID = "This recovery code has expired, was already used, or cannot be verified. Request a new code or contact your manager.";
const UNCERTAIN = "The reset outcome could not be confirmed. Try signing in with your new password before requesting another code.";
const UNAVAILABLE = "Recovery could not be confirmed. Keep your current access and try again.";
const RESET_DONE = "Password reset. You’re signed out on every device. Sign in with your new password.";
const ACCEPTED = "If the details match an active account, we’ll email recovery steps. Can’t use that email? Ask your manager or Owner for help.";
const SERVER_SENTENCES = [ACCEPTED, UNAVAILABLE, "Recovery is unavailable. Try again or contact your manager for assisted recovery.", "Your access ended. Sign in again.", "Passwords do not match.", RESET_DONE, INVALID, UNCERTAIN];
/** English that must not appear on a Spanish page. */
const ENGLISH = /Step \d|password|Sign in|recovery|reset|Employee ID|offline|Support reference|\bemail\b|Check your|\bcode\b|\blink\b/i;
const noop = () => {};
const reset = (lang: AuthLang, extra: Partial<Parameters<typeof RecoveryReset>[0]> = {}) => renderToStaticMarkup(<RecoveryReset hydrated busy={false} done={false} message="" onSubmit={noop} proofRef={noop} lang={lang} {...extra} />);
const request = (lang: AuthLang, extra: Partial<Parameters<typeof RecoveryRequest>[0]> = {}) => renderToStaticMarkup(<RecoveryRequest hydrated busy={false} done={false} message="" onSubmit={noop} lang={lang} {...extra} />);
const phoneReset = (lang: AuthLang, extra: Partial<Parameters<typeof MobileRecoveryReset>[0]> = {}) => renderToStaticMarkup(<MobileRecoveryReset hydrated busy={false} done={false} message="" onSubmit={noop} proofRef={noop} lang={lang} {...extra} />);
const phoneRequest = (lang: AuthLang, extra: Partial<Parameters<typeof MobileRecoveryRequest>[0]> = {}) => renderToStaticMarkup(<MobileRecoveryRequest hydrated busy={false} done={false} message="" onSubmit={noop} lang={lang} {...extra} />);
const phoneActivation = (lang: AuthLang, phase: ActivationPhase, extra: Partial<Parameters<typeof MobileActivationView>[0]> = {}) => renderToStaticMarkup(<MobileActivationView phase={phase} loginHref="/login?activated=1" workspaceName="Fictional Cafe" onSubmit={noop} lang={lang} {...extra} />);
const step = (lang: AuthLang, n: number) => fill(ACCESS_COPY[lang].steps.of, { n, total: 3 });

describe("PB-014 and PB-029: one word, and titles that say what the page lets you do", () => {
  it("no sentence a person reads says recover or recovery, in either language", () => {
    for (const lang of LANGS) {
      const visible = [...strings(AUTH_COPY[lang]), ...strings(ACCESS_COPY[lang]), ...strings(MOBILE_ACCESS_COPY[lang])];
      for (const [path, value] of visible) expect(value, `${lang} ${path}`).not.toMatch(/recover|recupera/i);
      for (const sentence of SERVER_SENTENCES) expect(authMessage(lang, sentence), sentence).not.toMatch(/recover|recupera/i);
    }
  });

  it("the titles are imperatives, and the Spanish is the reviewed wording", () => {
    expect([AUTH_COPY.en.forgotTitle, AUTH_COPY.en.quiet.resetTitle, AUTH_COPY.en.resetTitle, AUTH_COPY.en.activateTitle]).toEqual(["Reset your password", "Choose a new password", "Choose a new password", "Set up your account"]);
    expect([AUTH_COPY.es.forgotTitle, AUTH_COPY.es.quiet.resetTitle, AUTH_COPY.es.resetTitle, AUTH_COPY.es.activateTitle]).toEqual(["Restablece tu contraseña", "Elige una contraseña nueva", "Elige una contraseña nueva", "Configura tu cuenta"]);
    expect([MOBILE_ACCESS_COPY.en.forgotTitle, MOBILE_ACCESS_COPY.en.resetTitle, MOBILE_ACCESS_COPY.en.activateTitle]).toEqual(["Reset your password", "Choose a new password", "Set up your account"]);
    expect([MOBILE_ACCESS_COPY.es.forgotTitle, MOBILE_ACCESS_COPY.es.resetTitle, MOBILE_ACCESS_COPY.es.activateTitle]).toEqual(["Restablece tu contraseña", "Elige una contraseña nueva", "Configura tu cuenta"]);
    // U11 named the activation finish; it stays.
    expect([ACCESS_COPY.en.activation.doneTitle, ACCESS_COPY.es.activation.doneTitle]).toEqual(["You’re set", "Todo listo"]);
    expect([AUTH_COPY.en.requestRecovery, AUTH_COPY.es.requestRecovery, AUTH_COPY.en.resetPassword, AUTH_COPY.es.resetPassword]).toEqual(["Email me a reset link", "Enviarme el enlace", "Save new password", "Guardar contraseña nueva"]);
  });

  it("what a person reads is looked up; the sentences the screens decide on are unchanged", () => {
    // The hedge is kept: nothing says the ID or the email matched, or that an email was sent.
    expect(authMessage("en", ACCEPTED)).toBe("If the details match an active account, we’ll email a reset link. Can’t use that email? Ask your manager or Owner for help.");
    expect(authMessage("es", ACCEPTED)).toMatch(/^Si los datos coinciden con una cuenta activa,/);
    for (const lang of LANGS) for (const sentence of SERVER_SENTENCES) expect(authMessage(lang, sentence).trim()).not.toBe("");
    expect(authMessage("en", "A new server message.")).toBe("A new server message.");
    // The outcome is still decided on AccountRecovery's own sentence: an uncertain reply is amber in both languages.
    for (const lang of LANGS) expect(reset(lang, { message: UNCERTAIN })).toContain(`<div class="b-callout" data-tone="amber"><span class="b-callout__ic" aria-hidden="true">${glyph("unknown")}</span>`);
  });

  it.each(LANGS)("the request page in %s: the title, the helper in view, the button and both ways on", lang => {
    const t = AUTH_COPY[lang], html = request(lang);
    for (const line of [t.forgotTitle, t.quiet.forgotSub, t.recoveryEmail, t.recoveryEmailHint, t.requestRecovery, t.quiet.haveRecoveryCode, t.quiet.cantUseEmail, t.cantUseEmailBody]) expect(html).toContain(line);
    expect(html).toContain(`<span class="q-auth__hint" id="recovery-email-hint">${t.recoveryEmailHint}</span>`);
    expect(html).not.toMatch(/id="recovery-email"[^>]*placeholder=/);
  });
});

describe("PB-013: the code field only when a code must be typed", () => {
  it.each(LANGS)("a link supplied the code, in %s: one green line with a check, the field out of sight but still in the form", lang => {
    const t = AUTH_COPY[lang], html = reset(lang, { linkProof: true });
    // Premium pass FD: the kit's green callout, its check glyph, the line as its title and the other way as its action.
    expect(html).toContain(`<div class="b-callout" data-tone="green" role="status"><span class="b-callout__ic" aria-hidden="true">${glyph("done")}</span><p class="b-callout__t">${t.reset.linkAccepted}</p><div class="b-callout__act"><button type="button">${t.reset.useDifferentCode}</button></div></div>`);
    // AccountRecovery fills and reads this field exactly as before: same name, same limits.
    expect(html).toMatch(/<div class="q-fl ar-off"><label for="reset-proof">/);
    expect(html).toMatch(/<input id="reset-proof"[^>]*required=""[^>]*minLength="43"[^>]*maxLength="4096"[^>]*name="proof"/);
    expect(html).not.toContain(PROOF);
  });

  it.each(LANGS)("no link, in %s: the field with its label and one helper, and no accepted line", lang => {
    const t = AUTH_COPY[lang], html = reset(lang);
    expect(html).toContain(`<div class="q-fl"><label for="reset-proof">${t.recoveryCode}</label>`);
    expect(html).toContain(`<span class="q-auth__hint" id="reset-proof-hint">${t.recoveryCodeHint}</span>`);
    expect(html).not.toContain('data-tone="green"');
    expect(html).not.toContain("ar-off");
    // The line under the title no longer repeats the helper.
    expect(t.quiet.resetSub).not.toBe(t.recoveryCodeHint);
    expect(html).not.toMatch(/id="reset-proof"[^>]*placeholder=/);
  });

  it.each(LANGS)("a link the server refuses, in %s: said in the link's own words, with the way to a new one", lang => {
    const t = AUTH_COPY[lang], html = reset(lang, { linkProof: true, message: INVALID });
    for (const line of [t.reset.linkRefusedTitle, t.reset.linkRefused, t.requestNewCode]) expect(html).toContain(line);
    expect(html).toContain('href="/forgot-access"');
    expect(html).toContain('<div class="b-callout" data-tone="red">');
    expect(html).not.toContain(ACCESS_COPY[lang].recovery.next.invalidCode);
    // A refused link is not shown as accepted at the same time; typing a code is offered inside the refusal, as its
    // second quiet action.
    expect(html).not.toContain('data-tone="green"');
    expect(html).toContain(`<div class="b-callout__act"><a href="/forgot-access">${t.requestNewCode}</a><button type="button">${t.reset.useDifferentCode}</button></div>`);
    expect(html).toContain('class="q-fl ar-off"');
    const phone = phoneReset(lang, { linkProof: true, message: INVALID });
    expect(phone).not.toContain('data-tone="green"');
    expect(phone).toContain(`<button type="button">${MOBILE_ACCESS_COPY[lang].useDifferentCode}</button>`);
  });
});

describe("PB-016 and PB-037: the password pair", () => {
  it.each(LANGS)("in %s: empty placeholders, each rule under its own field, the eye on both, Next then Go", lang => {
    const t = AUTH_COPY[lang];
    for (const prefix of ["reset", "activation"] as const) {
      const html = renderToStaticMarkup(<form><PasswordPair prefix={prefix} lang={lang} newLabel={t.newPassword} confirmLabel={t.quiet.confirmPassword} /></form>);
      expect(html).not.toContain("placeholder=");
      const [first, second] = html.split(`<label for="${prefix}-confirm-password">`);
      // The length rule is the first field's helper; the match is the second field's.
      expect(first).toContain(`<span class="ar-rule" id="${prefix}-password-hint" data-state="idle"><span class="ar-rule__mark" aria-hidden="true"><span class="ar-rule__dot"></span></span><span>${t.atLeast15}</span></span>`);
      expect(first).not.toContain(t.activation.passwordsMatch);
      expect(second).toContain(`<span class="ar-rule" id="${prefix}-confirm-password-hint" data-state="idle">`);
      // Phase 8: before the two match, the second rule is a requirement, never the statement that they match.
      expect(second).toContain(t.activation.sameAsNew);
      expect(second).not.toContain(t.activation.passwordsMatch);
      expect(second).not.toContain(t.atLeast15);
      expect(html).toMatch(new RegExp(`<input id="${prefix}-password"[^>]*aria-describedby="${prefix}-password-hint ${prefix}-password-invalid"`));
      expect(html).toMatch(new RegExp(`<input id="${prefix}-confirm-password"[^>]*aria-describedby="${prefix}-confirm-password-hint ${prefix}-confirm-password-invalid"`));
      expect(html.match(/autoComplete="new-password"/g)).toHaveLength(2);
      expect(html.match(/autoCorrect="off"/g)).toHaveLength(2);
      expect(html.match(/autoCapitalize="none"/g)).toHaveLength(2);
      expect(html.match(/spellCheck="false"/g)).toHaveLength(2);
      expect(html).toMatch(new RegExp(`id="${prefix}-password"[^>]*enterKeyHint="next"`));
      expect(html).toMatch(new RegExp(`id="${prefix}-confirm-password"[^>]*enterKeyHint="go"`));
      expect(html.match(new RegExp(`<button type="button" class="q-in__eye" aria-pressed="false" aria-controls="${prefix}-password ${prefix}-confirm-password" aria-label="${t.showPassword}">`, "g"))).toHaveLength(2);
      // Neither line ends in a full stop, and the rules are not a live region: nothing is read out on every key.
      expect(t.atLeast15).not.toMatch(/\.$/);
      expect(t.activation.passwordsMatch).not.toMatch(/\.$/);
      expect(t.activation.sameAsNew).not.toMatch(/\.$/);
      expect(html).not.toMatch(/class="ar-rule"[^>]*aria-live/);
      expect(html).toContain('<span class="ar-sr" role="status" aria-live="polite"></span>');
    }
  });

  it("the advice promises no rule: the only rule shown is the one the server enforces", () => {
    for (const lang of LANGS) {
      const t = AUTH_COPY[lang], u = ACCESS_COPY[lang].activation;
      const html = renderToStaticMarkup(<form><PasswordPair prefix="activation" lang={lang} newLabel={t.createPassword} confirmLabel={t.quiet.confirmPassword} advice={u.phrase} /></form>);
      expect(html).toContain(`<span class="ar-rule ar-rule--plain" id="activation-password-advice">${u.phrase}</span>`);
      expect(html.match(/class="ar-rule__mark"/g)).toHaveLength(2);
      expect(u.phrase).not.toMatch(/must|required|at least|debe|obligatori|al menos/i);
    }
  });

  it("the other fields say what they hold and what the keyboard's key does", () => {
    const html = request("en");
    expect(html).toMatch(/id="recovery-employee-id"[^>]*autoComplete="username"[^>]*autoCapitalize="none"[^>]*autoCorrect="off"[^>]*spellCheck="false"[^>]*enterKeyHint="next"/);
    expect(html).toMatch(/id="recovery-email"[^>]*type="email"[^>]*autoComplete="email"[^>]*autoCapitalize="none"[^>]*autoCorrect="off"[^>]*spellCheck="false"[^>]*enterKeyHint="go"/);
    for (const page of [reset("en"), phoneReset("en")]) expect(page).toMatch(/id="reset-proof"[^>]*autoComplete="one-time-code"[^>]*autoCorrect="off"[^>]*autoCapitalize="none"[^>]*spellCheck="false"[^>]*enterKeyHint="next"/);
    const phone = phoneRequest("en");
    expect(phone).toMatch(/id="recovery-employee-id"[^>]*autoComplete="username"[^>]*enterKeyHint="next"/);
    expect(phone).toMatch(/id="recovery-email"[^>]*enterKeyHint="go"/);
  });
});

describe("PB-017: the finish says it once", () => {
  it.each(LANGS)("in %s: the mark, the title, one line, one filled button to sign in", lang => {
    const t = AUTH_COPY[lang], html = reset(lang, { done: true, message: RESET_DONE });
    expect(html).toContain(`<h1>${t.resetDoneTitle}</h1>`);
    expect(html).toMatch(/<span class="q-auth__mark q-auth__mark--done" aria-hidden="true"><svg[^>]*width="28" height="28"/);
    expect(html).toContain(`<div class="q-auth__receipt" role="status" tabindex="-1"><p>${t.reset.doneLine}</p></div>`);
    expect(html).toContain(`<a class="q-btn" href="/login">${t.signIn}</a>`);
    expect(html.match(/class="q-btn"/g)).toHaveLength(1);
    expect(html).not.toContain("<h2");
    expect(html).not.toContain("<form");
  });
});

describe("the phone pages (mobile access) carry the same guidance", () => {
  it.each(LANGS)("request in %s: the step, what happens, the helper, and a refusal with its next step", lang => {
    const t = MOBILE_ACCESS_COPY[lang], u = ACCESS_COPY[lang].recovery, a = AUTH_COPY[lang];
    const html = phoneRequest(lang);
    for (const line of [step(lang, 1), t.forgotTitle, t.forgotSub, u.intro, a.recoveryEmailHint, t.requestRecovery, t.haveCode]) expect(html).toContain(line);
    const refused = phoneRequest(lang, { message: UNAVAILABLE, supportReference: REFERENCE });
    saysNote(refused, authMessage(lang, UNAVAILABLE));
    expect(refused).toContain(`<p>${u.next.requestFailed}</p>`);
    expect(refused).toContain(REFERENCE);
    expect(refused).not.toContain("ar-intro");
    const offline = phoneRequest(lang, { message: OFFLINE_MESSAGE, supportReference: REFERENCE });
    expect(offline).toContain(`id="recovery-offline" class="ar-note" role="alert" tabindex="-1"><div class="b-callout" data-tone="amber"><span class="b-callout__ic" aria-hidden="true">${glyph("offline")}</span>`);
    saysNote(offline, u.offline);
    expect(offline).not.toContain(REFERENCE);
    // The Employee ID field shows the example, as on Sign in and the desktop form (row 14), not a second label.
    expect(html).toMatch(new RegExp(`id="recovery-employee-id"[^>]*placeholder="${a.quiet.idPlaceholder}"`));
  });

  it.each(LANGS)("asked in %s: an email was asked for, never that it was sent or arrived", lang => {
    const u = ACCESS_COPY[lang].recovery, a = AUTH_COPY[lang];
    const html = phoneRequest(lang, { done: true, message: ACCEPTED });
    for (const line of [step(lang, 2), u.requestedSub, authMessage(lang, ACCEPTED), u.notConfirmed, a.checkEmail.expires, u.askAgain]) expect(html).toContain(line);
    expect(html).toContain(`<div class="b-callout" data-tone="teal"><span class="b-callout__ic" aria-hidden="true">${glyph("info")}</span><div class="b-callout__b">${u.notConfirmed} ${a.checkEmail.expires}</div></div>`);
    expect(text(html)).not.toMatch(/Email sent|was sent to|We sent|has been sent|Correo enviado|Te enviamos el|Ya enviamos/i);
    expect(html).not.toContain("<form");
  });

  it.each(LANGS)("new password in %s: the step, the accepted link, each refusal with its next step, and the finish", lang => {
    const t = MOBILE_ACCESS_COPY[lang], u = ACCESS_COPY[lang].recovery, a = AUTH_COPY[lang];
    const linked = phoneReset(lang, { linkProof: true });
    for (const line of [step(lang, 3), t.resetTitle, a.reset.linkAccepted, t.useDifferentCode, a.atLeast15, t.resetPassword]) expect(linked).toContain(line);
    expect(linked).toContain('class="q-fl ma-link-proof ar-off"');
    expect(phoneReset(lang)).not.toContain("ar-accepted");
    const refused = phoneReset(lang, { message: INVALID });
    for (const line of [t.invalidCodeTitle, t.invalidCodeBody, u.next.invalidCode, t.requestNew]) expect(refused).toContain(line);
    const lost = phoneReset(lang, { message: UNCERTAIN });
    for (const line of [t.resetUnknownTitle, t.resetUnknownBody, t.trySignIn]) expect(lost).toContain(line);
    expect(lost).toContain(`<div class="b-callout" data-tone="amber"><span class="b-callout__ic" aria-hidden="true">${glyph("unknown")}</span>`);
    expect(lost).not.toContain(t.resetDone);
    const unavailable = phoneReset(lang, { message: UNAVAILABLE, supportReference: REFERENCE });
    for (const line of [a.resetNotConfirmed, u.next.resetUnavailable, REFERENCE]) expect(unavailable).toContain(line);
    saysNote(phoneReset(lang, { message: OFFLINE_MESSAGE }), u.offline);
    const mismatch = phoneReset(lang, { message: "Passwords do not match." });
    for (const line of [a.checkPasswords, u.next.mismatch]) expect(mismatch).toContain(line);
    expect(mismatch).toMatch(/id="reset-confirm-password"[^>]*aria-invalid="true"/);
    const done = phoneReset(lang, { done: true, message: RESET_DONE });
    for (const line of [t.resetDone, a.reset.doneLine, t.signInNew, u.doneNote]) expect(done).toContain(line);
    expect(done.match(/class="q-btn"/g)).toHaveLength(1);
    expect(done).not.toContain("<form");
  });

  it.each(LANGS)("activation in %s: the step, what is being set, offline, not confirmed, and the finish", lang => {
    const t = MOBILE_ACCESS_COPY[lang], u = ACCESS_COPY[lang].activation;
    const ready = phoneActivation(lang, "ready", { passkeys: true, otherSession: "Maria" });
    for (const line of [step(lang, 2), t.inviteTitle, u.passwordFact, u.idFact, u.passkeyFact, u.otherSession.replace("{name}", "Maria"), t.activateAccount]) expect(ready).toContain(line);
    expect(phoneActivation(lang, "ready")).not.toContain(u.passkeyFact);
    const offline = phoneActivation(lang, "ready", { offline: true });
    expect(offline).toContain(`<div id="activation-offline" class="ar-note" role="alert" tabindex="-1"><div class="b-callout" data-tone="amber"><span class="b-callout__ic" aria-hidden="true">${glyph("offline")}</span>`);
    saysNote(offline, u.offline);
    const unavailable = phoneActivation(lang, "unavailable", { supportReference: REFERENCE });
    expect(unavailable).toContain(REFERENCE);
    saysNote(unavailable, t.inviteUnavailable);
    expect(unavailable).toContain(`<div id="activation-unavailable" class="ar-note" role="alert"><div class="b-callout" data-tone="red">`);
    const unknown = phoneActivation(lang, "outcome_unknown", { supportReference: REFERENCE });
    for (const line of [u.unknownTitle, u.unknownFirst, t.trySignIn, REFERENCE]) expect(unknown).toContain(line);
    expect(unknown).not.toContain(u.doneTitle);
    expect(unknown).not.toContain("ar-steps");
    const invalid = phoneActivation(lang, "invalid");
    for (const line of [step(lang, 1), t.inviteInvalidTitle, u.invalidWhy, u.invalidActive, t.inviteHelp]) expect(invalid).toContain(line);
    expect(phoneActivation(lang, "missing")).toContain(u.missingHow);
    const done = phoneActivation(lang, "activated", { employeeId: "QA-1042" });
    for (const line of [step(lang, 3), u.doneTitle, u.doneSub, u.doneNext, "QA-1042", t.continueSignIn]) expect(done).toContain(line);
  });

  it("the Spanish phone pages show no English in any state", () => {
    const pages = [phoneRequest("es"), phoneRequest("es", { message: UNAVAILABLE }), phoneRequest("es", { message: OFFLINE_MESSAGE }), phoneRequest("es", { done: true, message: ACCEPTED }),
      phoneReset("es"), phoneReset("es", { linkProof: true }), phoneReset("es", { message: INVALID }), phoneReset("es", { linkProof: true, message: INVALID }), phoneReset("es", { message: UNCERTAIN }),
      phoneReset("es", { message: UNAVAILABLE }), phoneReset("es", { message: OFFLINE_MESSAGE }), phoneReset("es", { message: "Passwords do not match." }), phoneReset("es", { done: true, message: RESET_DONE }),
      phoneActivation("es", "ready", { passkeys: true, otherSession: true }), phoneActivation("es", "ready", { offline: true, mismatch: true }), phoneActivation("es", "unavailable"), phoneActivation("es", "outcome_unknown"),
      phoneActivation("es", "invalid"), phoneActivation("es", "missing"), phoneActivation("es", "activated", { employeeId: "1042" })];
    for (const [index, html] of pages.entries()) expect(text(html), `page ${index}`).not.toMatch(ENGLISH);
  });

  it("the Spanish pages at every other width show no English either", () => {
    const view = (phase: ActivationPhase, extra: object = {}) => renderToStaticMarkup(<ActivationInvitationView phase={phase} lang="es" loginHref="/login?activated=1" workspaceName="Fictional Cafe" onSubmit={noop} {...extra} />);
    const pages = [request("es"), request("es", { done: true, message: ACCEPTED }), reset("es"), reset("es", { linkProof: true }), reset("es", { linkProof: true, message: INVALID }), reset("es", { message: INVALID }),
      reset("es", { message: "Passwords do not match." }), reset("es", { done: true, message: RESET_DONE }), view("ready"), view("ready", { mismatch: true }), view("missing"), view("invalid"), view("activated", { employeeId: "1042" })];
    for (const [index, html] of pages.entries()) expect(text(html), `page ${index}`).not.toMatch(ENGLISH);
  });
});

describe("PB-008: the helper's receipt hands over a reset link", () => {
  const issued = { proof: PROOF, employeeId: "QA-MARIA", expiresAt: "2026-11-17T16:30:00Z" };
  const receipt = (lang: AuthLang) => renderToStaticMarkup(<AssistedReceipt issued={issued} timeZone="America/Puerto_Rico" lang={lang} feedback={{ current: null }} onStartAgain={noop} />);

  it.each(LANGS)("in %s: what each person does, until when, Copy link first and the code behind Show code", lang => {
    const u = ACCESS_COPY[lang].assisted, html = receipt(lang);
    for (const line of [u.readyTitle, fill(u.readyFor, { id: "QA-MARIA" }), u.copyLink, u.showCode, u.handoverLabel, u.you, fill(u.youDo, { id: "QA-MARIA" }), u.they, u.theyDo, u.time, u.after, u.another, u.anotherNote]) expect(html).toContain(line);
    expect(html).toContain('<time dateTime="2026-11-17T16:30:00Z">');
    expect(html).toMatch(/12:30/);
    expect(html).toContain(fill(u.scan, { time: "@" }).split("@")[0]);
    // One filled button: Copy link. The code's own copy button is not in the page until the code is shown.
    expect(html.match(/class="b-btn b-btn--teal"/g)).toHaveLength(1);
    expect(html).toMatch(/<button type="button" class="ar-showcode" aria-expanded="false" aria-controls="assisted-code">/);
    expect(html).toContain('<div id="assisted-code" class="ar-code" hidden=""></div>');
    expect(html).toContain('<p class="ar-codeacts__status" role="status" aria-live="polite"></p>');
    expect(html).toContain('href="/reset-access"');
  });

  it("the code and the link are not written into the page before the browser draws them", () => {
    const html = receipt("en");
    // Server markup has no code, no link, no image address and no query string. The QR is drawn in the browser only.
    expect(html).not.toContain(PROOF);
    expect(html).not.toContain("#proof=");
    expect(html).not.toMatch(/<img|<a [^>]*href="[^"]*(\?|proof)|src=/);
    expect(html).toContain('<div class="ar-qr" data-empty=""></div>');
  });

  it("the Spanish receipt has no English sentence of its own", () => {
    const en = ACCESS_COPY.en.assisted, html = receipt("es");
    for (const line of [en.readyTitle, en.copyLink, en.showCode, en.handoverLabel, en.theyDo, en.after, en.another, en.anotherNote]) expect(html).not.toContain(line);
    expect(text(html)).not.toMatch(/\bcode\b|\blink\b|password|Sign in/i);
  });
});

describe("follow-up, PB-015 and PB-021: one filled button in the card, the rest as text links under it", () => {
  const filled = (html: string) => (html.match(/class="q-btn"/g) ?? []).length;
  it.each(LANGS)("request in %s: the links row under the card, the disclosure as a button with aria-expanded", lang => {
    const t = AUTH_COPY[lang], html = request(lang, { workspaceName: "Fictional Cafe" });
    expect(html).toMatch(new RegExp(`<div class="q-auth__under"><nav class="q-auth__links" aria-label="${t.accountHelp}"><a href="/reset-access">${t.quiet.haveRecoveryCode}</a><button type="button" class="ar-navbtn" aria-expanded="false" aria-controls="recovery-cant-email">${t.quiet.cantUseEmail.replace("?", "\\?")}<svg[^>]*>.*?</svg></button></nav><p class="ar-under__more" id="recovery-cant-email" hidden="">`));
    // The links row comes after the form and its button, and is the last thing on the page.
    expect(html.indexOf("q-auth__under")).toBeGreaterThan(html.indexOf('type="submit"'));
    expect(html.endsWith("</p></div>")).toBe(true);
    expect(html).not.toContain("q-btn--sec");
    expect(html).not.toContain("q-btn--quiet");
    expect(html).not.toContain("<details");
    expect(html).toContain('<div class="q-auth__hd ar-ws"><p>Fictional Cafe</p></div>');
    expect(request(lang)).not.toContain("ar-ws");
    const asked = request(lang, { done: true, message: ACCEPTED, onReview: noop });
    expect(filled(asked)).toBe(1);
    expect(asked).toContain(`<button type="button" class="ar-navbtn">${t.checkEmail.review}</button>`);
  });

  it.each(LANGS)("new password and activation in %s: no second button, the other way on is a link under the card", lang => {
    const t = AUTH_COPY[lang];
    const page = reset(lang, { workspaceName: "Fictional Cafe" });
    expect(page).toContain(`<nav class="q-auth__links" aria-label="${t.accountHelp}"><a href="/forgot-access">${t.needRecoveryCode}</a></nav>`);
    expect(page.endsWith("</nav>")).toBe(true);
    expect(page).not.toMatch(/q-btn--(sec|quiet)/);
    expect(page).toContain('<div class="q-auth__hd ar-ws"><p>Fictional Cafe</p></div>');
    const view = (phase: ActivationPhase, extra: object = {}) => renderToStaticMarkup(<ActivationInvitationView phase={phase} lang={lang} loginHref="/login?activated=1" workspaceName="Fictional Cafe" onSubmit={noop} {...extra} />);
    for (const phase of ["ready", "missing", "invalid"] as const) {
      const html = view(phase);
      expect(html, phase).toContain(`<nav class="q-auth__links" aria-label="${t.accountHelp}"><a href="/login">${t.alreadyActivated}</a></nav>`);
      expect(html, phase).not.toMatch(/q-btn--(sec|quiet)/);
      expect(filled(html), phase).toBeLessThanOrEqual(1);
    }
    // The form's own line says whose account it is; the other states show the workplace as the chip.
    expect(view("ready")).not.toContain("ar-ws");
    expect(view("missing")).toContain('<div class="q-auth__hd ar-ws"><p>Fictional Cafe</p></div>');
    // Not confirmed: one filled button (try signing in); invitation help, where it exists, is the link under the card.
    const unknown = view("outcome_unknown", { mobileAccess: true });
    expect(filled(unknown)).toBe(1);
    expect(unknown).toContain(`<a href="/access-help/invitation">${t.activation.inviteHelp}</a></nav>`);
  });

  it.each(LANGS)("the phone pages in %s follow the same rule", lang => {
    const t = MOBILE_ACCESS_COPY[lang], a = AUTH_COPY[lang];
    const pages = [phoneRequest(lang), phoneRequest(lang, { done: true, message: ACCEPTED }), phoneReset(lang), phoneReset(lang, { linkProof: true }), phoneActivation(lang, "ready"), phoneActivation(lang, "invalid"), phoneActivation(lang, "missing"), phoneActivation(lang, "outcome_unknown")];
    for (const [index, html] of pages.entries()) {
      const card = html.slice(0, html.indexOf('<div class="ma-outside">'));
      expect(filled(card), `page ${index}`).toBe(1);
      expect(card, `page ${index}`).not.toMatch(/q-btn--(sec|quiet)/);
      expect(html.slice(card.length), `page ${index}`).toContain(`<nav class="q-auth__links" aria-label="${a.accountHelp}">`);
      expect(html, `page ${index}`).not.toMatch(/q-btn--(sec|quiet)/);
    }
    expect(phoneRequest(lang)).toContain(`<a href="/reset-access">${t.haveCode}</a>`);
    expect(phoneReset(lang)).toContain(`<a href="/forgot-access">${t.needCode}</a>`);
    expect(phoneActivation(lang, "outcome_unknown")).toContain(`<a href="/access-help/invitation">${t.inviteHelp}</a>`);
    expect(phoneRequest(lang, { workspaceName: "Fictional Cafe" })).toContain('<div class="q-auth__hd ar-ws"><p>Fictional Cafe</p></div>');
  });
});
