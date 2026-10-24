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
        error: `It may not have saved. Check ${Places} before you try again.`,
      });
    } catch {
      setUnconfirmed(true);
      setResult({
        error: `It may not have saved. Your entries are kept. Check ${Places} before you try again, so it isn’t added twice.`,
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
    <form ref={form} id="new-location-form" noValidate onSubmit={submit} aria-busy={pending} className="wc-form" aria-label={`Add ${place}`} {...handlers}>
      <fieldset disabled={pending || success} className="q-fieldset">
        <FieldErrors errors={errors}>
          {/* Quiet (v4, approved Oct 23): three fields and one line under them. The page's Add (top right) submits. */}
          <Field label="Name" fieldClassName="q-first" inputRef={nameInput} id="new-location-name" name="name" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Harbor Point" autoComplete="off" />
          <Field label="Short name" id="new-location-short-name" name="shortName" required maxLength={48} value={shortName} onChange={(event) => setShortName(event.target.value)}
            placeholder="e.g. Harbor" autoComplete="off" />
          <Field label="Clocker key" helpId="location-clocker-help"
            help={`The Clocker key can’t be changed later.`}
            id="new-location-clocker-key" name="clockerKey" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={64}
            placeholder="Created for you" autoComplete="off" autoCapitalize="none" spellCheck={false} />
        </FieldErrors>
      </fieldset>
      <p className="nv-sr" role="status">{pending ? `Saving your ${place}.` : ""}</p>
      {result.error ? (
        <div ref={feedback} className="wc-feedback" role="alert" tabIndex={-1}>
          <Notice tone="urgent" title={unconfirmed ? "Not saved yet" : `${words.location} not added`}
            action={<Link className="q-btn q-btn--quiet" href="/app/settings/locations">Check {Places}</Link>}>{result.error}</Notice>
        </div>
      ) : null}
      {success ? (
        <div ref={feedback} className="wc-feedback" role="status" tabIndex={-1}>
          <Notice tone="done" title={`${words.location} added`}
            action={<Link className="q-btn q-btn--quiet" href="/app/schedule/settings">Next: staffing</Link>}>
            {null}
          </Notice>
        </div>
      ) : null}
      {success ? <FormActions>
        <Link className="q-btn" href="/app/settings/locations">View {lower(Places)}</Link>
        <button className="q-btn q-btn--sec" type="button" onClick={addAnother}>Add another {place}</button>
      </FormActions> : <button type="submit" className="q-sr" disabled={pending} tabIndex={-1}>{`Add ${place}`}</button>}
    </form>
  );
}
