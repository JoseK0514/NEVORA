"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CatalogLocation } from "@/lib/data/locations";
import { QuietSheet } from "./quiet/quiet-sheet";
import { LOCATION_RETIREMENT_COPY, recoveryRoutes, type LocationSaveResult } from "./location-retirement-copy";
import "./location-retirement.css";
import { DiscardGuard } from "./kit/discard-dialog";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { LOCATION_FORMS_COPY, RESTAURANT_STATUS_ES } from "./location-forms-copy";
import { lower, type WordPresetId } from "@/lib/workspace-presentation/words";

import { CorpFormFooter, CorpRow, CorpRows } from "./corp/corp";
import { FieldB, ResultB, SwitchRowB } from "@/app/app/settings/settings-b-form";
import { ButtonLabel, FieldErrors, useFieldErrors } from "@/app/app/settings/wave-c-form";

/** TC-17: the notice title already says it was updated; keep only what the server adds. */
const successBody = (text?: string) => text?.replace(/^[^.]*updated\.\s*/i, "") || undefined;

type Draft = Pick<CatalogLocation, "name" | "shortName" | "active" | "address">;

/** Edit location in Settings' Direction B form. Save shows once something changes;
 * a lost answer keeps the entries and asks to check Locations before trying again. */
export function EditLocationForm({ location, action, readCurrent, words: givenWords, wordPresetId, staffing, eligible }: {
  /** Quiet (v4): "1 per shift", from Scheduling rules. */
  staffing?: string;
  /** Quiet (v4): how many active people can work here. */
  eligible?: number;
  location: CatalogLocation;
  action: (data: FormData) => Promise<LocationSaveResult>;
  readCurrent: () => Promise<CatalogLocation | null>;
  /** Company words (B2). */
  words?: { location: string; locations: string };
  wordPresetId?: WordPresetId;
}) {
  const lang = usePortalLang();
  const t = LOCATION_FORMS_COPY[lang], words = givenWords ?? t.defaultWords;
  const status = lang === "es" && wordPresetId === "restaurant" ? RESTAURANT_STATUS_ES : t;
  const place = lower(words.location);
  const rt = LOCATION_RETIREMENT_COPY[lang];
  const [saved, setSaved] = useState(location);
  const [draft, setDraft] = useState<Draft>(location);
  const [result, setResult] = useState<LocationSaveResult>({});
  const [notice, setNotice] = useState<"idle" | "saved" | "blocked" | "inactive" | "failed" | "check" | "review">("idle");
  const [confirmation, setConfirmation] = useState<FormData | null>(null);
  const [pending, setPending] = useState<"saving" | "checking" | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const submitting = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const dirty = draft.name !== saved.name || draft.shortName !== saved.shortName || draft.active !== saved.active || (draft.address ?? "") !== (saved.address ?? "");
  const retiring = saved.active && !draft.active;
  const clockerHref = `/clocker/${location.clockerKey}`;
  const { errors, handlers, clear } = useFieldErrors({
    name: { missing: t.enterName(place) },
    shortName: { missing: t.enterShortName },
  });

  useEffect(() => {
    if (notice !== "idle" && !pending) feedback.current?.focus();
  }, [notice, pending, result]);
  useEffect(() => {
    if (!confirmation) return;
    const frame = requestAnimationFrame(() => keep.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [confirmation]);

  // Keep the revision with the values the Owner reviewed. A background refresh may update an untouched form only.
  const [seen, setSeen] = useState(location.updatedAt);
  if (seen !== location.updatedAt) {
    setSeen(location.updatedAt);
    if (!dirty && !pending && notice === "idle") {
      setSaved(location);
      setDraft(location);
    }
  }

  function change(next: Partial<Draft>) {
    setDraft(current => ({ ...current, ...next }));
    if (notice !== "check") {
      setResult({});
      setNotice("idle");
    }
  }

  function keepActive() {
    setConfirmation(null);
    change({ active: true });
    requestAnimationFrame(() => document.getElementById("edit-location-active")?.focus());
  }

  async function refresh(response: LocationSaveResult = {}) {
    setPending("checking");
    setResult(response);
    try {
      const current = await readCurrent();
      if (!current || current.id !== location.id || !current.updatedAt) throw new Error();
      // Preserve edited fields; never carry an untouched, obsolete value into a subsequent save.
      setDraft({
        name: draft.name === saved.name ? current.name : draft.name,
        shortName: draft.shortName === saved.shortName ? current.shortName : draft.shortName,
        active: draft.active === saved.active ? current.active : draft.active,
        address: (draft.address ?? "") === (saved.address ?? "") ? current.address : draft.address,
      });
      setSaved(current);
      if (retiring && !current.active) setNotice("inactive");
      else if (response.error && current.updatedAt === saved.updatedAt) setNotice("failed");
      else setNotice("review");
    } catch (error) {
      unstable_rethrow(error);
      setNotice("check");
    } finally {
      submitting.current = false;
      setPending(null);
    }
  }

  async function save(data: FormData) {
    if (submitting.current) return;
    submitting.current = true;
    setConfirmation(null);
    setNotice("idle");
    setPending("saving");
    clear();
    let response: LocationSaveResult = {};
    try {
      response = await action(data);
    } catch (error) {
      unstable_rethrow(error);
      // A lost reply can follow a committed save. Reconcile before permitting another write.
    }
    if (response.issueCode === "LOCATION_RETIREMENT_BLOCKED") {
      setResult(response);
      setNotice("blocked");
    } else if (!response.error && response.success && response.updatedAt) {
      const confirmed = { ...saved, name: draft.name.trim(), shortName: draft.shortName.trim(),
        active: draft.active, address: draft.address?.trim() || null, updatedAt: response.updatedAt };
      setSaved(confirmed);
      setDraft(confirmed);
      setResult(response);
      setNotice(retiring ? "inactive" : "saved");
    } else {
      await refresh(response);
      return;
    }
    submitting.current = false;
    setPending(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || submitting.current || confirmation || notice === "check" || !event.currentTarget.checkValidity()) return;
    const data = new FormData(event.currentTarget);
    if (retiring) setConfirmation(data);
    else void save(data);
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
      <form noValidate id="edit-location-form" onSubmit={submit} aria-busy={Boolean(pending)} className="c-card c-setb-form" aria-label={t.editPlace(place)}
        data-save-on-change="" data-dirty={dirty && notice !== "check" && !confirmation ? "" : undefined} {...handlers}>
        <fieldset disabled={Boolean(pending)} className="c-setb-fieldset">
          <input type="hidden" name="id" value={location.id} />
          <input type="hidden" name="expectedUpdatedAt" value={saved.updatedAt ?? ""} />
          <FieldErrors errors={errors}>
            <div className="c-card__body c-setb-fields">
              <FieldB label={t.name} id="edit-location-name" name="name" required maxLength={160} value={draft.name}
                onChange={(event) => change({ name: event.target.value })} autoComplete="off" />
              <FieldB label={t.shortName} id="edit-location-short-name" name="shortName" required maxLength={48} value={draft.shortName}
                onChange={(event) => change({ shortName: event.target.value })} autoComplete="off" />
              <FieldB kind="textarea" label={t.addressOptional} id="edit-location-address" name="address" maxLength={300}
                rows={2} autoComplete="off" value={draft.address ?? ""} onChange={event => change({ address: event.target.value })} />
            </div>
            <CorpRows>
              <li><SwitchRowB id="edit-location-active" name="active" label={status.active} checked={draft.active} onChange={(active) => change({ active })} describedBy="edit-location-active-help" /></li>
              {/* The Clocker only works at an active location, so an inactive one shows no link to open or copy. */}
              <li>{saved.active ? <div className="c-row c-row--one c-setb-linkrow">
                <span className="c-row__main"><Link className="c-row__title c-setb-rowlink" href={clockerHref}>{t.clockerLink}</Link></span>
                <span className="c-row__trail"><button type="button" className="c-btn c-btn--secondary c-btn--sm c-setb-copy" onClick={copyLink} aria-label={t.copyLink}>{t.copy}</button></span>
              </div> : <CorpRow title={t.clockerLink} value={status.unavailableInactive} valueTone="soft" one />}</li>
              <li><CorpRow href="/app/schedule/settings#coverage-staffing" title={t.staffing} value={staffing ?? t.notSet} valueTone="soft" one chevron /></li>
              <li><CorpRow href="/app/employees" title={t.whoCanWork} value={eligible === undefined ? undefined : String(eligible)} valueTone="soft" one chevron /></li>
            </CorpRows>
            <p className="c-sr" id="edit-location-active-help">{draft.active ? t.activeHelp : status.inactiveHelp}</p>
          </FieldErrors>
        </fieldset>
        {dirty && notice !== "check" && !confirmation ? <CorpFormFooter><button type="submit" className="c-btn" disabled={Boolean(pending)}><ButtonLabel pending={Boolean(pending)} idle={t.save} busy={pending === "checking" ? rt.checking : t.saving} /></button></CorpFormFooter> : null}
        <p role="status" className="c-sr">{dirty ? t.unsaved : t.saved}{copyStatus ? `. ${copyStatus}` : ""}</p>
        <noscript><p className="c-setb-cardnote">{t.noScript}</p></noscript>
        {/* Leaving with edits that are not saved asks first (Nov 21, 2026). */}
        <DiscardGuard dirty={dirty} lang={lang} />
      </form>
      <QuietSheet open={Boolean(confirmation)} onClose={keepActive} role="alertdialog" labelledBy="retire-title" describedBy="retire-detail">
        {confirmation && <div className="b-discard" lang={lang}>
          <h2 className="b-discard__t" id="retire-title">{rt.confirm(saved.name)}</h2>
          <p className="b-discard__s" id="retire-detail">{rt.consequence}</p>
          <div className="b-discard__acts">
            <button type="button" ref={keep} className="b-btn b-btn--quiet b-discard__keep" onClick={keepActive}>{wordPresetId === "restaurant" ? rt.keepRestaurant : rt.keep}</button>
            <button type="button" className="b-btn b-btn--quiet b-discard__go" onClick={() => void save(confirmation)}>{rt.deactivate}</button>
          </div>
        </div>}
      </QuietSheet>
      {pending === "checking" && <ResultB tone="info" title={rt.checking} />}
      {notice === "inactive" && <ResultB innerRef={feedback} tone="done" title={rt.inactive(saved.name)}>{rt.history}</ResultB>}
      {notice === "saved" && <ResultB innerRef={feedback} tone="done" title={t.updated(words.location)}>{successBody(result.success)}</ResultB>}
      {notice === "failed" && <ResultB innerRef={feedback} tone="urgent" title={t.changesNotSaved}>{result.error}</ResultB>}
      {notice === "blocked" && <ResultB innerRef={feedback} tone="urgent" title={rt.blocked(saved.name)}
        action={<span className="location-retirement-links">{result.locationRetirementBlockers?.map(code =>
          <a key={code} className="c-link c-link--l" href={recoveryRoutes[code]} target="_blank" rel="noopener noreferrer">{rt.blockers[code]}</a>)}</span>}>{rt.resolve}</ResultB>}
      {notice === "check" && !pending && <ResultB innerRef={feedback} tone="urgent" title={rt.unknown}
        action={<button type="button" className="c-btn c-btn--secondary" onClick={() => {
          if (!submitting.current) { submitting.current = true; void refresh(result); }
        }}>{rt.check}</button>}>{rt.checkFirst}</ResultB>}
      {notice === "review" && <ResultB innerRef={feedback} tone="info" title={rt.checked}>
        {dirty ? <>{rt.review}<span className="location-review-values">
          <strong>{rt.current}</strong><span>{t.name} · {saved.name}</span><span>{t.shortName} · {saved.shortName}</span>
          <span>{t.address} · {saved.address || t.notSet}</span><span>{saved.active ? rt.active : rt.inactiveStatus}</span>
        </span></> : rt.matches}
      </ResultB>}
    </>
  );
}
