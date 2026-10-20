"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { requestAccountDeletion, type DeletionFormState } from "@/app/app/account/delete/actions";
import { logout } from "@/app/login/actions";
import { Notice } from "@/app/app/settings/wave-c-kit";
import { ButtonLabel, Field, FieldErrors, FormActions, useFieldErrors } from "@/app/app/settings/wave-c-form";
import { SUPPORT_EMAIL } from "@/lib/legal/policies";

type Account = { name: string; role: string; employeeId: string };
type Done = Extract<DeletionFormState, { reference: string }>;

const unresolved = (token: string) => <mark className="legal-unresolved">[CONFIRM_{token}]</mark>;

/** Review, confirm with the password, then the outcome. Every state the spec lists: review, confirm,
 * submitted, already in progress, wrong password, failure and unavailable. */
export function AccountDeletionForm({ account, period, retention, existing }: {
  account: Account; period: string | null; retention: string | null; existing: Done | null;
}) {
  const [state, action, pending] = useActionState<DeletionFormState, FormData>(requestAccountDeletion, existing ?? { kind: "idle" });
  const [confirmed, setConfirmed] = useState(false);
  const outcome = useRef<HTMLDivElement>(null);
  const password = useRef<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement>(null);
  const { errors, handlers } = useFieldErrors({ password: { missing: "Enter your password to confirm it’s you." } });

  useEffect(() => {
    if (state.kind === "received" || state.kind === "duplicate" || state.kind === "failed" || state.kind === "unavailable") outcome.current?.focus();
    else if (state.kind === "wrong_password") password.current?.focus();
  }, [state]);

  if (state.kind === "received" || state.kind === "duplicate") {
    return (
      <section className="nv-card" aria-labelledby="deletion-done-title">
        <div className="wc-receipt" ref={outcome} tabIndex={-1} role="status" aria-labelledby="deletion-done-title">
          <span className="nv-tile" data-tone="done" aria-hidden="true"><CheckCircleIcon size={22} weight="fill" /></span>
          <div>
            <h2 className="nv-card__title" id="deletion-done-title">{state.kind === "received" ? "Your deletion request has been received." : "A deletion request is already in progress."}</h2>
            <p className="wc-muted">Reference <strong className="wc-strong ad-reference">{state.reference}</strong></p>
          </div>
        </div>
        <div className="nv-card__body wc-fields">
          <p>You’ve been signed out on every device and can’t sign in again. Your account is deleted within {period ?? unresolved("DELETION_COMPLETION_PERIOD")}.</p>
          <p>To ask about your request, email <a className="wc-inline-link" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Account deletion ${state.reference}`)}`}>{SUPPORT_EMAIL}</a> with your reference. Keep it somewhere safe; we won’t ask for your password.</p>
          <form action={logout}><FormActions><button type="submit" className="nv-btn" data-kind="secondary">Done</button></FormActions></form>
        </div>
      </section>
    );
  }

  return (
    <form action={action} noValidate className="wc-form" aria-label="Delete your NEVORA account" aria-busy={pending}
      onSubmit={event => { if (!event.currentTarget.checkValidity()) event.preventDefault(); }} {...handlers}>
      <section className="nv-card" aria-labelledby="deletion-account-title">
        <div className="nv-card__head"><h2 className="nv-card__title" id="deletion-account-title">Your account</h2></div>
        <div className="nv-card__body">
          <dl className="wc-facts">
            <div><dt>Name</dt><dd>{account.name}</dd></div>
            <div><dt>Role</dt><dd>{account.role}</dd></div>
            <div><dt>Employee ID</dt><dd>{account.employeeId}</dd></div>
          </dl>
        </div>
      </section>
      <section className="nv-card" aria-labelledby="deletion-effects-title">
        <div className="nv-card__head"><h2 className="nv-card__title" id="deletion-effects-title">What happens</h2></div>
        <div className="nv-card__body wc-fields ad-effects">
          <p><strong>Your access ends now.</strong> You’re signed out on every device and can’t sign in again. Calendar feed links stop working.</p>
          <p><strong>What is removed:</strong> your profile, sign-in details, notification subscriptions, calendar links and the content you contributed, within {period ?? unresolved("DELETION_COMPLETION_PERIOD")}.</p>
          <p><strong>What may be kept:</strong> some attendance, payroll, security or dispute records your employer or we must keep: {retention ?? unresolved("RETENTION_SCHEDULE")} They’re restricted and never used to restore your account.</p>
          <p><Link className="wc-inline-link" href="/account-deletion">Read the full details</Link></p>
        </div>
      </section>
      <FieldErrors errors={errors}>
        <section className="nv-card" aria-labelledby="deletion-confirm-title">
          <div className="nv-card__head"><h2 className="nv-card__title" id="deletion-confirm-title">Confirm it’s you</h2></div>
          <div className="nv-card__body wc-fields">
            <Field label="Password" help="Enter the password you use to sign in." helpId="deletion-password-help" inputRef={password}
              id="deletion-password" name="password" type="password" required autoComplete="current-password" disabled={pending}
              error={state.kind === "wrong_password" ? "That password isn’t right. Try again." : undefined} />
            <label className="wc-check ad-check"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={pending} />
              <span>I understand my NEVORA account will be deleted and I won’t be able to sign in again.</span></label>
          </div>
        </section>
      </FieldErrors>
      {state.kind === "failed" || state.kind === "unavailable" ? <div className="wc-feedback" ref={outcome} tabIndex={-1} role="alert">
        <Notice tone="urgent" title={state.kind === "failed" ? "We could not submit your request. Please try again." : "Account deletion isn’t available right now"}>
          {state.kind === "failed" ? "Nothing was deleted and you’re still signed in." : <>Email <a className="wc-inline-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we’ll help you.</>}
        </Notice>
      </div> : null}
      <FormActions>
        <button type="submit" className="nv-btn" data-kind="danger" disabled={pending || !confirmed}>
          <ButtonLabel pending={pending} idle="Confirm deletion request" busy="Sending request…" />
        </button>
        <Link className="nv-btn" data-kind="secondary" href="/app/profile" aria-disabled={pending || undefined} tabIndex={pending ? -1 : undefined}
          onClick={event => { if (pending) event.preventDefault(); }}>Keep my account</Link>
      </FormActions>
    </form>
  );
}
