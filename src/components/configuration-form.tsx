"use client";

import { BCallout } from '@/components/owner-b/b-kit';
import { unstable_rethrow } from "next/navigation";
import { useRef, useState, type ReactNode, type FormEvent } from "react";
import { ShiftReviewRecovery, shiftDraftText } from "./shift-review-recovery";
import { SMALL_PARTS_COPY } from "./small-parts-copy";
import { serverActionStarted } from "@/lib/server-action-flight";
export type ConfigurationResult = { error?: string; success?: string; updatedAt?: string; issueCode?: string };

/** QA A3-01 (Nov 21, 2026): a lost or failed reply doesn't tell us whether the server saved. The shift may already be on
 * the schedule, so say that, keep the entries, and point to the shift's own day instead of inviting a blind second save. */
export const UNCONFIRMED_SHIFT = "This change could not be confirmed. It may already be on the schedule; check it before you save again. Your entries are kept.";
export const UNCONFIRMED_CHANGE = "This change could not be confirmed. It may already be saved; reload to check before you save again. Your entries are kept until you reload.";
/** After an unconfirmed save, an overlap may be the person's own saved shift (QA A3-01). */
export const UNCONFIRMED_OVERLAP = "This time overlaps a shift already on the schedule. It may be the one you just saved; check the schedule before you change anything.";

/** True for the errors Next.js throws to navigate (redirect, not-found); `unstable_rethrow` rethrows exactly those. */
function isNavigation(error: unknown): boolean {
  try { unstable_rethrow(error); return false; } catch { return true; }
}

/** The day the server returns to after a saved shift (`shiftReturnUrl` in schedule/actions.ts), from the submitted fields. */
export function shiftCheckHref(data: FormData): string | null {
  const field = (name: string) => String(data.get(name) ?? "").trim();
  const weekStart = field("weekStart"), locationId = field("locationId"), date = field("date");
  if (!weekStart || !locationId || !date) return null;
  const employeeId = field("employeeId").toUpperCase();
  return `/app/schedule?week=${encodeURIComponent(weekStart)}&location=${encodeURIComponent(locationId)}&day=${encodeURIComponent(date)}`
    + (employeeId ? `#schedule-employee-${encodeURIComponent(employeeId)}` : "");
}
/** Keep entered values on validation/network failure; each form owns its feedback. */
export function ConfigurationForm({
  action,
  children,
  className = "employee-form",
  reviewedUpdatedAt,
  reviewedShiftVersion,
  id,
  holdAfterUnconfirmed = false,
  unconfirmedCheck,
  pendingFeedback,
}: {
  action: (data: FormData) => Promise<ConfigurationResult>;
  children: ReactNode;
  className?: string;
  reviewedUpdatedAt?: string;
  reviewedShiftVersion?: string;
  /** Quiet (v4): lets a submit in the page's top bar (form="…") send this form. */
  id?: string;
  /** A location Manager's shift form: after an unconfirmed save the fields stay locked until the schedule is checked
   * (the scoped editor's rule; the check link opens the shift's day). */
  holdAfterUnconfirmed?: boolean;
  /** A form that knows a better place to check after an unconfirmed outcome (G58: Review replacement checks Find cover):
   * its note and its check link replace the generic ones. */
  pendingFeedback?: { label: string; onChange: (pending: boolean) => void; lang?: "en" | "es" };
  unconfirmedCheck?: { title: string; label: string; href: string };
}) {
  const recovery = SMALL_PARTS_COPY[pendingFeedback?.lang ?? (pendingFeedback ? "es" : "en")].configuration;
  const [result, setResult] = useState<ConfigurationResult>({});
  const [pending, setPending] = useState(false);
  // Double tap (Wave A ST, Oct 19): a second submit can arrive before the disabled fieldset renders; only one save runs.
  const inFlight = useRef(false);
  // This version belongs to the mounted editable draft. An unrelated RSC refresh
  // can update server props without replacing dirty native/controlled inputs.
  const [draftUpdatedAt, setDraftUpdatedAt] = useState(reviewedUpdatedAt);
  const [shiftVersion] = useState(reviewedShiftVersion);
  const [submittedShift, setSubmittedShift] = useState("");
  // Where to check after an unconfirmed outcome: the shift's day, or null for forms that aren't about a shift.
  const [unconfirmed, setUnconfirmed] = useState<{ href: string | null } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || (holdAfterUnconfirmed && unconfirmed)) return;
    inFlight.current = true;
    const data = new FormData(event.currentTarget);
    if (draftUpdatedAt !== undefined) data.set('expectedUpdatedAt', draftUpdatedAt);
    if (shiftVersion !== undefined) data.set('expectedReviewVersion', shiftVersion);
    if (shiftVersion !== undefined) setSubmittedShift(shiftDraftText(data));
    const checkHref = shiftCheckHref(data);
    setPending(true);
    pendingFeedback?.onChange(true);
    setResult({});
    // G58: the scoped read frame queues its refresh behind this action instead of discarding the action's redirect.
    const settled = serverActionStarted();
    try {
      const saved = await action(data);
      // An overlap right after an unconfirmed save may be the person's own shift: say so instead of implying someone else's.
      setResult(unconfirmed && saved.issueCode === "SHIFT_OVERLAP" ? { ...saved, error: recovery.unconfirmedOverlap } : saved);
      if (saved.success && !saved.error) setUnconfirmed(null);
      if (saved.success && !saved.error && saved.updatedAt && draftUpdatedAt !== undefined) setDraftUpdatedAt(saved.updatedAt);
    } catch (error) {
      // A redirect or not-found from the action is Next.js navigation, which the router is already handling: not a failure,
      // and not ours to rethrow from this event handler (nothing awaits it, so it would be an unhandled rejection).
      if (isNavigation(error)) return;
      setUnconfirmed({ href: unconfirmedCheck?.href ?? checkHref });
      setResult({ error: unconfirmedCheck?.title ?? (checkHref ? recovery.unconfirmedShift : recovery.unconfirmedChange) });
    } finally {
      settled();
      inFlight.current = false;
      setPending(false);
      pendingFeedback?.onChange(false);
    }
  }
  return (
    <form id={id} onSubmit={submit} className={className} aria-busy={pending}>
      <fieldset disabled={pending || (holdAfterUnconfirmed && !!unconfirmed)} className="configuration-fields">
        {draftUpdatedAt !== undefined ? <input type="hidden" name="expectedUpdatedAt" value={draftUpdatedAt} /> : null}
        {shiftVersion !== undefined ? <input type="hidden" name="expectedReviewVersion" value={shiftVersion} /> : null}
        {children}
      </fieldset>
      {pending ? <p role="status" className={pendingFeedback ? "b-sr" : undefined}>{pendingFeedback?.label ?? "Saving…"}</p> : null}
      {/* Refinement (Nov 20, 2026; Jose: red words on a pink bar look cheap): a refusal is the kit's note (white panel, a
        * red mark, the reason as its title), announced once. */}
      {result.error ? <div className="form-result">{unconfirmed
        // Unknown outcome: amber means "wait or check" (DESIGN.MD status colours); the action opens the shift's own day.
        ? <BCallout tone="amber" role="alert" title={result.error} action={unconfirmed.href ? { label: unconfirmedCheck?.label ?? recovery.checkSchedule, href: unconfirmed.href } : undefined} />
        : <BCallout tone="red" role="alert" title={result.error} />}</div> : null}
      {shiftVersion !== undefined && (result.issueCode === 'SHIFT_REVIEW_CONFLICT' || result.issueCode === 'ACCESS_DENIED') ? <ShiftReviewRecovery draft={submittedShift} /> : null}
      {result.success ? <div className="form-result"><BCallout tone="green" role="status" title={result.success} /></div> : null}
    </form>
  );
}
