"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { requestAccountDeletion, type DeletionFormState } from "@/app/app/account/delete/actions";
import { logout } from "@/app/login/actions";
import { useFieldErrors } from "@/app/app/settings/wave-c-form";
import { SUPPORT_EMAIL } from "@/lib/legal/policies";
import { QuietGroup, QuietList, QuietRow } from "./quiet/quiet";
import { SheetRow } from "./quiet/quiet-sheet";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";

type Account = { name: string; role: string; employeeId: string };
type Done = Extract<DeletionFormState, { reference: string }>;

const unresolved = (token: string) => <mark className="legal-unresolved">[CONFIRM_{token}]</mark>;

/** Review, confirm with the password, then the outcome. Every state the spec lists: review, confirm,
 * submitted, already in progress, wrong password, failure and unavailable.
 * Quiet (v4, inspection Oct 24): grouped rows on the white page for every role; the wording is unchanged. */
export function AccountDeletionForm({ account, period, retention, existing }: {
  account: Account; period: string | null; retention: string | null; existing: Done | null;
}) {
  const [state, action, pending] = useActionState<DeletionFormState, FormData>(requestAccountDeletion, existing ?? { kind: "idle" });
  const [confirmed, setConfirmed] = useState(false);
  const [shown, setShown] = useState(false);
  const outcome = useRef<HTMLDivElement>(null);
  const password = useRef<HTMLInputElement>(null);
  const { errors, handlers } = useFieldErrors({ password: { missing: "Enter your password to confirm it’s you." } });

  useEffect(() => {
    if (state.kind === "received" || state.kind === "duplicate" || state.kind === "failed" || state.kind === "unavailable") outcome.current?.focus();
    else if (state.kind === "wrong_password") password.current?.focus();
  }, [state]);

  if (state.kind === "received" || state.kind === "duplicate") {
    return (
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
    );
  }

  const passwordError = state.kind === "wrong_password" ? "That password isn’t right. Try again." : errors.password;
  return (
    <form action={action} noValidate className="q-deletion" aria-label="Delete your NEVORA account" aria-busy={pending}
      onSubmit={event => { if (!event.currentTarget.checkValidity()) event.preventDefault(); }} {...handlers}>
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
            <input ref={password} className="q-in" id="deletion-password" name="password" type={shown ? "text" : "password"} required autoComplete="current-password" disabled={pending} placeholder="Password"
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
      {state.kind === "failed" || state.kind === "unavailable" ? <div className="q-deletion__alert" ref={outcome} tabIndex={-1} role="alert">
        <p className="q-error"><b>{state.kind === "failed" ? "We could not submit your request. Please try again." : "Account deletion isn’t available right now"}</b></p>
        <p className="q-help">{state.kind === "failed" ? "Nothing was deleted and you’re still signed in." : <>Email <a className="q-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we’ll help you.</>}</p>
      </div> : null}
      <button type="submit" className="q-btn q-deletion__confirm" disabled={pending || !confirmed}>{pending ? "Sending request…" : "Confirm deletion request"}</button>
      <Link className="q-btn q-btn--quiet q-deletion__keep" href="/app/profile" aria-disabled={pending || undefined} tabIndex={pending ? -1 : undefined}
        onClick={event => { if (pending) event.preventDefault(); }}>Keep my account</Link>
    </form>
  );
}
