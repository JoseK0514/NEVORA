"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr/LockSimple";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { CatalogLocation } from "@/lib/data/locations";
import type { ConfigurationResult } from "./configuration-form";

gsap.registerPlugin(useGSAP);
type Draft = Pick<CatalogLocation, "name" | "shortName" | "active">;
const iconProps = { size: 20, weight: "regular", "aria-hidden": true } as const;

export function EditLocationForm({ location, action }: {
  location: CatalogLocation;
  action: (data: FormData) => Promise<ConfigurationResult>;
}) {
  const [draft, setDraft] = useState<Draft>(() => ({ name: location.name, shortName: location.shortName, active: location.active }));
  const [saved, setSaved] = useState<Draft>(draft);
  const [result, setResult] = useState<ConfigurationResult>({});
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const dirty = draft.name !== saved.name || draft.shortName !== saved.shortName || draft.active !== saved.active;
  const clockerHref = `/clocker/${location.clockerKey}`;

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".edit-location-aside > section", { y: 8, duration: .32, stagger: .07, ease: "power2.out" });
    });
    return () => media.revert();
  }, { scope });

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
    const data = new FormData(event.currentTarget);
    const submitted: Draft = { name: draft.name.trim(), shortName: draft.shortName.trim(), active: draft.active };
    submitting.current = true;
    setResult({});
    setUnconfirmed(false);
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
          setResult({ error: "Your entries are preserved. Check Locations to see whether the change was saved before trying again." });
        }
      } catch {
        setUnconfirmed(true);
        setResult({ error: "Your entries are preserved. Check Locations to see whether the change was saved before trying again." });
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
      setCopyStatus("Could not copy. Open the Clocker link to copy it from your browser.");
    }
  }

  return (
    <div className="edit-location-layout" ref={scope}>
      <section className="edit-location-card" aria-labelledby="edit-location-details-title">
        <div className="edit-location-section-heading">
          <span className="edit-location-icon"><MapPinIcon {...iconProps} size={24} /></span>
          <div><h2 id="edit-location-details-title">Location details</h2><p>Names your team will recognize.</p></div>
        </div>
        <form onSubmit={submit} aria-busy={pending}>
          <fieldset disabled={pending} className="edit-location-fields">
            <legend className="edit-location-sr-only">Edit location details</legend>
            <input type="hidden" name="id" value={location.id} />
            <input type="hidden" name="expectedUpdatedAt" value={location.updatedAt ?? ""} />
            <div className="edit-location-field">
              <label htmlFor="edit-location-name">Location name</label>
              <input id="edit-location-name" name="name" required maxLength={160} value={draft.name}
                onChange={(event) => change({ name: event.target.value })} autoComplete="off" aria-describedby="edit-location-name-help" />
              <p id="edit-location-name-help">The full name shown across NEVORA.</p>
            </div>
            <div className="edit-location-field">
              <label htmlFor="edit-location-short-name">Short name</label>
              <input id="edit-location-short-name" name="shortName" required maxLength={48} value={draft.shortName}
                onChange={(event) => change({ shortName: event.target.value })} autoComplete="off" aria-describedby="edit-location-short-help" />
              <p id="edit-location-short-help">A compact label for schedules and shift lists.</p>
            </div>
            <div className="edit-location-availability">
              <h3>Availability</h3>
              <label className="edit-location-switch-row" htmlFor="edit-location-active">
                <span><strong>Active location</strong><span>Available for future shift assignments.</span></span>
                <span className="edit-location-switch">
                  <input id="edit-location-active" type="checkbox" name="active" checked={draft.active}
                    onChange={(event) => change({ active: event.target.checked })} aria-describedby="edit-location-active-help" />
                  <span aria-hidden="true" />
                </span>
              </label>
              <p id="edit-location-active-help">{draft.active
                ? "Deactivating preserves history and employee eligibility. The Clocker becomes unavailable."
                : "Inactive locations keep their history and employee eligibility. New assignments and the Clocker are unavailable."}</p>
              {draft.active !== saved.active ? <p className="edit-location-status-change">{draft.active ? "This location will become active when you save." : "This location will become inactive when you save."}</p> : null}
            </div>
          </fieldset>
          {result.error || result.success ? (
            <div ref={feedback} tabIndex={-1} role={result.error ? "alert" : "status"}
              className={`edit-location-feedback ${result.error ? "edit-location-error" : "edit-location-success"}`}>
              <strong>{result.error ? (unconfirmed ? "Save not confirmed" : "Could not save changes") : "Location updated"}</strong>
              <p>{result.error || result.success}</p>
              {unconfirmed ? <Link href="/app/settings/locations">Check locations</Link> : null}
            </div>
          ) : null}
          <div className="edit-location-form-footer">
            <p role="status" className="edit-location-draft-status">{pending ? "Saving your changes..." : dirty ? "Unsaved changes" : result.success ? "Changes saved" : "No changes yet"}</p>
            <div className="edit-location-actions">
              <Link className="edit-location-button edit-location-secondary" href="/app/settings/locations" aria-disabled={pending}
                tabIndex={pending ? -1 : undefined} onClick={(event) => { if (pending) event.preventDefault(); }}>Cancel</Link>
              <button type="submit" className="edit-location-button edit-location-primary" disabled={pending || !dirty}>
                {pending ? "Saving..." : "Save changes"}
                {!pending ? <CheckIcon {...iconProps} size={18} /> : null}
              </button>
            </div>
          </div>
          <noscript><p className="edit-location-feedback">JavaScript is needed to save changes. Enable it, then reload this page.</p></noscript>
        </form>
      </section>
      <aside className="edit-location-aside" aria-label="Clocker and scheduling">
        <section className="edit-location-clocker" aria-labelledby="edit-location-clocker-title">
          <div className="edit-location-aside-heading"><ClockIcon {...iconProps} /><h2 id="edit-location-clocker-title">Clocker link</h2></div>
          <p>Your team uses this link to clock in and out.</p>
          <div className="edit-location-link-box">
            <Link href={clockerHref} className="edit-location-clocker-path">{clockerHref}<ArrowUpRightIcon {...iconProps} size={17} /></Link>
            <button type="button" className="edit-location-copy" onClick={copyLink} aria-label="Copy Clocker link"><CopyIcon {...iconProps} /></button>
          </div>
          <p className={`edit-location-current-state${saved.active ? " is-active" : ""}`}><span aria-hidden="true" />{saved.active ? "Active location" : "Unavailable while inactive"}</p>
          <p className="edit-location-stable-note"><LockSimpleIcon {...iconProps} size={16} />Name changes preserve this link.</p>
          {copyStatus ? <p role="status" className="edit-location-copy-status">{copyStatus}</p> : null}
        </section>
        <section className="edit-location-rules" aria-labelledby="edit-location-rules-title">
          <div className="edit-location-aside-heading"><SlidersHorizontalIcon {...iconProps} /><h2 id="edit-location-rules-title">Staffing &amp; coverage</h2></div>
          <p>Manage minimum staffing, coverage periods, and Lead requirements in Scheduling Rules.</p>
          <Link href="/app/schedule/settings" className="edit-location-rules-link">Scheduling rules<CaretRightIcon {...iconProps} size={18} /></Link>
        </section>
      </aside>
    </div>
  );
}
