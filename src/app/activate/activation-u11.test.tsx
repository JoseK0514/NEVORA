// U11 (Nov 17, 2026): every activation state in English and Spanish. The security behaviour of the invitation (the
// fragment custody, the exact result envelope) is covered by activation-invitation.test.tsx and is not touched here.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivationInvitationView, type ActivationPhase } from "./activation-invitation";
import { ACCESS_COPY } from "@/components/access-recovery/copy";
import { AUTH_COPY } from "@/lib/auth-copy";
import { FieldError } from "@/components/auth-premium/auth-validation";

const REFERENCE = "3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
type Props = Partial<Parameters<typeof ActivationInvitationView>[0]>;
const view = (phase: ActivationPhase, lang: "en" | "es", props: Props = {}) =>
  renderToStaticMarkup(<ActivationInvitationView phase={phase} lang={lang} loginHref="/login?activated=1" workspaceName="Northside Café" onSubmit={() => {}} {...props} />);
const step = (lang: "en" | "es", n: number) => ACCESS_COPY[lang].steps.of.replace("{n}", String(n)).replace("{total}", "3");
// English that must never show on a Spanish page (the brand and the workspace's own name aside).
const ENGLISH = /Step \d|Activate account|password|Sign in|invitation|Employee ID|offline|Support reference|You’re|Try signing|Already activated/;

describe.each(["en", "es"] as const)("activation in %s", lang => {
  const t = AUTH_COPY[lang], u = ACCESS_COPY[lang].activation;

  it("opening: says only that the invitation is opening", () => {
    const html = view("checking", lang);
    expect(html).toContain(t.activation.opening);
    expect(html).not.toContain("<form");
  });

  it("no link: step 1, where the link is, and the way to sign in", () => {
    const html = view("missing", lang);
    for (const text of [step(lang, 1), ACCESS_COPY[lang].steps.activation[0], u.missingHow, t.quiet.noInvitation, t.alreadyActivated]) expect(html).toContain(text);
    expect(html).toContain('href="/login"');
    expect(html).not.toContain("<form");
  });

  it("create password: step 2, whose account, what is being set and what Employee ID is", () => {
    const html = view("ready", lang);
    for (const text of [step(lang, 2), ACCESS_COPY[lang].steps.activation[1], t.activation.choose.replace("{workspace}", "Northside Café"), u.passwordFact, u.idFact, t.activateAccount]) expect(html).toContain(text);
    expect(html).toContain(`<ul class="ar-facts" aria-label="${u.factsLabel}">`);
    // A passkey is mentioned only where this build offers one.
    expect(html).not.toContain(u.passkeyFact);
    expect(view("ready", lang, { passkeys: true })).toContain(u.passkeyFact);
    expect(html).toContain('autoComplete="new-password"');
  });

  it("weak password: the field's own message, in the one error style, with no closing period", () => {
    const html = view("ready", lang);
    expect(html).toContain(`data-msg-invalid="${t.invalid.newPassword}"`);
    expect(t.invalid.newPassword).not.toMatch(/\.$/);
    // The line under each field is the 16px bold warning glyph and an empty text node until the field fails.
    expect(html).toMatch(/<span class="q-auth__invalid"><svg[^>]*width="16" height="16"[^>]*aria-hidden="true"[^>]*>.*?<\/svg><span id="activation-password-invalid"><\/span><\/span>/);
  });

  it("passwords differ: one red line in the field error style, announced (the form shows it under the confirm field once the two values differ)", () => {
    const html = renderToStaticMarkup(<FieldError id="activation-error">{u.mismatch}</FieldError>);
    expect(html).toMatch(new RegExp(`^<span class="q-auth__invalid" data-on=""><svg[^>]*width="16" height="16"[^>]*aria-hidden="true"[^>]*>.*?</svg><span id="activation-error" role="alert">${u.mismatch}</span></span>$`));
    expect(u.mismatch).not.toMatch(/\.$/);
    // Until something is typed nothing differs, so a submit that the form refused still shows the form and no stale error.
    const form = view("ready", lang, { mismatch: true });
    expect(form).toContain('type="submit"');
    expect(form).not.toContain("data-on");
  });

  it("offline: nothing was sent, the form and the invitation stay, and it is a wait, not a failure", () => {
    const html = view("ready", lang, { offline: true });
    expect(html).toMatch(new RegExp(`<p id="activation-offline" class="q-auth__alert q-auth__alert--wait" role="alert" tabindex="-1"><svg[^>]*>.*?</svg><span>${u.offline}</span></p>`));
    expect(html).toContain('type="submit"');
    expect(html).not.toContain(t.activation.unavailable);
    expect(html).not.toContain("q-error q-auth__alert");
  });

  it("unavailable: says the invitation was not confirmed, keeps the form, and shows a Support reference only when there is one", () => {
    const html = view("unavailable", lang);
    expect(html).toContain(t.activation.unavailable);
    expect(html).toContain('type="submit"');
    expect(html).not.toContain("ar-ref");
    const withReference = view("unavailable", lang, { supportReference: REFERENCE });
    expect(withReference).toContain(REFERENCE);
    expect(withReference).toContain(ACCESS_COPY[lang].supportRef.label);
  });

  it("expired, used twice or already active: why, what to do if you already activated, and the one next step", () => {
    const html = view("invalid", lang);
    for (const text of [t.activation.invalid, u.invalidWhy, u.invalidActive, t.activation.invalidNext, t.alreadyActivated]) expect(html).toContain(text);
    expect(html).not.toContain("<form");
    expect(html).not.toContain(u.missingHow);
  });

  it("result not confirmed: never failed and never done; sign in first, then ask the Owner", () => {
    const html = view("outcome_unknown", lang, { supportReference: REFERENCE });
    expect(html).toMatch(new RegExp(`<h1>${u.unknownTitle}</h1>`));
    for (const text of [u.unknownFirst, t.trySigningIn, t.activation.unknown, REFERENCE]) expect(html).toContain(text);
    expect(html).toMatch(/<a class="q-btn" href="\/login">/);
    expect(html).not.toContain('type="submit"');
    for (const wrong of [u.doneTitle, t.activation.activatedTitle, t.activation.unavailable, t.activation.invalid]) expect(html).not.toContain(wrong);
  });

  it("done: You’re set, the ID to keep, and the next step", () => {
    const html = view("activated", lang, { employeeId: "NEW-001" });
    expect(html).toMatch(new RegExp(`<h1>${u.doneTitle}</h1><p>${u.doneSub}</p>`));
    for (const text of [step(lang, 3), ACCESS_COPY[lang].steps.activation[2], "NEW-001", t.activation.saveId, t.activation.continueSignIn, u.doneNext]) expect(html).toContain(text);
    // The card is the announced result and takes focus (the component moves it there).
    expect(html).toContain('<div class="activation-success q-card" role="status" tabindex="-1">');
    expect(html).toContain('href="/login?activated=1"');
  });

  it("someone else signed in on this device: said by name on the form and on the finish", () => {
    const named = view("ready", lang, { otherSession: "Maria" });
    expect(named).toContain(u.otherSession.replace("{name}", "Maria"));
    expect(view("activated", lang, { employeeId: "NEW-001", otherSession: true })).toContain(u.otherSessionUnnamed);
    expect(view("ready", lang)).not.toContain("ar-inline");
  });
});

it("a Spanish activation page shows no English in any state", () => {
  const states: [ActivationPhase, Props][] = [["checking", {}], ["missing", {}], ["ready", { passkeys: true, otherSession: "Maria" }], ["ready", { mismatch: true }], ["ready", { offline: true }],
    ["unavailable", { supportReference: REFERENCE }], ["invalid", {}], ["outcome_unknown", { supportReference: REFERENCE }], ["activated", { employeeId: "NEW-001", otherSession: true }]];
  for (const [phase, props] of states) {
    const text = view(phase, "es", props).replace(/<[^>]+>/g, " ");
    expect(text, `${phase} ${JSON.stringify(props)}`).not.toMatch(ENGLISH);
  }
});
