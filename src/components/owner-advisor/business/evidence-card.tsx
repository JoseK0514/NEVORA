"use client";
import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ReceiptIcon } from "@phosphor-icons/react/dist/ssr/Receipt";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import type { AdvisorSource } from "@/lib/owner-advisor/contracts";
import { isBusinessQualifierCode, type BusinessCitation } from "@/lib/owner-advisor/business/contracts";
import type { BusinessModelEvidence } from "@/lib/owner-advisor/business/model-contracts";
import { isBusinessCitationHref } from "@/lib/owner-advisor/business/metrics";
import { clockText, periodText } from "./business-client";
import { BUSINESS_COPY, BUSINESS_LOCALE, type BusinessCopy, type BusinessLang } from "./copy";
import { financeFigures, salesFigures, type Figure } from "./figures";
import { viewHref } from "./views";
import { useAdvisorLang } from "../lang";
import "./business.css";

/* The evidence card in a Rondo answer (Nov 17, 2026). A business citation is a button; it opens the figures the answer
 * was built on, from the typed evidence the answer parser already checked field by field. Nothing here is calculated and
 * nothing is read again: a figure the server did not send is not shown. If anything about the evidence can't be
 * presented exactly (an unknown code, a malformed amount) there is no card and the citation stays the plain private link. */

type Block = { key: string; title: string; unavailable: string | null; state: string; incomplete: boolean; period: string; places: string; counts: string; checked: string;
  groups: { currency: string; figures: Figure[] }[]; notes: string[] };
type CardModel = { citation: BusinessCitation; recordPeriod: string; blocks: Block[] };

/** Everything the card says, or null when it can't be said exactly. */
export function evidenceCardModel(href: string, evidence: BusinessModelEvidence[] | undefined, t: BusinessCopy, locale: string, openedAt: number): CardModel | null {
  try {
    if (!isBusinessCitationHref(href) || !evidence?.length) return null;
    const cited = evidence.filter(item => item.citations.some(citation => citation.href === href));
    const citation = cited[0]?.citations.find(item => item.href === href);
    if (!citation) return null;
    const blocks = cited.map((item, index): Block => {
      if (!item.qualifiers.every(isBusinessQualifierCode)) throw Error("unknown qualifier");
      const unavailable = item.state === "unavailable" ? t.unavailable[item.reason!] : null;
      if (item.state === "unavailable" && !unavailable) throw Error("unknown reason");
      const groups = item.state !== "ready" ? [] : item.domain === "FINANCE"
        ? (item.finance?.currencies ?? []).map(c => ({ currency: c.currency, figures: financeFigures(t, c, true) }))
        : (item.sales?.currencies ?? []).map(c => ({ currency: c.currency, figures: salesFigures(t, c, true) }));
      // A ready answer with no figures has nothing a card may state.
      if (item.state === "ready" && !groups.length) throw Error("no figures");
      const lapsed = item.expiresAt === null || Date.parse(item.expiresAt) <= openedAt;
      return { key: `${item.queryHash}:${index}`, title: t.domain[item.domain], unavailable, incomplete: item.state === "ready" && !item.completeScope && !item.sourceSubtotal,
        state: item.temporalUse === "HISTORICAL" ? t.pastPeriod : lapsed ? t.askAgain : t.currentWhenChecked,
        period: periodText(item.window, item.timeZone, locale), places: item.locationScope.kind === "ALL" ? t.allPlaces : t.somePlaces(item.locationScope.locationIds.length),
        counts: item.selection.kind === "SOURCE" ? t.countsOne : t.countsMain, checked: clockText(item.observedAt, item.timeZone, locale),
        groups, notes: item.qualifiers.map(code => t.qualifier[code]) };
    });
    return { citation, recordPeriod: periodText(citation.window, citation.timeZone, locale), blocks };
  } catch { return null; }
}

/** One source line of an answer. A business citation with checked evidence becomes a button and its card; anything else,
 * or a citation whose evidence can't be shown exactly, is the same plain link as every other source. */
export function BusinessCitationItem({ source, evidence, lang: langProp, initialOpenAt = null }: { source: AdvisorSource; evidence?: BusinessModelEvidence[]; lang?: BusinessLang; initialOpenAt?: number | null }) {
  // An explicit language wins (tests); otherwise the person's Rondo language.
  const advisorLang = useAdvisorLang(), lang: BusinessLang = langProp ?? advisorLang;
  const t = BUSINESS_COPY[lang], locale = BUSINESS_LOCALE[lang];
  const [openAt, setOpenAt] = useState<number | null>(initialOpenAt);
  const trigger = useRef<HTMLButtonElement>(null), card = useRef<HTMLDivElement>(null);
  const id = useId();
  // Judged once, at a fixed moment, so the card's words don't change between two renders.
  const [judgedAt] = useState(() => initialOpenAt ?? Date.now());
  const model = evidenceCardModel(source.href, evidence, t, locale, openAt ?? judgedAt);
  const observed = <span>{t.observed} <time dateTime={source.observedAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(source.observedAt))}</time></span>;
  if (!model) return <li><a href={source.href}>{source.label}</a>{observed}</li>;
  const close = () => { setOpenAt(null); trigger.current?.focus(); };
  const open = () => { setOpenAt(Date.now()); requestAnimationFrame(() => card.current?.focus()); };
  const keys = (event: KeyboardEvent) => { if (event.key === "Escape" && openAt !== null) { event.stopPropagation(); close(); } };
  return <li className="be-item" onKeyDown={keys}>
    <button ref={trigger} type="button" className="be-cite" aria-expanded={openAt !== null} aria-controls={`${id}-card`} aria-label={t.showFigures(source.label)}
      onClick={() => openAt === null ? open() : close()}><ReceiptIcon weight="bold" aria-hidden="true" /><span>{source.label}</span></button>
    {observed}
    {openAt !== null ? <div ref={card} id={`${id}-card`} className="be-card" role="group" aria-label={t.cardLabel(source.label)} tabIndex={-1}>
      <button type="button" className="be-card__close" aria-label={t.close} onClick={close}><XIcon weight="bold" aria-hidden="true" /></button>
      {model.blocks.map(block => <section key={block.key} className="be-card__block" aria-label={block.title}>
        <p className="be-card__title">{block.title}<span>{block.period}</span></p>
        {block.unavailable
          ? <p className="be-card__state be-card__state--stop">{t.figuresUnavailable}. {block.unavailable}.</p>
          : block.groups.map(group => <dl key={group.currency} className="be-figs">
              {group.figures.map(figure => <div key={figure.key}><dt>{figure.label}{figure.note ? <small> · {figure.note}</small> : null}</dt><dd>{figure.value}</dd></div>)}
            </dl>)}
        <dl className="be-facts">
          <div><dt>{t.places}</dt><dd>{block.places}</dd></div>
          <div><dt>{t.counts}</dt><dd>{block.counts}</dd></div>
          <div><dt>{t.checked}</dt><dd>{block.checked}</dd></div>
        </dl>
        {block.unavailable ? null : <p className="be-card__state">{block.state}{block.incomplete ? `. ${t.incomplete}` : ""}</p>}
        {block.notes.length ? <ul className="be-card__notes">{block.notes.map(note => <li key={note}>{note}</li>)}</ul> : null}
      </section>)}
      <div className="be-card__record">
        <p><span>{t.record}</span>{model.citation.name}<small>{model.recordPeriod} · {model.citation.currency}</small></p>
        <span className="be-card__links">
          <Link href={viewHref({ name: "version", sourceId: model.citation.sourceId, versionId: model.citation.versionId })}>{t.openRecord}</Link>
          <a href={model.citation.href} target="_blank" rel="noreferrer">{t.plainText}</a>
        </span>
      </div>
    </div> : null}
  </li>;
}
