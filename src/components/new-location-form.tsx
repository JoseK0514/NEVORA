"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import type { ConfigurationResult } from "./configuration-form";
import { FormDiscardGuard } from "./kit/discard-dialog";
import { lower } from "@/lib/workspace-presentation/words";
import { CorpButtonLink, CorpFormFooter, CorpLink } from "./corp/corp";
import { FieldB, ResultB } from "@/app/app/settings/settings-b-form";
import { ButtonLabel, FieldErrors, useFieldErrors } from "@/app/app/settings/wave-c-form";
import { ReturnToNext } from "./team/return-to-next";

/** Add location in Settings' Direction B form. One request per tap; an unconfirmed save says
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
    // Review F3 (NV-112): a name of only spaces is flagged like an empty one, so both name fields are marked together.
    name: { missing: `Enter a ${place} name`, pattern: `Enter a ${place} name` },
    shortName: { missing: "Enter a short name", pattern: "Enter a short name" },
    clockerKey: { pattern: "Use lowercase letters, numbers and single hyphens, like downtown-office" },
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

  // Phase 2 (Nov 23, 2026): Settings' Direction B form. The form is the white card itself (a direct child of the page, so
  // the page's card rhythm applies): three outlined fields, and on tablets and desktop Cancel and Add in its footer.
  // Phones add from the band (the page's Add). The outcome stands under the card and takes focus; once added, the next
  // steps are two equal buttons under it.
  return (
    <>
      <form ref={form} id="new-location-form" noValidate onSubmit={submit} aria-busy={pending} className="c-card c-setb-form" aria-label={`Add ${place}`}
        data-done={success ? "" : undefined} {...handlers}>
        {/* P9: Return moves to the next field and never submits; the page's Add submits. */}
        <ReturnToNext />
        <fieldset disabled={pending || success} className="c-setb-fieldset">
          <FieldErrors errors={errors}>
            <div className="c-card__body c-setb-fields">
              <FieldB label="Name" inputRef={nameInput} id="new-location-name" name="name" required pattern=".*\S.*" maxLength={160} value={name} onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Harbor Point" autoComplete="off" autoCapitalize="words" enterKeyHint="next" />
              <FieldB label="Short name" id="new-location-short-name" name="shortName" required pattern=".*\S.*" maxLength={48} value={shortName} onChange={(event) => setShortName(event.target.value)}
                placeholder="e.g. Harbor" autoComplete="off" autoCapitalize="words" enterKeyHint="next" />
              <FieldB label="Clocker key" helpId="location-clocker-help" help="The Clocker key can’t be changed later."
                id="new-location-clocker-key" name="clockerKey" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={64}
                placeholder="Created for you" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done" />
            </div>
          </FieldErrors>
        </fieldset>
        {success ? null : <CorpFormFooter>
          <CorpButtonLink href="/app/settings/locations" kind="secondary">Cancel</CorpButtonLink>
          <button type="submit" className="c-btn" disabled={pending}><ButtonLabel pending={pending} idle="Add" busy="Adding…" /></button>
        </CorpFormFooter>}
        <p className="c-sr" role="status">{pending ? `Saving your ${place}.` : ""}</p>
        {/* Leaving with typed entries that are not added asks first (Nov 21, 2026); not once it is added. */}
        <FormDiscardGuard off={success} />
      </form>
      {result.error ? <ResultB innerRef={feedback} tone="urgent" title={unconfirmed ? "Not saved yet" : `${words.location} not added`}
        action={<CorpLink large href="/app/settings/locations">{`Check ${Places}`}</CorpLink>}>{result.error}</ResultB> : null}
      {success ? <ResultB innerRef={feedback} tone="done" title={`${words.location} added`}
        action={<CorpLink large href="/app/schedule/settings">Next: staffing</CorpLink>} /> : null}
      {success ? <div className="c-setb-acts">
        <button className="c-btn c-btn--secondary" type="button" onClick={addAnother}>{`Add another ${place}`}</button>
        <CorpButtonLink href="/app/settings/locations">{`View ${lower(Places)}`}</CorpButtonLink>
      </div> : null}
    </>
  );
}
