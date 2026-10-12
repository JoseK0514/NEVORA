"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ConfigurationResult } from "./configuration-form";
import { NavIcon } from "./nav-icon";

export function NewLocationForm({
  action,
}: {
  action: (data: FormData) => Promise<ConfigurationResult>;
}) {
  const [result, setResult] = useState<ConfigurationResult>({});
  const [pending, setPending] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const submitting = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const advanced = useRef<HTMLDetailsElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const success = Boolean(result.success && !result.error);

  useEffect(() => {
    if (result.error || result.success) feedback.current?.focus();
  }, [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || success) return;
    const data = new FormData(event.currentTarget);
    submitting.current = true;
    setPending(true);
    setUnconfirmed(false);
    setResult({});
    try {
      const saved = await action(data);
      setUnconfirmed(!saved.error && !saved.success);
      setResult(saved.error || saved.success ? saved : {
        error: "The save could not be confirmed. Check Locations before trying again.",
      });
    } catch {
      setUnconfirmed(true);
      setResult({
        error: "The save could not be confirmed. Your entries are preserved. Check Locations before trying again to avoid adding a duplicate.",
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
    if (advanced.current) advanced.current.open = false;
    requestAnimationFrame(() => nameInput.current?.focus());
  }

  return (
    <div className="add-location-layout">
      <section className="add-location-card" aria-labelledby="location-details-title">
        <div className="add-location-section-heading">
          <span className="add-location-icon"><NavIcon name="location" size={23} /></span>
          <div>
            <h2 id="location-details-title">Location details</h2>
            <p>Use names your team will recognize.</p>
          </div>
        </div>
        <form ref={form} onSubmit={submit} aria-busy={pending}
          onInvalidCapture={(event) => {
            if (event.target instanceof HTMLInputElement && event.target.name === "clockerKey" && advanced.current) {
              advanced.current.open = true;
            }
          }}>
          <fieldset disabled={pending || success} className="add-location-fields">
            <legend className="sr-only">Location details</legend>
            <div className="add-location-field">
              <label htmlFor="new-location-name">Location name</label>
              <input ref={nameInput} id="new-location-name" name="name" required maxLength={160}
                value={name} onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Downtown office" autoComplete="off" aria-describedby="location-name-help" />
              <p id="location-name-help">The full name shown across your workspace.</p>
            </div>
            <div className="add-location-field">
              <label htmlFor="new-location-short-name">Short name</label>
              <input id="new-location-short-name" name="shortName" required maxLength={48}
                value={shortName} onChange={(event) => setShortName(event.target.value)}
                placeholder="e.g. Downtown" autoComplete="off" aria-describedby="location-short-name-help" />
              <p id="location-short-name-help">A compact label for schedules and shift lists.</p>
            </div>
            <details ref={advanced} className="add-location-advanced">
              <summary>
                <span><NavIcon name="clock" size={19} />Clocker link <span className="add-location-optional">Optional</span></span>
                <span className="add-location-expand" aria-hidden="true" />
              </summary>
              <div className="add-location-advanced-content">
                <div className="add-location-field">
                  <label htmlFor="new-location-clocker-key">Clocker key</label>
                  <input id="new-location-clocker-key" name="clockerKey" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={64}
                    placeholder="e.g. downtown-office" autoComplete="off" autoCapitalize="none" spellCheck={false}
                    aria-describedby="location-clocker-help" />
                  <p id="location-clocker-help">Leave blank to generate a key automatically. A custom key uses lowercase letters, numbers and single hyphens, up to 64 characters.</p>
                </div>
                <p className="add-location-link-note">This key becomes part of the location&apos;s Clocker link and cannot be changed later.</p>
              </div>
            </details>
          </fieldset>
          {result.error ? (
            <div ref={feedback} className="add-location-feedback add-location-error" role="alert" tabIndex={-1}>
              <strong>{unconfirmed ? "Save not confirmed" : "Location could not be added"}</strong>
              <p>{result.error}</p>
              <Link href="/app/settings/locations">Check locations</Link>
            </div>
          ) : null}
          {success ? (
            <div ref={feedback} className="add-location-feedback add-location-success" role="status" tabIndex={-1}>
              <strong>Location added</strong>
              <p>{name.trim()} is ready for setup. Configure staffing and coverage, then assign eligible employees.</p>
              <div className="add-location-success-links">
                <Link href="/app/schedule/settings">Scheduling rules</Link>
                <Link href="/app/employees">Employee eligibility</Link>
              </div>
            </div>
          ) : null}
          <div className="add-location-form-actions">
            {success ? (
              <>
                <button className="add-location-button add-location-secondary" type="button" onClick={addAnother}>Add another location</button>
                <Link className="add-location-button add-location-primary" href="/app/settings/locations">View locations</Link>
              </>
            ) : (
              <>
                <Link className="add-location-button add-location-secondary" href="/app/settings/locations" aria-disabled={pending}
                  tabIndex={pending ? -1 : undefined} onClick={(event) => { if (pending) event.preventDefault(); }}>Cancel</Link>
                <button className="add-location-button add-location-primary" type="submit" disabled={pending}>
                  {pending ? "Adding location..." : "Add location"}
                </button>
              </>
            )}
          </div>
          {pending ? <p className="add-location-saving" role="status">Saving your location. Please wait.</p> : null}
        </form>
      </section>
      <aside className="add-location-aside" aria-label="Location preview and setup guidance">
        <section className="add-location-preview" aria-labelledby="location-preview-title">
          <h2 id="location-preview-title">Your new location</h2>
          <div className="add-location-preview-visual" aria-hidden="true">
            <svg viewBox="0 0 240 144" fill="none">
              <ellipse cx="120" cy="127" rx="87" ry="6" fill="currentColor" opacity=".07" />
              <path d="M71 57h98v65H71z" fill="#fff" stroke="currentColor" strokeWidth="2" />
              <path d="m66 57 9-28h90l9 28H66Z" fill="currentColor" opacity=".12" />
              <path d="m66 57 9-28h90l9 28H66ZM81 29l-5 28m24-28-2 28m21-28v28m20-28 2 28m18-28 5 28" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M66 57v5a11 11 0 0 0 22 0v-5m0 0v5a11 11 0 0 0 22 0v-5m0 0v5a11 11 0 0 0 22 0v-5m0 0v5a11 11 0 0 0 22 0v-5m0 0v5a10 10 0 0 0 20 0v-5" stroke="currentColor" strokeWidth="2" />
              <path d="M84 83h24v20H84zM124 83h31v39h-31z" fill="currentColor" opacity=".07" />
              <path d="M84 83h24v20H84zM124 122V83h31v39m-6-21h-3M66 123h108" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M191 109V79m-5 16h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".4" />
              <circle cx="191" cy="77" r="13" fill="currentColor" opacity=".1" />
              <path d="M44 113V98" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".4" />
              <circle cx="44" cy="92" r="9" fill="currentColor" opacity=".1" />
            </svg>
          </div>
          <div className="add-location-preview-names">
            <strong>{name.trim() || "Location name"}</strong>
            <span>{shortName.trim() || "Short name"}</span>
          </div>
          <p>These names help your team find the right location.</p>
        </section>
        <section className="add-location-next" aria-labelledby="location-next-title">
          <h2 id="location-next-title">After you add it</h2>
          <p>A location needs two things before scheduling.</p>
          <ol>
            <li><span className="add-location-step-icon"><NavIcon name="rules" size={20} /></span><div><h3>Set staffing &amp; coverage</h3><p>Choose minimum staffing, a Lead rule and coverage periods in Scheduling Rules.</p></div></li>
            <li><span className="add-location-step-icon"><NavIcon name="employees" size={20} /></span><div><h3>Assign eligible employees</h3><p>Open an employee&apos;s scheduling profile to give them access to this location.</p></div></li>
          </ol>
        </section>
      </aside>
    </div>
  );
}
