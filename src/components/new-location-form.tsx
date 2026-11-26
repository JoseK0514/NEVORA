"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import type { ConfigurationResult } from "./configuration-form";
import { FormDiscardGuard } from "./kit/discard-dialog";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { LOCATION_FORMS_COPY } from "./location-forms-copy";
import { lower } from "@/lib/workspace-presentation/words";
import { CorpButtonLink, CorpFormFooter, CorpLink } from "./corp/corp";
import { FieldB, ResultB } from "@/app/app/settings/settings-b-form";
import { ButtonLabel, FieldErrors, useFieldErrors } from "@/app/app/settings/wave-c-form";
import { ReturnToNext } from "./team/return-to-next";

/** Add location in Settings' Direction B form. One request per tap; an unconfirmed save says
 * to check Locations first, so a lost answer never becomes a duplicate. */
export function NewLocationForm({
  action, words: givenWords,
}: {
  action: (data: FormData) => Promise<ConfigurationResult>;
  /** Company words (B2). */
  words?: { location: string; locations: string };
}) {
  const lang = usePortalLang();
  const t = LOCATION_FORMS_COPY[lang], words = givenWords ?? t.defaultWords;
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
    name: { missing: t.enterName(place), pattern: t.enterName(place) },
    shortName: { missing: t.enterShortName, pattern: t.enterShortName },
    clockerKey: { pattern: t.keyPattern },
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
        error: t.mayNotHaveSaved(Places),
      });
    } catch {
      setUnconfirmed(true);
      setResult({
        error: t.mayNotHaveSavedTwice(Places),
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
      <form ref={form} id="new-location-form" noValidate onSubmit={submit} aria-busy={pending} className="c-card c-setb-form" aria-label={t.addPlace(place)}
        data-done={success ? "" : undefined} {...handlers}>
        {/* P9: Return moves to the next field and never submits; the page's Add submits. */}
        <ReturnToNext />
        <fieldset disabled={pending || success} className="c-setb-fieldset">
          <FieldErrors errors={errors}>
            <div className="c-card__body c-setb-fields">
              <FieldB label={t.name} inputRef={nameInput} id="new-location-name" name="name" required pattern=".*\S.*" maxLength={160} value={name} onChange={(event) => setName(event.target.value)}
                placeholder={t.namePlaceholder} autoComplete="off" autoCapitalize="words" enterKeyHint="next" />
              <FieldB label={t.shortName} id="new-location-short-name" name="shortName" required pattern=".*\S.*" maxLength={48} value={shortName} onChange={(event) => setShortName(event.target.value)}
                placeholder={t.shortPlaceholder} autoComplete="off" autoCapitalize="words" enterKeyHint="next" />
              <FieldB kind="textarea" label={t.addressOptional} id="new-location-address" name="address" rows={2} maxLength={300} autoComplete="off" />
              <FieldB label={t.clockerKey} helpId="location-clocker-help" help={t.clockerKeyHelp}
                id="new-location-clocker-key" name="clockerKey" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={64}
                placeholder={t.keyPlaceholder} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done" />
            </div>
          </FieldErrors>
        </fieldset>
        {success ? null : <CorpFormFooter>
          <CorpButtonLink href="/app/settings/locations" kind="secondary">{t.cancel}</CorpButtonLink>
          <button type="submit" className="c-btn" disabled={pending}><ButtonLabel pending={pending} idle={t.add} busy={t.adding} /></button>
        </CorpFormFooter>}
        <p className="c-sr" role="status">{pending ? t.savingPlace(place) : ""}</p>
        {/* Leaving with typed entries that are not added asks first (Nov 21, 2026); not once it is added. */}
        <FormDiscardGuard off={success} lang={lang} />
      </form>
      {result.error ? <ResultB innerRef={feedback} tone="urgent" title={unconfirmed ? t.notSavedYet : t.notAdded(words.location)}
        action={<CorpLink large href="/app/settings/locations">{t.checkPlaces(Places)}</CorpLink>}>{result.error}</ResultB> : null}
      {success ? <ResultB innerRef={feedback} tone="done" title={t.added(words.location)}
        action={<CorpLink large href="/app/schedule/settings">{t.nextStaffing}</CorpLink>} /> : null}
      {success ? <div className="c-setb-acts">
        <button className="c-btn c-btn--secondary" type="button" onClick={addAnother}>{t.addAnother(place)}</button>
        <CorpButtonLink href="/app/settings/locations">{t.viewPlaces(lower(Places))}</CorpButtonLink>
      </div> : null}
    </>
  );
}
