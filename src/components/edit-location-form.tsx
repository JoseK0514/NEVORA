"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr/LockSimple";
import type { CatalogLocation } from "@/lib/data/locations";
import type { ConfigurationResult } from "./configuration-form";
import { lower } from "@/lib/workspace-presentation/words";

/** TC-17: the notice title already says it was updated; keep only what the server adds. */
const successBody = (text?: string) => text?.replace(/^[^.]*updated\.\s*/i, "") || undefined;
import { Status } from "./kit/kit";
import { GuideCard, Notice } from "@/app/app/settings/wave-c-kit";
import { ButtonLabel, Field, FieldErrors, FormActions, SwitchRow, useFieldErrors } from "@/app/app/settings/wave-c-form";

type Draft = Pick<CatalogLocation, "name" | "shortName" | "active">;

/** Wave C: Edit location on the kit form pattern. Save stays off until something changes;
 * a lost answer keeps the entries and asks to check Locations before trying again. */
export function EditLocationForm({ location, action, words = { location: "Location", locations: "Locations" } }: {
  location: CatalogLocation;
  action: (data: FormData) => Promise<ConfigurationResult>;
  /** Company words (B2). */
  words?: { location: string; locations: string };
}) {
  const place = lower(words.location), Places = words.locations;
  const [draft, setDraft] = useState<Draft>(() => ({ name: location.name, shortName: location.shortName, active: location.active }));
  const [saved, setSaved] = useState<Draft>(draft);
  const [result, setResult] = useState<ConfigurationResult>({});
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const dirty = draft.name !== saved.name || draft.shortName !== saved.shortName || draft.active !== saved.active;
  const clockerHref = `/clocker/${location.clockerKey}`;
  const { errors, handlers, clear } = useFieldErrors({
    name: { missing: `Enter a ${place} name.` },
    shortName: { missing: "Enter a short name." },
  });

  useEffect(() => {
    if (result.error || result.success) feedback.current?.focus();
  }, [result]);

  function change(next: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...next }));
    setResult({});
    setUnconfirmed(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !dirty) return;
    if (!event.currentTarget.checkValidity()) return;
    const data = new FormData(event.currentTarget);
    const submitted: Draft = { name: draft.name.trim(), shortName: draft.shortName.trim(), active: draft.active };
    submitting.current = true;
    setResult({});
    setUnconfirmed(false);
    clear();
    startTransition(async () => {
      try {
        const response = await action(data);
        if (response.error) setResult({ error: response.error });
        else if (response.success) {
          setSaved(submitted);
          setDraft(submitted);
          setResult({ success: response.success });
        } else {
          setUnconfirmed(true);
          setResult({ error: `Your entries are kept. Check ${Places} to see whether the change was saved before trying again.` });
        }
      } catch {
        setUnconfirmed(true);
        setResult({ error: `Your entries are kept. Check ${Places} to see whether the change was saved before trying again.` });
      } finally {
        submitting.current = false;
      }
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(clockerHref, window.location.origin).href);
      setCopyStatus("Clocker link copied.");
    } catch {
      setCopyStatus("Couldn’t copy. Open the Clocker link and copy it from your browser.");
    }
  }

  return (
    <div className="wc-layout">
      <div className="wc-main">
        <form noValidate onSubmit={submit} aria-busy={pending} className="wc-form" aria-label={`Edit ${place}`} {...handlers}>
          <fieldset disabled={pending} className="wc-fieldset">
            <input type="hidden" name="id" value={location.id} />
            <input type="hidden" name="expectedUpdatedAt" value={location.updatedAt ?? ""} />
            <FieldErrors errors={errors}>
              <section className="nv-card" aria-labelledby="edit-location-details-title">
                <div className="nv-card__head"><h2 className="nv-card__title" id="edit-location-details-title">{words.location} details</h2></div>
                <div className="nv-card__body wc-fields">
                  <Field label={`${words.location} name`} help="The full name your team sees across NEVORA." helpId="edit-location-name-help"
                    id="edit-location-name" name="name" required maxLength={160} value={draft.name}
                    onChange={(event) => change({ name: event.target.value })} autoComplete="off" />
                  <Field label="Short name" help="A compact label for schedules and shift lists." helpId="edit-location-short-help"
                    id="edit-location-short-name" name="shortName" required maxLength={48} value={draft.shortName}
                    onChange={(event) => change({ shortName: event.target.value })} autoComplete="off" />
                </div>
              </section>
              <section className="nv-card" aria-labelledby="edit-location-availability-title">
                <div className="nv-card__head"><h2 className="nv-card__title" id="edit-location-availability-title">Availability</h2></div>
                <div className="nv-card__body wc-fields">
                  <SwitchRow id="edit-location-active" name="active" label={`Active ${place}`} description="Available for future shift assignments."
                    checked={draft.active} onChange={(active) => change({ active })} describedBy="edit-location-active-help" />
                  <p className="wc-muted" id="edit-location-active-help">{draft.active
                    ? "Turning this off keeps history and eligibility. The Clocker stops working here."
                    : `Inactive ${lower(Places)} keep their history and eligibility. New assignments and the Clocker are unavailable.`}</p>
                  {draft.active !== saved.active ? <Notice tone="info">{draft.active ? `This ${place} becomes active when you save.` : `This ${place} becomes inactive when you save.`}</Notice> : null}
                </div>
              </section>
            </FieldErrors>
          </fieldset>
          {result.error || result.success ? (
            <div ref={feedback} tabIndex={-1} role={result.error ? "alert" : "status"} className="wc-feedback">
              <Notice tone={result.error ? "urgent" : "done"} title={result.error ? (unconfirmed ? "Save not confirmed" : "Changes not saved") : `${words.location} updated`}
                action={unconfirmed ? <Link className="nv-link" href="/app/settings/locations">Check {Places}</Link> : undefined}>{result.error || successBody(result.success)}</Notice>
            </div>
          ) : null}
          <p role="status" className="wc-muted wc-draft-status">{pending ? "Saving your changes…" : dirty ? "You have unsaved changes." : result.success ? "All changes saved." : "No changes yet."}</p>
          <FormActions>
            <button type="submit" className="nv-btn" data-kind="primary" disabled={pending || !dirty}><ButtonLabel pending={pending} idle="Save changes" busy="Saving…" /></button>
            <Link className="nv-btn" data-kind="secondary" href="/app/settings/locations" aria-disabled={pending || undefined}
              tabIndex={pending ? -1 : undefined} onClick={(event) => { if (pending) event.preventDefault(); }}>Cancel</Link>
          </FormActions>
          <noscript><p className="wc-muted">JavaScript is needed to save changes. Turn it on, then reload this page.</p></noscript>
        </form>
      </div>
      <aside className="wc-aside" aria-label="Clocker and scheduling">
        <section className="nv-card" aria-labelledby="edit-location-clocker-title">
          <div className="nv-card__head">
            <h2 className="nv-card__title" id="edit-location-clocker-title">Clocker link</h2>
            <span className="nv-card__meta"><Status tone={saved.active ? "done" : "neutral"}>{saved.active ? "Active" : "Inactive"}</Status></span>
          </div>
          <div className="nv-card__body wc-fields">
            <p className="wc-muted">Your team uses this link to clock in and out.{saved.active ? null : <> Unavailable while inactive.</>}</p>
            <div className="wc-linkbox">
              <Link href={clockerHref} className="wc-linkbox__path"><ClockIcon size={18} aria-hidden="true" /><span>{clockerHref}</span></Link>
              <button type="button" className="nv-btn" data-kind="secondary" onClick={copyLink} aria-label="Copy Clocker link"><CopyIcon size={18} aria-hidden="true" />Copy</button>
            </div>
            <p className="wc-muted wc-with-icon"><LockSimpleIcon size={16} aria-hidden="true" />Renaming keeps this link the same.</p>
            <p role="status" className="wc-muted wc-live">{copyStatus}</p>
          </div>
        </section>
        <GuideCard title="Staffing & coverage" action={<Link href="/app/schedule/settings" className="nv-link">Scheduling rules<CaretRightIcon size={16} weight="bold" aria-hidden="true" /></Link>}>
          <p>Set minimum staffing, coverage periods and Lead rules in Scheduling rules.</p>
        </GuideCard>
      </aside>
    </div>
  );
}
