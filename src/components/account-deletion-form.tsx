"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { requestAccountDeletion, type DeletionFormState } from "@/app/app/account/delete/actions";
import { logout } from "@/app/login/actions";
import { useFieldErrors } from "@/app/app/settings/wave-c-form";
import { SUPPORT_EMAIL } from "@/lib/legal/policies";
import { QuietGroup, QuietHeader, QuietList, QuietNav, QuietRow } from "./quiet/quiet";
import { SheetRow } from "./quiet/quiet-sheet";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { EmployeeDeletionView, type DeletionView } from "./employee-mobile/deletion";

type Account = { name: string; role: string; employeeId: string; roleKey?: "OWNER" | "MANAGER" | "LEAD" | "EMPLOYEE" };
type Done = Extract<DeletionFormState, { reference: string }>;
const RECEIPT = new Set(["received", "duplicate"]);

const ANNOUNCED = new Set(["received", "duplicate", "failed", "unavailable", "uncertain", "busy", "signed_out", "changed"]);

const unresolved = (token: string) => <mark className="legal-unresolved">[CONFIRM_{token}]</mark>;

/** One owner for the whole page, mounted across resize and rotation so a receipt or an unknown outcome is never
 * dropped by a layout change. Employee/Lead phones get the teal presentation; everyone else keeps Quiet.
 * A rejected action call (lost reply, server error) is unknown, not a failure: the page keeps the form and asks
 * the same question again, which returns the saved request if there is one.
 * Quiet (v4, inspection Oct 24): grouped rows on the white page for every role; the wording is unchanged. */
export function AccountDeletionForm({ account, period, retention, existing, owner = false, workplaceName = null }: {
  account: Account; period: string | null; retention: string | null; existing: Done | null; owner?: boolean; workplaceName?: string | null;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [shown, setShown] = useState(false);
  // Uncontrolled on purpose: React would otherwise mirror a controlled value into the DOM value attribute. The typed
  // text lives only in this mounted ref, so a resize that swaps presentations keeps it.
  const typed = useRef("");
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const forget = () => { typed.current = ""; if (passwordRef.current) passwordRef.current.value = ""; };
  const bindPassword = useCallback((input: HTMLInputElement | null) => { passwordRef.current = input; if (input && typed.current && !input.value) input.value = typed.current; }, []);
  const [retry, setRetry] = useState(false);
  const [state, action, pending] = useActionState<DeletionFormState, FormData>(async (previous, formData) => {
    let next: DeletionFormState;
    try { next = await requestAccountDeletion(previous, formData); } catch { next = { kind: "uncertain" }; }
    if (next.kind === "uncertain") setRetry(true);
    // The password is held only while it can still be needed for this account's request.
    // React resets an action form's uncontrolled fields after every reply; forget the copy too, so a later resize
    // can't bring back a password the page no longer shows. Each retry is a deliberate re-entry.
    forget();
    if (next.kind !== "idle") setShown(false);
    return next;
  }, existing ?? { kind: "idle" });
  // Board E-DeleteAccount: Employees and Leads get the corporate page on every width; other roles keep Quiet.
  const phone = account.roleKey === "EMPLOYEE" || account.roleKey === "LEAD";
  const outcome = useRef<HTMLDivElement>(null);
  const { errors, handlers } = useFieldErrors({ password: { missing: "Enter your password to confirm it’s you." } });
  const receipt = RECEIPT.has(state.kind);

  useEffect(() => {
    // One response, one announcement: focus the outcome, or the password it rejected.
    const frame = requestAnimationFrame(() => (state.kind === "wrong_password" ? passwordRef : ANNOUNCED.has(state.kind) ? outcome : null)?.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [state]);

  if (phone) {
    const view: DeletionView = { state, pending, retry, confirmed, shown, period, retention };
    return <EmployeeDeletionView account={account} view={view} action={action} outcomeRef={outcome} passwordRef={bindPassword}
      onPassword={value => { typed.current = value; }} onShown={() => setShown(value => !value)} onConfirmed={setConfirmed} workplace={workplaceName} />;
  }

  const header = <><QuietNav back={receipt ? undefined : { href: "/app/profile", label: "Profile" }} /><QuietHeader title="Delete your NEVORA account" sub="Read what happens before you confirm." /></>;
  const workplace = <QuietGroup id="deletion-workplace" label="Your job and your workplace">
    <p className="q-help">Deleting your NEVORA account doesn’t end your employment or remove records your employer has to keep.</p>
    {owner ? <p className="q-help">Your company’s workspace stays open for the rest of your team. To close it, email {SUPPORT_EMAIL}.</p> : null}
  </QuietGroup>;

  if (state.kind === "received" || state.kind === "duplicate") {
    return <>{header}
      <section className="q-deletion" aria-labelledby="deletion-done-title">
        <div className="q-deletion__done" ref={outcome} tabIndex={-1} role="status" aria-labelledby="deletion-done-title">
          <CheckCircleIcon className="q-ic q-deletion__done-icon" weight="fill" aria-hidden="true" />
          <h2 id="deletion-done-title">{state.kind === "received" ? "Your deletion request has been received." : "A deletion request is already in progress."}</h2>
          <p>Reference <strong className="ad-reference">{state.reference}</strong></p>
        </div>
        <div className="q-body">
          <p>You’ve been signed out on every device and can’t sign in again. We aim to delete your account within {period ?? unresolved("DELETION_COMPLETION_PERIOD")}.</p>
          <p>To ask about your request, email <a className="q-link" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Account deletion ${state.reference}`)}`}>{SUPPORT_EMAIL}</a> with your reference. Keep it somewhere safe; we won’t ask for your password.</p>
        </div>
        <form action={logout}><button type="submit" className="q-btn q-btn--sec">Done</button></form>
      </section>
      {workplace}
    </>;
  }

  if (state.kind === "signed_out" || state.kind === "changed") {
    return <>{header}
      <div className="q-deletion__alert" ref={outcome} tabIndex={-1} role="alert">
        <p className="q-error"><b>{state.kind === "signed_out" ? "You’re signed out" : "A different account is signed in"}</b></p>
        <p className="q-help">{state.kind === "signed_out" ? "We didn’t find a deletion request for this account, so nothing was deleted. Sign in again to continue." : "Nothing was sent. Go to Profile to see the account that’s signed in now."}</p>
        <Link className="q-btn q-btn--sec" href={state.kind === "signed_out" ? "/login" : "/app/profile"}>{state.kind === "signed_out" ? "Sign in" : "Go to Profile"}</Link>
      </div>
      {workplace}
    </>;
  }

  const passwordError = state.kind === "wrong_password" ? "That password isn’t right. Try again." : errors.password;
  const checking = retry && state.kind !== "failed";
  return <>{header}
    <form action={action} noValidate className="q-deletion" aria-label="Delete your NEVORA account" aria-busy={pending}
      onSubmit={event => { if (!event.currentTarget.checkValidity()) event.preventDefault(); }} {...handlers}>
      <input type="hidden" name="account" value={account.employeeId} />
      <input type="hidden" name="retry" value={retry ? "1" : "0"} />
      <QuietGroup id="deletion-account" label="Your account">
        <QuietList>
          <QuietRow one title="Name" value={account.name} tone="l" />
          <QuietRow one title="Role" value={account.role} tone="l" />
          <QuietRow one title="Employee ID" value={account.employeeId} tone="l" />
        </QuietList>
      </QuietGroup>
      {/* v5 (Jose approved the regrouping, Oct 24): the same sentences as rows; the retention schedule opens from "What may be kept". */}
      <QuietGroup id="deletion-effects" label="What happens">
        <QuietList>
          <li><div className="q-row q-row--av q-deletion__fact"><span className="q-av" aria-hidden="true"><SignOutIcon className="q-ic" /></span>
            <span className="q-rt"><b>Your access ends now.</b><i>You’re signed out on every device and can’t sign in again. Calendar feed links stop working.</i></span></div></li>
          <li><div className="q-row q-row--av q-deletion__fact"><span className="q-av" aria-hidden="true"><TrashIcon className="q-ic" /></span>
            <span className="q-rt"><b>What is removed</b><i>Your profile, sign-in details, notification subscriptions, calendar links and the content you contributed, within {period ?? unresolved("DELETION_COMPLETION_PERIOD")}.</i></span></div></li>
          <SheetRow sheetTitle="What may be kept" avatar={<ShieldCheckIcon className="q-ic" />} title="What may be kept"
            detail="Some attendance, payroll, security or dispute records your employer or we must keep. They’re restricted and never used to restore your account.">
            <div className="q-hd"><h1>What may be kept</h1></div>
            <div className="q-body q-deletion__effects">
              <p>Some attendance, payroll, security or dispute records your employer or we must keep: {retention ?? unresolved("RETENTION_SCHEDULE")} They’re restricted and never used to restore your account.</p>
              <p><Link className="q-link" href="/account-deletion">Read the full details</Link></p>
            </div>
          </SheetRow>
        </QuietList>
      </QuietGroup>
      <QuietGroup id="deletion-confirm" label="Confirm it’s you">
        <div className="q-fl q-deletion__field">
          <label htmlFor="deletion-password">Password</label>
          <div className="q-in__wrap">
            <input ref={bindPassword} className="q-in" id="deletion-password" name="password" type={shown ? "text" : "password"} required autoComplete="current-password" disabled={pending} placeholder="Password"
              onChange={event => { typed.current = event.target.value; }}
              aria-describedby={passwordError ? "deletion-password-help deletion-password-error" : "deletion-password-help"} aria-invalid={passwordError ? true : undefined} />
            <button type="button" className="q-in__eye" onClick={() => setShown(value => !value)} aria-pressed={shown} aria-label={shown ? "Hide password" : "Show password"}>{shown ? <EyeSlashIcon className="q-ic" aria-hidden="true" /> : <EyeIcon className="q-ic" aria-hidden="true" />}</button>
          </div>
          <p className="q-fl__help" id="deletion-password-help">Enter the password you use to sign in.</p>
          {passwordError ? <p className="q-fl__error" id="deletion-password-error">{passwordError}</p> : null}
        </div>
        <QuietList>
          <li><label className="q-row q-deletion__check"><span className="q-rt"><b>I understand my NEVORA account will be deleted and I won’t be able to sign in again.</b></span>
            <input type="checkbox" className="q-tog" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={pending} /></label></li>
        </QuietList>
      </QuietGroup>
      {state.kind === "failed" || state.kind === "unavailable" || state.kind === "uncertain" || state.kind === "busy" || (checking && state.kind === "wrong_password") ? <div className="q-deletion__alert" ref={outcome} tabIndex={-1} role="alert">
        <p className="q-error"><b>{state.kind === "failed" ? "We could not submit your request. Please try again." : state.kind === "unavailable" ? "Account deletion isn’t available right now" : state.kind === "busy" ? "Too many tries" : "We couldn’t confirm your request"}</b></p>
        <p className="q-help">{state.kind === "failed" ? "Nothing was saved and you’re still signed in." : state.kind === "unavailable" ? <>Email <a className="q-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we’ll help you.</>
          : state.kind === "busy" ? (checking ? "Wait about 15 minutes, then check again. We still haven’t confirmed whether your request was saved." : "Wait about 15 minutes, then try again. Nothing was sent.")
          : <>Your request may have been saved. Check your request to find out; if it wasn’t saved, it’s sent again. You can also email <a className="q-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</>}</p>
      </div> : null}
      <button type="submit" className="q-btn q-deletion__confirm" disabled={pending || !confirmed}>{pending ? (checking ? "Checking…" : "Sending request…") : checking ? "Check my request" : "Confirm deletion request"}</button>
      <Link className="q-btn q-btn--quiet q-deletion__keep" href="/app/profile" aria-disabled={pending || undefined} tabIndex={pending ? -1 : undefined}
        onClick={event => { if (pending) event.preventDefault(); }}>Keep my account</Link>
    </form>
    {workplace}
  </>;
}
