"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import type { AuthLang } from "@/lib/auth-copy";
import { isPasswordRejection, isPasswordTooLong, passwordRejectionMessage } from "@/lib/auth/password-requirements";
import { readActivation, signupRequest, takeFragmentProof } from "@/lib/onboarding/signup-client";
import { SIGNUP_COPY, fill } from "@/lib/onboarding/signup-copy";
import { ActivationPasswords } from "../../activate/activation-passwords";
import { AuthValidation } from "@/components/auth-premium/auth-validation";
import { KeepProofForLanguage, NotConfirmed, SignupHeader, SignupNote, SignupSteps, focusTitle } from "@/components/onboarding/signup-ui";

type Phase = "checking" | "missing" | "ready" | "sending" | "finishing" | "unknown" | "checking-again" | "activated" | "invalid" | "used" | "limited";
type Body = { schemaVersion: 1; operationId: string; proof: string; password: string };

/** Initial Owner activation on the new workplace's own host (SCRUM-190): `/onboarding/activate#proof=…`, reached only
 * from the signup's single-use grant. The proof is scrubbed before paint and kept in memory (and, while it is still
 * needed, in the hidden field the shared language switch carries through its reload). The password is memory only.
 *
 * Replay rules (Nov 11 closeout): a 202 means the credential may already be committed, so from the first 202 or
 * uncertain reply the body is never retired by a temporary refusal (503, 429, lost reply). It is replayed identically,
 * after the server's pollAfterMs or when the connection returns, until a definite answer. Only 200 activated/SIGN_IN
 * permits normal sign-in; activation never signs anyone in by itself. */
export function OwnerActivation({ lang, workspaceName, signupResumeUrl }: { lang: AuthLang; workspaceName: string | null; signupResumeUrl: string | null }) {
  const t = SIGNUP_COPY[lang], a = t.activate;
  const [phase, setPhase] = useState<Phase>("checking");
  const [mismatch, setMismatch] = useState(false), [formVersion, setFormVersion] = useState(0);
  const [notice, setNotice] = useState<{ tone: "red" | "amber"; text: string } | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null), [heldProof, setHeldProof] = useState<string | null>(null);
  const proof = useRef<string | null>(null), body = useRef<Body | null>(null), committedMaybe = useRef(false);
  const mounted = useRef(true), started = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unknownRef = useRef<HTMLDivElement | null>(null), formRef = useRef<HTMLFormElement | null>(null);
  const phaseRef = useRef<Phase>("checking");
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Scrub before paint, exactly once (StrictMode replays effects; `started` keeps custody single).
  useLayoutEffect(() => {
    mounted.current = true;
    if (!started.current) {
      started.current = true;
      let taken: { proof: string | null; hadFragment: boolean };
      try { taken = takeFragmentProof(window.location, window.history); window.history.replaceState(null, "", window.location.pathname); }
      catch { window.location.replace("/onboarding/activate"); return; }
      proof.current = taken.proof;
      const next: Phase = taken.proof ? "ready" : taken.hadFragment ? "invalid" : "missing";
      queueMicrotask(() => { if (mounted.current) { setHeldProof(taken.proof); setPhase(next); } });
    }
    return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); };
  }, []);
  // A replay waiting on the connection resumes when it returns.
  useEffect(() => {
    const online = () => { if (body.current && committedMaybe.current && phaseRef.current === "unknown") void send("checking-again"); };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  });

  function finish(next: Phase) { if (!mounted.current) return; setPhase(next); focusTitle(); }
  function release() { body.current = null; proof.current = null; committedMaybe.current = false; setHeldProof(null); formRef.current?.reset(); }
  function later(ms: number) { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { timer.current = null; void send("finishing"); }, ms); }

  async function send(next: "sending" | "checking-again" | "finishing") {
    if (!body.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      // A user's first attempt stops here with nothing sent. A replay already in flight waits for the connection.
      setNotice({ tone: "amber", text: t.offline });
      if (next === "sending") { body.current = null; setPhase("ready"); } else setPhase("unknown");
      return;
    }
    setPhase(next); setNotice(null);
    const outcome = readActivation(await signupRequest("/api/onboarding/owner-activation", { method: "POST", body: body.current, timeoutMs: 30000 }));
    if (!mounted.current) return;
    if (outcome.state === "activated") { release(); setEmployeeId(outcome.employeeId); finish("activated"); return; }
    if (outcome.state === "pending") { committedMaybe.current = true; setPhase("finishing"); later(outcome.pollAfterMs); return; }
    if (outcome.state === "unknown") { committedMaybe.current = true; setPhase("unknown"); if (next !== "checking-again") requestAnimationFrame(() => unknownRef.current?.focus()); else setNotice({ tone: "amber", text: t.unknown.stillUnsure }); return; }
    if (outcome.state === "invalid") { release(); finish("invalid"); return; }
    if (outcome.state === "conflict") { release(); finish("used"); return; }
    if (outcome.state === "limited") { release(); finish("limited"); return; }
    if (committedMaybe.current) {
      // Temporary refusal after a possible commit: keep the identical body; never offer a second password.
      setPhase("unknown"); setNotice({ tone: "amber", text: t.unknown.stillUnsure }); return;
    }
    body.current = null; setPhase("ready");
    if (outcome.state === "password") {
      setNotice({ tone: "red", text: isPasswordRejection(outcome.reason) ? passwordRejectionMessage(lang, outcome.reason) : a.unavailable });
      setFormVersion(n => n + 1); return;
    }
    setNotice({ tone: "red", text: a.unavailable });
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

  const keep = <KeepProofForLanguage proof={heldProof} />;
  const back = signupResumeUrl ? <nav className="q-auth__links" aria-label={a.backToSignup}><a href={signupResumeUrl}>{a.backToSignup}</a></nav> : null;
  const backCard = signupResumeUrl ? <div className="q-card q-auth__card su-card"><a className="q-btn" href={signupResumeUrl}>{a.backToSignup}</a></div> : null;
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
  if (phase === "invalid") return <><SignupHeader title={a.invalidTitle} sub={a.invalidBody} />{backCard}</>;
  if (phase === "limited") return <><SignupHeader title={a.limitedTitle} sub={a.limitedBody} />{backCard}</>;
  if (phase === "used") return <><SignupHeader title={a.usedTitle} sub={a.usedBody} /><div className="q-card q-auth__card su-card"><Link className="q-btn" href="/login">{a.signIn}</Link></div>{back}</>;
  if (phase === "missing") return <><SignupHeader title={a.missingTitle} sub={a.missingBody} />{backCard}</>;
  if (phase === "unknown" || phase === "checking-again") return <>{keep}<SignupHeader title={t.unknown.title} />
    <NotConfirmed copy={t.unknown} busy={phase === "checking-again"} onCheck={() => void send("checking-again")} focusRef={unknownRef} note={notice} /></>;

  const busy = phase === "sending" || phase === "finishing";
  return <>
    {keep}
    <SignupHeader title={a.title} sub={phase === "finishing" ? <><span className="sig-btn__spin su-wait" aria-hidden="true" />{a.finishing}</> : sub} live={phase === "finishing"} />
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
