"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import type { CatalogLocation } from "@/lib/data/locations";
import type { ConfigurationResult } from "./configuration-form";
import { lower } from "@/lib/workspace-presentation/words";

/** TC-17: the notice title already says it was updated; keep only what the server adds. */
const successBody = (text?: string) => text?.replace(/^[^.]*updated\.\s*/i, "") || undefined;
import { Notice } from "@/app/app/settings/wave-c-kit";
import { Field, FieldErrors, SwitchRow, useFieldErrors } from "@/app/app/settings/wave-c-form";

type Draft = Pick<CatalogLocation, "name" | "shortName" | "active">;

/** Wave C: Edit location on the kit form pattern. Save stays off until something changes;
 * a lost answer keeps the entries and asks to check Locations before trying again. */
export function EditLocationForm({ location, action, words = { location: "Location", locations: "Locations" }, staffing, eligible }: {
  /** Quiet (v4): "1 per shift", from Scheduling rules. */
  staffing?: string;
  /** Quiet (v4): how many active people can work here. */
  eligible?: number;
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
          setResult({ error: `It may not have saved. Your entries are kept. Check ${Places} before you try again.` });
        }
      } catch {
        setUnconfirmed(true);
        setResult({ error: `It may not have saved. Your entries are kept. Check ${Places} before you try again.` });
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

  // Quiet (v4, approved Oct 23): Name and Short name, then Active, the Clocker link, staffing and who can work here as rows.
  // The page's Save (top right) submits this form; it stays off until something changes.
  return (
    <form noValidate id="edit-location-form" onSubmit={submit} aria-busy={pending} className="wc-form" aria-label={`Edit ${place}`} data-dirty={dirty || undefined} {...handlers}>
      <fieldset disabled={pending} className="q-fieldset">
        <input type="hidden" name="id" value={location.id} />
        <input type="hidden" name="expectedUpdatedAt" value={location.updatedAt ?? ""} />
        <FieldErrors errors={errors}>
          <Field label="Name" id="edit-location-name" name="name" required maxLength={160} value={draft.name}
            onChange={(event) => change({ name: event.target.value })} autoComplete="off" />
          <Field label="Short name" id="edit-location-short-name" name="shortName" required maxLength={48} value={draft.shortName}
            onChange={(event) => change({ shortName: event.target.value })} autoComplete="off" />
          <ul className="q-list" style={{ marginTop: 24 }}>
            <li><SwitchRow id="edit-location-active" name="active" label="Active" checked={draft.active} onChange={(active) => change({ active })} describedBy="edit-location-active-help" /></li>
            {/* The Clocker only works at an active location, so an inactive one shows no link to open or copy. */}
            <li>{location.active ? <div className="q-row q-row--one"><span className="q-rt"><b><Link href={clockerHref}>Clocker link</Link></b></span>
              <button type="button" className="q-bs q-bs--hit" onClick={copyLink} aria-label="Copy Clocker link">Copy</button></div>
              : <div className="q-row q-row--one"><span className="q-rt"><b>Clocker link</b></span><span className="q-rv q-rv--l">Unavailable while inactive</span></div>}</li>
            <li><Link className="q-row q-row--one" href="/app/schedule/settings#coverage-staffing"><span className="q-rt"><b>Staffing</b></span><span className="q-rv q-rv--l">{staffing ?? "Not set"}</span><CaretRightIcon className="q-chev" aria-hidden="true" /></Link></li>
            <li><Link className="q-row q-row--one" href="/app/employees"><span className="q-rt"><b>Who can work here</b></span>{eligible === undefined ? null : <span className="q-rv q-rv--l">{eligible}</span>}<CaretRightIcon className="q-chev" aria-hidden="true" /></Link></li>
          </ul>
          <p className="q-sr" id="edit-location-active-help">{draft.active ? "Turning this off keeps history. The Clocker stops working here." : "Inactive: new assignments and the Clocker are unavailable."}</p>
        </FieldErrors>
      </fieldset>
      {result.error || result.success ? (
        <div ref={feedback} tabIndex={-1} role={result.error ? "alert" : "status"} className="wc-feedback">
          <Notice tone={result.error ? "urgent" : "done"} title={result.error ? (unconfirmed ? "Not saved yet" : "Changes not saved") : `${words.location} updated`}
            action={unconfirmed ? <Link className="q-btn q-btn--quiet" href="/app/settings/locations">Check {Places}</Link> : undefined}>{result.error || successBody(result.success)}</Notice>
        </div>
      ) : null}
      <p role="status" className="q-sr">{dirty ? "Unsaved changes" : "Saved"}{copyStatus ? `. ${copyStatus}` : ""}</p>
      <noscript><p className="q-help">JavaScript is needed to save changes. Turn it on, then reload this page.</p></noscript>
    </form>
  );
}