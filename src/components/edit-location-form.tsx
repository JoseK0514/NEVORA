"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import type { CatalogLocation } from "@/lib/data/locations";
import type { ConfigurationResult } from "./configuration-form";
import { DiscardGuard } from "./kit/discard-dialog";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { LOCATION_FORMS_COPY, RESTAURANT_STATUS_ES } from "./location-forms-copy";
import { lower, type WordPresetId } from "@/lib/workspace-presentation/words";

import { CorpFormFooter, CorpLink, CorpRow, CorpRows } from "./corp/corp";
import { FieldB, ResultB, SwitchRowB } from "@/app/app/settings/settings-b-form";
import { ButtonLabel, FieldErrors, useFieldErrors } from "@/app/app/settings/wave-c-form";

/** TC-17: the notice title already says it was updated; keep only what the server adds. */
const successBody = (text?: string) => text?.replace(/^[^.]*updated\.\s*/i, "") || undefined;

type Draft = Pick<CatalogLocation, "name" | "shortName" | "active">;

/** Edit location in Settings' Direction B form. Save shows once something changes;
 * a lost answer keeps the entries and asks to check Locations before trying again. */
export function EditLocationForm({ location, action, words: givenWords, wordPresetId, staffing, eligible }: {
  /** Quiet (v4): "1 per shift", from Scheduling rules. */
  staffing?: string;
  /** Quiet (v4): how many active people can work here. */
  eligible?: number;
  location: CatalogLocation;
  action: (data: FormData) => Promise<ConfigurationResult>;
  /** Company words (B2). */
  words?: { location: string; locations: string };
  wordPresetId?: WordPresetId;
}) {
  const lang = usePortalLang();
  const t = LOCATION_FORMS_COPY[lang], words = givenWords ?? t.defaultWords;
  const status = lang === "es" && wordPresetId === "restaurant" ? RESTAURANT_STATUS_ES : t;
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
    name: { missing: t.enterName(place) },
    shortName: { missing: t.enterShortName },
  });

  useEffect(() => {
    if (result.error || result.success) feedback.current?.focus();
  }, [result]);

  // The page refreshes after a save (or when the place changed elsewhere): take the server's values in place, without
  // remounting, so the result under the card stays; edits in progress are never overwritten.
  const server = `${location.name}\u0000${location.shortName}\u0000${location.active}\u0000${location.updatedAt ?? ""}`;
  const [seen, setSeen] = useState(server);
  if (seen !== server) {
    setSeen(server);
    if (!dirty && !pending) {
      const next = { name: location.name, shortName: location.shortName, active: location.active };
      setDraft(next); setSaved(next);
    }
  }

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
          setResult({ error: t.mayNotHaveSavedKept(Places) });
        }
      } catch {
        setUnconfirmed(true);
        setResult({ error: t.mayNotHaveSavedKept(Places) });
      } finally {
        submitting.current = false;
      }
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(clockerHref, window.location.origin).href);
      setCopyStatus(t.linkCopied);
    } catch {
      setCopyStatus(t.couldntCopy);
    }
  }

  // Quiet (v4, approved Oct 23): Name and Short name, then Active, the Clocker link, staffing and who can work here as rows.
  // Phase 2 (Nov 23, 2026): Settings' Direction B form. The form is the white card itself (a direct child of the page):
  // the outlined fields, the kit's rows under them, and on tablets and desktop Save in its footer once something
  // changed. Phones save from the band (the page's Save, shown by the same rule once the form is dirty).
  return (
    <>
      <form noValidate id="edit-location-form" onSubmit={submit} aria-busy={pending} className="c-card c-setb-form" aria-label={t.editPlace(place)}
        data-save-on-change="" data-dirty={dirty || pending ? "" : undefined} {...handlers}>
        <fieldset disabled={pending} className="c-setb-fieldset">
          <input type="hidden" name="id" value={location.id} />
          <input type="hidden" name="expectedUpdatedAt" value={location.updatedAt ?? ""} />
          <FieldErrors errors={errors}>
            <div className="c-card__body c-setb-fields">
              <FieldB label={t.name} id="edit-location-name" name="name" required maxLength={160} value={draft.name}
                onChange={(event) => change({ name: event.target.value })} autoComplete="off" />
              <FieldB label={t.shortName} id="edit-location-short-name" name="shortName" required maxLength={48} value={draft.shortName}
                onChange={(event) => change({ shortName: event.target.value })} autoComplete="off" />
            </div>
            <CorpRows>
              <li><SwitchRowB id="edit-location-active" name="active" label={status.active} checked={draft.active} onChange={(active) => change({ active })} describedBy="edit-location-active-help" /></li>
              {/* The Clocker only works at an active location, so an inactive one shows no link to open or copy. */}
              <li>{location.active ? <div className="c-row c-row--one c-setb-linkrow">
                <span className="c-row__main"><Link className="c-row__title c-setb-rowlink" href={clockerHref}>{t.clockerLink}</Link></span>
                <span className="c-row__trail"><button type="button" className="c-btn c-btn--secondary c-btn--sm c-setb-copy" onClick={copyLink} aria-label={t.copyLink}>{t.copy}</button></span>
              </div> : <CorpRow title={t.clockerLink} value={status.unavailableInactive} valueTone="soft" one />}</li>
              <li><CorpRow href="/app/schedule/settings#coverage-staffing" title={t.staffing} value={staffing ?? t.notSet} valueTone="soft" one chevron /></li>
              <li><CorpRow href="/app/employees" title={t.whoCanWork} value={eligible === undefined ? undefined : String(eligible)} valueTone="soft" one chevron /></li>
            </CorpRows>
            <p className="c-sr" id="edit-location-active-help">{draft.active ? t.activeHelp : status.inactiveHelp}</p>
          </FieldErrors>
        </fieldset>
        {dirty || pending ? <CorpFormFooter><button type="submit" className="c-btn" disabled={pending}><ButtonLabel pending={pending} idle={t.save} busy={t.saving} /></button></CorpFormFooter> : null}
        <p role="status" className="c-sr">{dirty ? t.unsaved : t.saved}{copyStatus ? `. ${copyStatus}` : ""}</p>
        <noscript><p className="c-setb-cardnote">{t.noScript}</p></noscript>
        {/* Leaving with edits that are not saved asks first (Nov 21, 2026). */}
        <DiscardGuard dirty={dirty} />
      </form>
      {result.error || result.success ? <ResultB innerRef={feedback} tone={result.error ? "urgent" : "done"}
        title={result.error ? (unconfirmed ? t.notSavedYet : t.changesNotSaved) : t.updated(words.location)}
        action={unconfirmed ? <CorpLink large href="/app/settings/locations">{t.checkPlaces(Places)}</CorpLink> : undefined}>{result.error || successBody(result.success)}</ResultB> : null}
    </>
  );
}