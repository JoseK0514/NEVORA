"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AuthLang } from "@/lib/auth-copy";
import { isPasswordRejection, isPasswordTooLong, passwordRejectionMessage } from "@/lib/auth/password-requirements";
import { readActivation, signupRequest, takeFragmentProof } from "@/lib/onboarding/signup-client";
import { SIGNUP_COPY, fill } from "@/lib/onboarding/signup-copy";
import { ActivationPasswords } from "../../activate/activation-passwords";
import { AuthValidation } from "@/components/auth-premium/auth-validation";
import { NotConfirmed, SignupHeader, SignupNote, SignupSteps, focusTitle } from "@/components/onboarding/signup-ui";

type Phase = "checking" | "missing" | "ready" | "sending" | "finishing" | "unknown" | "checking-again" | "activated" | "invalid" | "used";
type Body = { schemaVersion: 1; operationId: string; proof: string; password: string };

/** Initial Owner activation on the new workplace's own host (SCRUM-190): `/onboarding/activate#proof=…`, reached only
 * from the signup's single-use grant. The proof is scrubbed before anything else and, with the password, kept in memory
 * only. A 202 (the workplace is still finishing) or a lost response replays the identical body with the same operation
 * ID; only 200 activated/SIGN_IN permits normal sign-in. Activation never signs anyone in by itself. */
export function OwnerActivation({ lang, workspaceName, signupResumeUrl }: { lang: AuthLang; workspaceName: string | null; signupResumeUrl: string | null }) {
  const t = SIGNUP_COPY[lang], a = t.activate;
  const [phase, setPhase] = useState<Phase>("checking");
  const [mismatch, setMismatch] = useState(false), [formVersion, setFormVersion] = useState(0);
  const [notice, setNotice] = useState<{ tone: "red" | "amber"; text: string } | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const proof = useRef<string | null>(null), body = useRef<Body | null>(null), mounted = useRef(true), started = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), unknownRef = useRef<HTMLDivElement | null>(null), formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    mounted.current = true;
    if (!started.current) {
      started.current = true;
      let taken: { proof: string | null; hadFragment: boolean };
      try { taken = takeFragmentProof(window.location, window.history); window.history.replaceState(null, "", window.location.pathname); }
      catch { window.location.replace("/onboarding/activate"); return; }
      proof.current = taken.proof;
      // Published after the effect, as the employee activation page does, so the scrub always runs first.
      const next: Phase = taken.proof ? "ready" : taken.hadFragment ? "invalid" : "missing";
      queueMicrotask(() => { if (mounted.current) setPhase(next); });
    }
    return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); };
  }, []);

  function finish(next: Phase) { if (!mounted.current) return; setPhase(next); focusTitle(); }

  async function send(next: "sending" | "checking-again" | "finishing") {
    if (!body.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) { setNotice({ tone: "amber", text: t.offline }); if (next === "sending") setPhase("ready"); return; }
    setPhase(next); setNotice(null);
    const outcome = readActivation(await signupRequest("/api/onboarding/owner-activation", { method: "POST", body: body.current, timeoutMs: 30000 }));
    if (!mounted.current) return;
    if (outcome.state === "activated") {
      body.current = null; proof.current = null; formRef.current?.reset();
      setEmployeeId(outcome.employeeId); finish("activated"); return;
    }
    if (outcome.state === "pending") { setPhase("finishing"); timer.current = setTimeout(() => void send("finishing"), outcome.pollAfterMs); return; }
    if (outcome.state === "unknown") { setPhase("unknown"); requestAnimationFrame(() => unknownRef.current?.focus()); return; }
    // Definite answers retire this body: a new attempt is a new command.
    body.current = null;
    if (outcome.state === "password") {
      setPhase("ready");
      setNotice({ tone: "red", text: isPasswordRejection(outcome.reason) ? passwordRejectionMessage(lang, outcome.reason) : a.unavailable });
      setFormVersion(n => n + 1); return;
    }
    if (outcome.state === "invalid") { proof.current = null; formRef.current?.reset(); finish("invalid"); return; }
    if (outcome.state === "conflict") { proof.current = null; formRef.current?.reset(); finish("used"); return; }
    setPhase("ready");
    setNotice({ tone: outcome.state === "limited" ? "amber" : "red", text: outcome.state === "limited" ? a.limited : a.unavailable });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!proof.current || phase !== "ready" || !form.reportValidity()) return;
    const fields = new FormData(form), password = String(fields.get("password") ?? "");
    setNotice(null);
    if (isPasswordTooLong(password)) { setMismatch(false); setNotice({ tone: "red", text: passwordRejectionMessage(lang, "too_long") }); return; }
    if (password !== fields.get("confirmPassword")) { setMismatch(true); form.querySelector<HTMLInputElement>('[name="confirmPassword"]')?.focus(); return; }
    setMismatch(false);
    body.current = { schemaVersion: 1, operationId: crypto.randomUUID(), proof: proof.current, password };
    void send("sending");
  }

  const back = signupResumeUrl ? <nav className="q-auth__links" aria-label={a.backToSignup}><a href={signupResumeUrl}>{a.backToSignup}</a></nav> : null;
  const sub = workspaceName ? fill(a.sub, { workspace: workspaceName }) : a.subNoWorkspace;

  if (phase === "checking") return <SignupHeader title={a.title} />;
  if (phase === "activated" && employeeId) return <>
    <SignupHeader done title={a.doneTitle} sub={a.doneBody} />
    <div className="q-card q-auth__card su-card" role="status">
      <SignupSteps current={3} c={t.progress} />
      <div className="q-fl"><label htmlFor="su-owner-id">{a.idLabel}</label>
        <input id="su-owner-id" className="q-in su-id" value={employeeId} readOnly autoComplete="off" onFocus={event => event.currentTarget.select()} /></div>
      <Link href="/login" className="q-btn">{a.signIn}</Link>
    </div>
  </>;
  if (phase === "invalid") return <><SignupHeader title={a.invalidTitle} sub={a.invalidBody} />{signupResumeUrl ? <div className="q-card q-auth__card su-card"><a className="q-btn" href={signupResumeUrl}>{a.backToSignup}</a></div> : null}</>;
  if (phase === "used") return <><SignupHeader title={a.usedTitle} sub={a.usedBody} /><div className="q-card q-auth__card su-card"><Link className="q-btn" href="/login">{a.signIn}</Link></div>{back}</>;
  if (phase === "missing") return <><SignupHeader title={a.missingTitle} sub={a.missingBody} />{signupResumeUrl ? <div className="q-card q-auth__card su-card"><a className="q-btn" href={signupResumeUrl}>{a.backToSignup}</a></div> : null}</>;
  if (phase === "unknown" || phase === "checking-again") return <><SignupHeader title={t.unknown.title} /><NotConfirmed copy={t.unknown} busy={phase === "checking-again"} onCheck={() => void send("checking-again")} focusRef={unknownRef} /></>;

  const busy = phase === "sending" || phase === "finishing";
  return <>
    <SignupHeader title={a.title} sub={phase === "finishing" ? <><span className="su-wait" aria-hidden="true" />{a.finishing}</> : sub} live={phase === "finishing"} />
    <form ref={formRef} key={formVersion} className="q-auth__form activation-form su-form" onSubmit={submit} aria-busy={busy || undefined}>
      <AuthValidation />
      <SignupSteps current={2} c={t.progress} />
      {notice ? <SignupNote tone={notice.tone}>{notice.text}</SignupNote> : null}
      <fieldset className="q-auth__fields" disabled={busy}>
        <ActivationPasswords quiet lang={lang} mismatch={mismatch} />
      </fieldset>
      <button type="submit" className="q-btn" disabled={busy} aria-busy={busy || undefined}>{busy ? a.submitting : a.submit}</button>
    </form>
  </>;
}
