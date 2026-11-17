import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ACCESS_COPY, fill, type AccessCopy } from "./copy";
import { AccessSteps } from "./access-steps";
import { SupportReference } from "./support-reference";
import { readSupportReference, shown, supportReferenceOf, supportReferenceOfState } from "./support-reference-seam";
import { LastOwnerCard } from "./last-owner-card";
import { OFFLINE_MESSAGE, recoveryIssue, recoveryNext } from "./recovery-guidance";

const strings = (value: unknown, path = ""): [string, string][] => typeof value === "string" ? [[path, value]]
  : Array.isArray(value) ? value.flatMap((item, index) => strings(item, `${path}[${index}]`))
  : value && typeof value === "object" ? Object.entries(value).flatMap(([key, item]) => strings(item, path ? `${path}.${key}` : key)) : [];
const REFERENCE = "3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const response = (headers: Record<string, string>, ok = false) => ({ ok, headers: new Headers(headers) });

describe("U11 copy", () => {
  it("has every English key in Spanish, none empty and none left in English", () => {
    const en = strings(ACCESS_COPY.en), es = strings(ACCESS_COPY.es);
    expect(es.map(([path]) => path).sort()).toEqual(en.map(([path]) => path).sort());
    const english = new Map(en);
    for (const [path, text] of es) {
      expect(text.trim(), path).not.toBe("");
      expect(text, path).not.toBe(english.get(path));
    }
  });
  it.each(["en", "es"] as const)("follows the copy rules in %s: no exclamation marks, em dashes, filler or system words", lang => {
    for (const [path, text] of strings(ACCESS_COPY[lang])) {
      expect(text, path).not.toMatch(/[!¡—]|\bsimply\b|\bjust\b|seamless|successfully|Oops|payload|operation id|entity|\bresource\b|LAST_OWNER|simplemente|exitosamente/i);
      expect(text, path).not.toMatch(/\s{2,}|^\s|\s$/);
    }
  });
  it("a line that sits under a field or in an inline alert has no closing period (Phase 3 forms rule)", () => {
    for (const lang of ["en", "es"] as const) {
      const t = ACCESS_COPY[lang];
      for (const text of [t.activation.mismatch, t.activation.offline, t.recovery.offline, t.passkey.unsupported, t.passkey.cancelledSignIn, t.passkey.cancelledAdd, t.passkey.stale, t.passkey.addFailed, t.supportRef.failed, t.assisted.copyFailed]) expect(text).not.toMatch(/\.$/);
    }
  });
  it("never promises what the server did not confirm", () => {
    for (const lang of ["en", "es"] as const) {
      const t = ACCESS_COPY[lang];
      // An email was asked for; nothing says it was sent, delivered or arrived as a fact.
      expect(t.recovery.requestedSub).toMatch(lang === "en" ? /asked for/ : /Pedimos/);
      expect(t.recovery.notConfirmed).toMatch(lang === "en" ? /can’t tell you/ : /no puede decirte/);
      // A refused deletion says nothing was deleted and the session is still open.
      expect(t.lastOwner.nothing).toMatch(lang === "en" ? /Nothing was deleted.*still signed in/ : /No se eliminó nada.*sigue abierta/);
      // Writing to support is not a closure.
      expect(t.lastOwner.closeBody).toMatch(lang === "en" ? /does not close the company or cancel billing/ : /no cierra la empresa ni cancela la facturación/);
      expect(t.recovery.next.resetUnavailable).not.toMatch(/was not changed|no cambió/);
    }
  });
  it("fills named placeholders and leaves unknown ones", () => {
    expect(fill("Step {n} of {total}", { n: 2, total: 3 })).toBe("Step 2 of 3");
    expect(fill("Hello {name}", {})).toBe("Hello {name}");
  });
});

describe("AccessSteps", () => {
  it.each([["en", "Step 2 of 3", "Create your password"], ["es", "Paso 2 de 3", "Crea tu contraseña"]] as const)("says where the person is and names every step, in %s", (lang, now, label) => {
    const html = renderToStaticMarkup(<AccessSteps journey="activation" current={2} lang={lang} />);
    expect(html).toContain(`<span>${now}</span><b>${label}</b>`);
    expect(html.match(/<li /g)).toHaveLength(3);
    expect(html).toMatch(/data-state="done"[^>]*>.*data-state="current" aria-current="step".*data-state="next"/);
    // Each bar carries its words for a screen reader: nothing is said by colour alone.
    for (const step of ACCESS_COPY[lang].steps.activation) expect(html).toContain(step);
  });
  it("clamps a step outside the journey", () => {
    expect(renderToStaticMarkup(<AccessSteps journey="recovery" current={9} />)).toContain("Step 3 of 3");
    expect(renderToStaticMarkup(<AccessSteps journey="recovery" current={0} />)).toContain("Step 1 of 3");
  });
});

describe("Support reference", () => {
  it("renders nothing without a reference, and nothing for a value that is not a UUID", () => {
    for (const reference of [null, undefined, "", "DEL-7KQ2M9XA", "not-a-reference", `${REFERENCE}x`, "<b>x</b>"]) expect(renderToStaticMarkup(<SupportReference reference={reference} />)).toBe("");
  });
  it.each([["en", "Support reference", "Copy", "It is not a password."], ["es", "Referencia de soporte", "Copiar", "No es una contraseña."]] as const)("shows the label, the reference in a monospaced block and Copy, in %s", (lang, label, copy, hint) => {
    const html = renderToStaticMarkup(<SupportReference reference={REFERENCE} lang={lang} id="x" />);
    expect(html).toContain(`<span class="ar-ref__label" id="x-label">${label}</span>`);
    expect(html).toContain(`<code class="ar-ref__value" id="x-value" tabindex="0" aria-describedby="x-hint">${REFERENCE}</code>`);
    expect(html).toMatch(new RegExp(`<button type="button" class="ar-ref__copy" aria-describedby="x-value"><svg[^>]*aria-hidden="true"[^>]*>.*</svg><span>${copy}</span></button>`));
    expect(html).toContain(hint);
    // The copied confirmation is a live region, so a screen reader hears it too; empty until Copy is pressed.
    expect(html).toContain('<span class="ar-sr" role="status" aria-live="polite"></span>');
    expect(html).toContain('role="group" aria-labelledby="x-label"');
    if (lang === "es") expect(html).not.toMatch(/Support reference|Copy|password/);
  });
  it("reads only the failed response own validated support header", () => {
    expect(readSupportReference(response({ "X-Nevora-Request-Id": REFERENCE }))).toBe(REFERENCE);
    expect(supportReferenceOf(response({ "X-Nevora-Request-Id": REFERENCE }))).toBe(REFERENCE);
    expect(readSupportReference(response({ "X-Nevora-Request-Id": "DEL-7KQ2M9XA" }))).toBeNull();
    expect(supportReferenceOf(response({ "X-Nevora-Request-Id": REFERENCE }, true))).toBeNull();
    expect(supportReferenceOf(response({}))).toBeNull();
  });
  it("with a reader, binds a reference to the one failed response it came from and validates it", () => {
    const read = (reply: Pick<Response, "headers">) => reply.headers.get("X-Nevora-Request-Id");
    expect(supportReferenceOf(response({ "X-Nevora-Request-Id": REFERENCE }), read)).toBe(REFERENCE);
    // A success has no diagnostic reference to show; a missing or malformed header shows nothing; a reader that throws shows nothing.
    expect(supportReferenceOf(response({ "X-Nevora-Request-Id": REFERENCE }, true), read)).toBeNull();
    expect(supportReferenceOf(response({}), read)).toBeNull();
    expect(supportReferenceOf(response({ "X-Nevora-Request-Id": "DEL-7KQ2M9XA" }), read)).toBeNull();
    expect(supportReferenceOf(response({ "X-Nevora-Request-Id": REFERENCE }), () => { throw new Error("no"); })).toBeNull();
    expect(supportReferenceOf(null, read)).toBeNull();
    // Nothing is remembered between calls.
    expect(supportReferenceOf(response({}), read)).toBeNull();
  });
  it("reads a reference from an action state only when the state carries a valid one", () => {
    expect(supportReferenceOfState({ kind: "failed" })).toBeNull();
    expect(supportReferenceOfState({ kind: "received", reference: "DEL-7KQ2M9XA" })).toBeNull();
    expect(supportReferenceOfState({ kind: "failed", supportReference: "DEL-7KQ2M9XA" })).toBeNull();
    expect(supportReferenceOfState({ kind: "failed", supportReference: REFERENCE })).toBe(REFERENCE);
    expect(supportReferenceOfState(null)).toBeNull();
    expect(shown(REFERENCE.toUpperCase())).toBe(REFERENCE.toUpperCase());
  });
});

describe("Last-Owner card", () => {
  const render = (lang: "en" | "es", props: Partial<Parameters<typeof LastOwnerCard>[0]> = {}) => renderToStaticMarkup(<LastOwnerCard supportEmail="support@example.test" lang={lang} {...props} />);
  it.each(["en", "es"] as const)("explains the refusal calmly and offers the two real paths, in %s", lang => {
    const t: AccessCopy["lastOwner"] = ACCESS_COPY[lang].lastOwner, html = render(lang);
    for (const text of [t.title, t.why, t.nothing, t.addTitle, t.addBody, t.addAction, t.closeTitle, t.closeBody, t.closeAction, t.keep]) expect(html).toContain(text);
    // A state card that is announced once and can take focus; not an alert, not a toast.
    expect(html).toMatch(/<div class="b-card ar-lastowner__card" tabindex="-1" role="status" aria-labelledby="last-owner-title" aria-describedby="last-owner-why last-owner-safe">/);
    expect(html).not.toContain('role="alert"');
    expect(html).toContain('data-kind="paused"');
    // Path one goes where another Owner is added; path two is the existing support address.
    expect(html).toMatch(/<a class="b-btn b-btn--teal" href="\/app\/employees">/);
    expect(html).toContain(`href="mailto:support@example.test?subject=${encodeURIComponent(t.closeSubject)}"`);
    expect(html).toContain('href="/app/profile"');
    // One filled teal button on the screen.
    expect(html.match(/b-btn--teal/g)).toHaveLength(1);
    // There is no request, so there is never a deletion reference or a Support reference here.
    expect(html).not.toMatch(/DEL-|ar-ref/);
  });
  it("leaves no English in the Spanish card", () => {
    const html = render("es");
    for (const text of Object.values(ACCESS_COPY.en.lastOwner)) expect(html).not.toContain(text);
    expect(html).toContain('lang="es"');
  });
  it("drops the Team button for a reader who can't reach it, and shows a Support reference only when given a valid one", () => {
    const html = render("en", { teamHref: null, supportReference: REFERENCE });
    expect(html).not.toContain("b-btn--teal");
    expect(html).toContain(REFERENCE);
    expect(render("en", { supportReference: "DEL-7KQ2M9XA" })).not.toContain("ar-ref");
  });
});

describe("Recovery guidance", () => {
  it("maps each outcome AccountRecovery names to the contract's typed state", () => {
    expect(recoveryIssue("request", "")).toBeNull();
    expect(recoveryIssue("request", OFFLINE_MESSAGE)).toBe("offline");
    expect(recoveryIssue("request", "Recovery could not be confirmed. Keep your current access and try again.")).toBe("requestFailed");
    expect(recoveryIssue("request", "Recovery is unavailable. Try again or contact your manager for assisted recovery.")).toBe("requestUnavailable");
    expect(recoveryIssue("request", "Your access ended. Sign in again.")).toBe("ended");
    expect(recoveryIssue("reset", "Passwords do not match.")).toBe("mismatch");
    expect(recoveryIssue("reset", "This recovery code has expired, was already used, or cannot be verified. Request a new code or contact your manager.")).toBe("invalidCode");
    expect(recoveryIssue("reset", "The reset outcome could not be confirmed. Try signing in with your new password before requesting another code.")).toBe("uncertain");
    expect(recoveryIssue("reset", "Recovery could not be confirmed. Keep your current access and try again.")).toBe("resetUnavailable");
    expect(recoveryIssue("reset", "Something new")).toBeNull();
  });
  it.each(["en", "es"] as const)("gives every refusal a next step in %s, and none for an unknown sentence", lang => {
    const copy = ACCESS_COPY[lang];
    expect(recoveryNext(copy, "reset", "Passwords do not match.")).toBe(copy.recovery.next.mismatch);
    expect(recoveryNext(copy, "request", "Recovery is unavailable. Try again or contact your manager for assisted recovery.")).toBe(copy.recovery.next.requestUnavailable);
    expect(recoveryNext(copy, "request", OFFLINE_MESSAGE)).toBeNull();
    expect(recoveryNext(copy, "reset", "Something new")).toBeNull();
    // A lost reset reply already says to sign in first; nothing is added that could read as failed or done.
    expect(recoveryNext(copy, "reset", "The reset outcome could not be confirmed. Try signing in with your new password before requesting another code.")).toBeNull();
  });
});
