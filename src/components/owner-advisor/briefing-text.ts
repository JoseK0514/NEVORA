import { formatTime } from "@/lib/date-utils";
import { formatPortalCopy } from "@/lib/i18n/format-portal-copy";
import type { AttentionKind } from "@/lib/owner-advisor/briefing-contracts";
import { copy } from "./attention-copy";
import { attentionDetail, spanishTimes, type Lang } from "./format";

const titles = {
  clock_in: "clockTitle",
  coverage: "coverageTitle",
  missing_punches: "finishedTitle",
  setup: "setupTitle",
} as const satisfies Record<AttentionKind, keyof typeof copy.en>;

export function briefingTitle(kind: AttentionKind, title: string, lang: Lang) {
  const key = titles[kind];
  return lang === "es" && title === copy.en[key] ? copy.es[key] : title;
}

export function briefingSource(label: string, lang: Lang) {
  if (lang === "es") {
    if (label === copy.en.punchesSource) return copy.es.punchesSource;
    if (label === copy.en.todaySource) return copy.es.todaySource;
  }
  return label;
}

/** The briefing read supplies prose. Translate only its fixed templates, keeping names and unknown source text intact. */
export function briefingDetail(detail: string, kind: AttentionKind, lang: Lang) {
  if (lang === "en") return attentionDetail(detail);
  if (kind === "setup" && detail === copy.en.coverageSetup) return copy.es.coverageSetup;
  if (kind === "clock_in" || kind === "missing_punches") {
    const n = /^\d+/.exec(detail)?.[0];
    if (!n) return detail;
    const key = kind === "clock_in"
      ? n === "1" ? "clockOne" : "clockOther"
      : n === "1" ? "finishedOne" : "finishedOther";
    return formatPortalCopy(copy.en[key], { n }) === detail ? formatPortalCopy(copy.es[key], { n }) : detail;
  }
  if (kind !== "coverage") return detail;
  const hasNote = detail.endsWith(" " + copy.en.draftNote);
  const facts = hasNote ? detail.slice(0, -copy.en.draftNote.length - 1) : detail;
  const pieces = /^(\d+) planning periods need review, starting (\d{2}:\d{2})\. Maximum staffing shortfall: (\d+)\.( A designated lead is missing\.)?(?: Unfilled positions: (.+)\.)?$/u.exec(facts);
  if (!pieces) return detail;
  const [, count, start, shortfall, lead, names] = pieces;
  const hour = spanishTimes(formatTime(start), "es").replace(/\.$/, "");
  const time = (Number(start.slice(0, 2)) % 12 === 1 ? "la " : "las ") + hour;
  return [
    formatPortalCopy(count === "1" ? copy.es.planningOne : copy.es.planningOther, { n: count, time }),
    formatPortalCopy(copy.es.shortfall, { n: shortfall }).replace(/ (\d+)\.$/, "\u00a0$1."),
    lead && copy.es.leadNeeded,
    names && formatPortalCopy(copy.es.positionsNeeded, { names }),
    hasNote && copy.es.draftNote,
  ].filter(Boolean).join(" ");
}
