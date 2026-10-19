"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import type { ConfigurationResult } from "./configuration-form";
import { lower } from "@/lib/workspace-presentation/words";
import { Notice } from "@/app/app/settings/wave-c-kit";
import { ButtonLabel, Field, FieldErrors, FormActions, useFieldErrors } from "@/app/app/settings/wave-c-form";

/** Wave C: Add location on the kit form pattern. One request per tap; an unconfirmed save says
 * to check Locations first, so a lost answer never becomes a duplicate. */
export function NewLocationForm({
  action, words = { location: "Location", locations: "Locations" },
}: {
  action: (data: FormData) => Promise<ConfigurationResult>;
  /** Company words (B2). */
  words?: { location: string; locations: string };
}) {
  const place = lower(words.location), Places = words.locations;
  const [result, setResult] = useState<ConfigurationResult>({});
  const [pending, setPending] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const submitting = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const nameInput = useRef<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement>(null);
  const success = Boolean(result.success && !result.error);
  const { errors, handlers, clear } = useFieldErrors({
    name: { missing: `Enter a ${place} name.` },
    shortName: { missing: "Enter a short name." },
    clockerKey: { pattern: "Use lowercase letters, numbers and single hyphens, like downtown-office." },
  });

  useEffect(() => {
    if (result.error || result.success) feedback.current?.focus();
  }, [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || success) return;
    if (!event.currentTarget.checkValidity()) return;
    const data = new FormData(event.currentTarget);
    submitting.current = true;
    setPending(true);
    setUnconfirmed(false);
    setResult({});
    clear();
    try {
      const saved = await action(data);
      setUnconfirmed(!saved.error && !saved.success);
      setResult(saved.error || saved.success ? saved : {
        error: `The save could not be confirmed. Check ${Places} before trying again.`,
      });
    } catch {
      setUnconfirmed(true);
      setResult({
        error: `The save could not be confirmed. Your entries are kept. Check ${Places} before trying again so you don’t add it twice.`,
      });
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  function addAnother() {
    form.current?.reset();
    setName("");
    setShortName("");
    setResult({});
    setUnconfirmed(false);
    clear();
    requestAnimationFrame(() => nameInput.current?.focus());
  }

  return (
    <form ref={form} noValidate onSubmit={submit} aria-busy={pending} className="wc-form" aria-label={`Add ${place}`} {...handlers}>
      <fieldset disabled={pending || success} className="wc-fieldset">
        <FieldErrors errors={errors}>
          <section className="nv-card" aria-labelledby="location-details-title">
            <div className="nv-card__head"><h2 className="nv-card__title" id="location-details-title">{words.location} details</h2></div>
            <div className="nv-card__body wc-fields">
              <Field label={`${words.location} name`} help="The full name your team sees across NEVORA." helpId="location-name-help" inputRef={nameInput}
                id="new-location-name" name="name" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Downtown office" autoComplete="off" />
              <Field label="Short name" help="A compact label for schedules and shift lists." helpId="location-short-name-help"
                id="new-location-short-name" name="shortName" required maxLength={48} value={shortName} onChange={(event) => setShortName(event.target.value)}
                placeholder="e.g. Downtown" autoComplete="off" />
            </div>
          </section>
          <section className="nv-card" aria-labelledby="location-clocker-title">
            <div className="nv-card__head"><h2 className="nv-card__title" id="location-clocker-title">Clocker link</h2></div>
            <div className="nv-card__body wc-fields">
              <Field label="Clocker key" optional helpId="location-clocker-help"
                help={<><p>Leave blank to generate a key automatically. A custom key uses lowercase letters, numbers and single hyphens, up to 64 characters.</p>
                  <p>This key becomes part of the {place}’s Clocker link and can’t be changed later.</p></>}
                id="new-location-clocker-key" name="clockerKey" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={64}
                placeholder="e.g. downtown-office" autoComplete="off" autoCapitalize="none" spellCheck={false} />
            </div>
          </section>
        </FieldErrors>
      </fieldset>
      <p className="nv-sr" role="status">{pending ? `Saving your ${place}.` : ""}</p>
      {result.error ? (
        <div ref={feedback} className="wc-feedback" role="alert" tabIndex={-1}>
          <Notice tone="urgent" title={unconfirmed ? "Save not confirmed" : `${words.location} not added`}
            action={<Link className="nv-link" href="/app/settings/locations">Check {Places}</Link>}>{result.error}</Notice>
        </div>
      ) : null}
      {success ? (
        <div ref={feedback} className="wc-feedback" role="status" tabIndex={-1}>
          <Notice tone="done" title={`${words.location} added`}
            action={<><Link className="nv-link" href="/app/schedule/settings">Scheduling rules</Link><Link className="nv-link" href="/app/employees">Employee eligibility</Link></>}>
            {name.trim()} is ready for setup. Set staffing and coverage, then choose who can work there.
          </Notice>
        </div>
      ) : null}
      <FormActions>
        {success ? (
          <>
            <Link className="nv-btn" data-kind="primary" href="/app/settings/locations">View {lower(Places)}</Link>
            <button className="nv-btn" data-kind="secondary" type="button" onClick={addAnother}><PlusIcon size={18} aria-hidden="true" />Add another {place}</button>
          </>
        ) : (
          <>
            <button className="nv-btn" data-kind="primary" type="submit" disabled={pending}><ButtonLabel pending={pending} idle={`Add ${place}`} busy="Adding…" /></button>
            <Link className="nv-btn" data-kind="secondary" href="/app/settings/locations" aria-disabled={pending || undefined}
              tabIndex={pending ? -1 : undefined} onClick={(event) => { if (pending) event.preventDefault(); }}>Cancel</Link>
          </>
        )}
      </FormActions>
    </form>
  );
}
