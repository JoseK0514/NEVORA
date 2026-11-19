"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AuthLang } from "@/lib/auth-copy";
import { registeredEmail, type RegistrationCommand } from "@/lib/onboarding/contracts";
import { readRegistration, signupRequest, type RegistrationOutcome } from "@/lib/onboarding/signup-client";
import { SIGNUP_COPY, fill } from "@/lib/onboarding/signup-copy";
import { FieldError, NotConfirmed, SignupHeader, SignupNote, focusTitle } from "@/components/onboarding/signup-ui";

type Phase = "form" | "sending" | "sent" | "unknown" | "checking";

/** Signup step 1: email and current-policy consent, POST /api/onboarding/registrations. The acknowledgement is generic
 * by contract (it never says whether an address exists or can sign up). A lost or uncertain response replays the exact
 * original command, operation ID included; "Send it again" is a new user action with a new operation ID. */
export function SignupForm({ lang, mode, termsVersion, privacyVersion }: { lang: AuthLang; mode: "open" | "private"; termsVersion: string; privacyVersion: string }) {
  const t = SIGNUP_COPY[lang], s = t.signup;
  const [phase, setPhase] = useState<Phase>("form");
  const [email, setEmail] = useState(""), [agreed, setAgreed] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null), [agreeError, setAgreeError] = useState(false);
  const [notice, setNotice] = useState<{ tone: "red" | "amber"; text: string } | null>(null);
  const [wait, setWait] = useState(0), [sentTo, setSentTo] = useState("");
  const command = useRef<RegistrationCommand | null>(null), busy = useRef(false), mounted = useRef(true), uncertain = useRef(false);
  const unknownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  // The resend wait counts down in whole seconds while the acknowledgement is on screen.
  useEffect(() => {
    if (phase !== "sent" || wait <= 0) return;
    const timer = setTimeout(() => setWait(w => Math.max(0, w - 1)), 1000);
    return () => clearTimeout(timer);
  }, [phase, wait]);

  function apply(outcome: RegistrationOutcome) {
    if (outcome.state === "requested") {
      uncertain.current = false; setWait(Math.ceil(outcome.resendAfterMs / 1000)); setSentTo(command.current?.email ?? ""); setPhase("sent"); focusTitle(); return;
    }
    if (outcome.state === "unknown") {
      const again = uncertain.current; uncertain.current = true; setPhase("unknown");
      if (again) setNotice({ tone: "amber", text: t.unknown.stillUnsure }); else requestAnimationFrame(() => unknownRef.current?.focus());
      return;
    }
    if (uncertain.current && (outcome.state === "limited" || (outcome.state === "unavailable" && outcome.reasonCode !== "ONBOARDING_DISABLED"))) {
      // The first send is still unconfirmed: keep the exact command (the contract replays the original POST).
      setPhase("unknown"); setNotice({ tone: "amber", text: t.unknown.stillUnsure }); return;
    }
    // A definite answer retires the command: the next submit is a new request.
    command.current = null; uncertain.current = false; setPhase("form");
    if (outcome.state === "invalid") {
      if (outcome.fieldErrors.some(e => e.code === "POLICY_VERSION_CHANGED")) setNotice({ tone: "amber", text: s.policyChanged });
      else { setEmailError(s.emailInvalid); requestAnimationFrame(() => document.getElementById("signup-email")?.focus()); }
    } else if (outcome.state === "conflict") setNotice({ tone: "red", text: s.changedRequest });
    else if (outcome.state === "limited") setNotice({ tone: "amber", text: fill(s.limited, { minutes: Math.max(1, Math.ceil(outcome.retryAfterMs / 60000)) }) });
    else setNotice({ tone: "red", text: outcome.reasonCode === "ONBOARDING_DISABLED" ? s.notAllowed : outcome.reasonCode === "DELIVERY_UNAVAILABLE" ? s.deliveryUnavailable : s.unavailable });
  }

  async function send(next: Phase) {
    if (busy.current || !command.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) { setNotice({ tone: "amber", text: t.offline }); if (next === "sending") setPhase("form"); else setPhase("unknown"); return; }
    busy.current = true; setPhase(next); setNotice(null);
    const outcome = readRegistration(await signupRequest("/api/onboarding/registrations", { method: "POST", body: command.current }));
    busy.current = false;
    if (mounted.current) apply(outcome);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim(), validEmail = registeredEmail(value);
    setEmailError(validEmail ? null : s.emailInvalid); setAgreeError(!agreed); setNotice(null);
    if (!validEmail) { document.getElementById("signup-email")?.focus(); return; }
    if (!agreed) { document.getElementById("signup-agree")?.focus(); return; }
    // Keep the command if the person resubmits the same thing while it is still uncertain.
    if (!command.current || command.current.email !== value)
      command.current = { schemaVersion: 1, operationId: crypto.randomUUID(), email: value, locale: lang, termsVersion, privacyVersion };
    void send("sending");
  }

  function resend() {
    if (!command.current) return;
    command.current = { ...command.current, operationId: crypto.randomUUID() };
    void send("sending");
  }


  if (phase === "sent") {
    return <>
      <SignupHeader title={s.sentTitle} sub={fill(s.sentBody, { email: sentTo })} live />
      <div className="q-card q-auth__card su-card">
        <p className="q-auth__note">{s.sentNext}</p>
        {notice ? <SignupNote tone={notice.tone}>{notice.text}</SignupNote> : null}
        <button type="button" className="q-btn" onClick={resend} disabled={wait > 0} aria-disabled={wait > 0 || undefined}>
          {wait > 0 ? fill(s.resendIn, { seconds: wait }) : s.resend}
        </button>
      </div>
      <nav className="q-auth__links" aria-label={s.sentTitle}><a href="/onboarding">{s.otherEmail}</a></nav>
    </>;
  }

  if (phase === "unknown" || phase === "checking") return <>
    <SignupHeader title={t.unknown.title} />
    <NotConfirmed copy={t.unknown} busy={phase === "checking"} onCheck={() => void send("checking")} focusRef={unknownRef} note={notice} />
    <nav className="q-auth__links" aria-label={t.unknown.title}><a href="/onboarding">{s.otherEmail}</a></nav>
  </>;

  const sending = phase === "sending";
  return <>
    <SignupHeader title={s.title} sub={s.sub} />
    <form className="q-auth__form su-form" onSubmit={submit} noValidate aria-busy={sending || undefined}>
      {mode === "private" ? <SignupNote tone="teal" icon="info">{s.privateTest}</SignupNote> : null}
      {notice ? <SignupNote tone={notice.tone}>{notice.text}</SignupNote> : null}
      <fieldset className="q-auth__fields" disabled={sending}>
        <div className="q-fl" data-invalid={emailError ? "true" : undefined}>
          <label htmlFor="signup-email">{s.email}</label>
          <input id="signup-email" className="q-in" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254}
            value={email} onChange={event => { setEmail(event.target.value); if (emailError) setEmailError(null); }}
            aria-invalid={emailError ? true : undefined} aria-describedby={emailError ? "signup-email-error" : undefined} />
          <FieldError id="signup-email-error">{emailError}</FieldError>
        </div>
        <label className="su-consent" data-invalid={agreeError ? "true" : undefined}>
          <input id="signup-agree" type="checkbox" checked={agreed} onChange={event => { setAgreed(event.target.checked); if (event.target.checked) setAgreeError(false); }}
            aria-invalid={agreeError || undefined} aria-describedby={agreeError ? "signup-agree-error" : undefined} />
          <span>{s.agreeBefore}<Link href="/terms" target="_blank" rel="noopener">{s.terms}</Link>{s.agreeMiddle}<Link href="/privacy" target="_blank" rel="noopener">{s.privacy}</Link>{s.agreeAfter}</span>
        </label>
        <FieldError id="signup-agree-error">{agreeError ? s.agreeRequired : null}</FieldError>
      </fieldset>
      <button type="submit" className="q-btn" disabled={sending} aria-busy={sending || undefined}>{sending ? s.submitting : s.submit}</button>
    </form>
  </>;
}
