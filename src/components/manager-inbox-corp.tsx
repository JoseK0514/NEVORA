"use client";
import Link from "next/link";
import "./manager-inbox-corp.css";
import type { ReactNode } from "react";
import { CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpCount, CorpNav, CorpNote, CorpPage, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";
import { useActionCenter, mobileActionDetail, type ActionCenterConnection } from "./manager-action-center";
import { useToday } from "./manager-today";
import { gapPlace, itemEntry, lateBy, planLabel, shiftEntry } from "./manager-inbox";
import { workspaceNow } from "@/lib/action-center/inbox";
import { needsYou } from "@/lib/action-center/needs-you";
import { concernsActor, needsYouTotal, reviewRoute, timecardPeriod, type NeedsYouTotal } from "@/lib/action-center/review-routing";
import { coverOutcomeText, otherShiftLine, swapShifts } from "@/lib/action-center/request-details";
import { reviewCopy, type ReviewCopy } from "@/components/review-details/copy";
import { businessDate } from "@/lib/business-time";
import { weekStartFor } from "@/lib/date-utils";
import { dateRange } from "@/lib/duration-format";
import { itemPerson, presentItem, readableDates, spacedRanges, splitNoClockIn } from "@/lib/action-center/present";
import { actionCenterNavigation } from "./action-center-navigation";
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";
import type { Today, TodayShift } from "@/lib/today/project";
import { InboxB, LaterB } from "./owner-b/inbox-b";
import { ATTENDANCE, clockIn } from "./owner-b/owner-b-copy";
import { managerInboxCopy, type InboxCopy } from "./manager-inbox-copy";
import { usePortalLang, type PortalLang } from "@/lib/i18n/portal-lang";
import { BSwapNames } from "./owner-b/b-kit";
import { isStaffingRepair, repairTitle, repairWhen } from "@/lib/time-off-staffing/present";

/* Things to do (Release 1; approved board O-Inbox, Oct 26). Presentation only: the same action center and Today reads as
 * the Inbox before it, the same review links and the same count as Home and the sidebar badge. One card per kind with its
 * count; each row opens the full review, where the decision is made (no Approve or Decline in the list). */

type Row = { key: string; href: string; label: string; title: string; swapWith?: string; detail?: string; value?: string; valueTone?: "red" | "soft" | "amber";
  /** Phase 3 (MG-012): the person the request is from, when the title says more than their name (the row's avatar). */
  person?: string;
  /** Phase 4 (U09): further lines under the detail: the other shift of a swap, a cover request's result. */
  lines?: string[];
  /** Phase 4 (U03): listed for the record, not this person's to decide (another reviewer approves it). */
  quiet?: boolean };
type Group = { id: string; title: string; rows: Row[]; count?: number; aside?: { href: string; label: string; text: string };
  /** A line under the card's heading ("You can approve these from Mon, Nov 16."). */
  note?: string };
type Family = { id: string; title: string; groups: Group[] };

/** The words a row is drawn with: the language, its copy and the review words. */
type W = { lang: PortalLang; c: InboxCopy; t: ReviewCopy };
const wordsFor = (lang: PortalLang = "en"): W => ({ lang, c: managerInboxCopy(lang), t: reviewCopy(lang) });
const EN = wordsFor("en");

const clock = (iso: string, timeZone: string) => new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const dayText = (date: string, w: W = EN) => new Intl.DateTimeFormat(w.c.locale, { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00Z`));
// R7 (copy row 12): midnight reads as Schedule does, "12:00 AM".
const hhmm = (value: string) => { const [h, m] = value.split(":").map(Number); const hour = h % 24; return `${(hour % 12) || 12}:${String(m).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`; };
const midnight = (text: string) => text.replace(/\bmidnight\b/gi, "12:00 AM");
/** R7 (copy row 3): "Need 1 employee" reads "Needs 1 person" ("Needs 2 people"), the count kept with its noun. */
const needs = (text: string, w: W = EN) => text.replace(/Need\s(\d+)\semployees?/g, (_, n: string) => w.c.needs(n));
/** Spanish reads the clock as "a. m./p. m." (owner-b clockIn); English is unchanged. */
const local = (w: W, text: string) => w.lang === "es" ? clockIn("es", text).replace(/[\s\u00a0]([ap])\.[\s\u00a0]m\./g, "\u00a0$1.\u00a0m.") : text;
const plain = (text: string) => text.replace(/ /g, " ");
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** Codex's optional request facts (dates and partial-day times), when the read carries them. */
type RequestFacts = { startDate: string; endDate: string; partialDay?: { start: string; end: string } };
function requestDetail(item: ActionItem, fallback: string, w: W) {
  const facts = (item as ActionItem & { request?: RequestFacts }).request;
  if (!facts) return fallback;
  const dates = facts.startDate === facts.endDate ? dayText(facts.startDate, w) : `${dayText(facts.startDate, w)} – ${dayText(facts.endDate, w)}`;
  // Backend (Nov 15, 2026): a cover request says so (a swap's title already shows both people with ⇄).
  const cover = item.type === "EXCHANGE" && item.request?.exchangeKind === "COVERAGE" ? w.c.coverRequest : "";
  // Phase 8 (a.md #14): several whole days read as Time off requests says them ("3 days"); one day is "All day".
  const days = Math.round((Date.parse(`${facts.endDate}T12:00:00Z`) - Date.parse(`${facts.startDate}T12:00:00Z`)) / 86_400_000) + 1;
  return `${cover}${dates} · ${facts.partialDay ? `${hhmm(facts.partialDay.start)} – ${hhmm(facts.partialDay.end)}` : days > 1 ? w.c.days(days) : w.c.allDay}`;
}

function itemRow(item: ActionItem, timeZone: string, calm = false, w: W = EN): Row {
  const { c, t } = w;
  const entry = itemEntry(item, calm, "all", timeZone, w.lang);
  const shown = presentItem({ ...item, detail: mobileActionDetail(item.detail) }, actionCenterNavigation(item, w.lang).label, timeZone, w.lang);
  const request = item.category === "requests";
  // Nov 14, 2026 inspection (BR-7): a shift request names both people when the read carries the other one. Phase 3
  // (MG-012): the two names are joined by the swap sign.
  const other = request ? item.request?.counterpartName : undefined;
  const who = request ? shown.person ?? shown.title : shown.title;
  const facts = request ? item.request : undefined;
  const callout = item.type === "CALLOUT" && facts && shown.person ? facts : null;
  // Phase 4 (U09): only a swap joins two names; a cover request is the requester's, and who picked it up is its result.
  const covering = item.type === "EXCHANGE" && item.request?.exchangeKind === "COVERAGE";
  // Phase 8 (a.md #13, b.md #44): a can't-work row's title is the person, like every other row; the card already says
  // "Can't work", so the line under it is the day, the shift's time and its place.
  // Final polish (Nov 20, 2026): the row draws the two names round the bold swap glyph (BSwapNames), so the title is the
  // requester and `swapWith` the other person (it was one string with a thin text arrow).
  const title = who, swapWith = other && !covering ? plain(other) : undefined;
  const base = callout ? [callout.startDate === callout.endDate ? dayText(callout.startDate, w) : `${dayText(callout.startDate, w)} – ${dayText(callout.endDate, w)}`,
    callout.partialDay ? `${hhmm(callout.partialDay.start)} – ${hhmm(callout.partialDay.end)}` : c.allDay, callout.locationName].join(" · ")
    : request ? requestDetail(item, shown.detail, w) : shown.detail;
  // Phase 4 (U09): the facts now carry both shifts of a swap and a cover request's status. A swap shows each shift on
  // its own line (date, time, place); a second shift the server withholds, or one the read doesn't carry, says so and
  // is never read as "no second shift". A cover request says its result, and "not known" is not "nobody".
  const year = facts?.shift?.date.slice(0, 4);
  const swap = item.type === "EXCHANGE" && facts?.exchangeKind === "SWAP" ? swapShifts(facts, t, year, w.lang) : null;
  const cover = item.type === "EXCHANGE" && facts?.exchangeKind === "COVERAGE" ? facts : null;
  const detail = swap?.offered ? `${shown.person ? `${t.shiftOf(firstName(shown.person))}: ` : ""}${swap.offered}`
    : cover?.shift ? `${t.coverRequest} · ${swapShifts(cover, t, year, w.lang).offered}` : base;
  // Phase 4 (U03): a time correction this person can't decide stays listed and says who decides it, from the typed
  // review facts (no reviewer is assigned in the read, so no name and no date are given).
  const route = reviewRoute(item);
  const lines = [
    ...(swap ? [otherShiftLine(swap, other ? firstName(other) : undefined, t)] : []),
    ...(cover ? [coverOutcomeText(cover, t)] : []),
    ...(item.type === "TIME_CORRECTION" && route === "other_reviewer" ? [t.otherReviewer] : item.type === "TIME_CORRECTION" && route === "unknown" ? [t.reviewUnchecked] : []),
  ].map(line => local(w, midnight(plain(line))));
  return { key: item.id, href: entry.href, label: local(w, midnight([other && !covering ? c.withPerson(entry.label, other) : entry.label, ...lines].join(". "))), title: plain(title), ...(swapWith ? { swapWith } : {}),
    detail: local(w, needs(midnight(plain(detail)), w)), ...(request && shown.person ? { person: shown.person } : {}), ...(lines.length ? { lines } : {}),
    ...(item.type === "TIME_CORRECTION" && route !== "mine" ? { quiet: true } : {}) };
}

/** An open shift as the board reads it: "Barista 1:00 PM – 3:00 PM" over "Today · Condado · 1 open", or
 * "12:00 AM – 8:00 AM" over "Today · Condado · Needs 1 person"; a whole-day gap is "Open all day". */
export function gapRow(item: ActionItem, timeZone: string, day: string, lang: PortalLang = "en"): Row {
  const w = wordsFor(lang);
  const row = itemRow(item, timeZone, false, w);
  const [date, when, ...parts] = mobileActionDetail(item.detail).split(" · ");
  // The read may keep the count with its noun using a no-break space, so any space matches.
  const rest = parts.map(part => needs(part, w));
  if (!when) {
    const title = plain(gapPlace(item));
    return { ...row, title, label: w.lang === "es" ? `${actionCenterNavigation(item, w.lang).label}: ${title}` : row.label };
  }
  // One position short reads as that position ("Barista 1:00 PM – 3:00 PM", "1 open"); otherwise the time and the need.
  const single = rest.length === 1 && /^[^;]+: \d+ open$/.test(rest[0]) ? rest[0].split(": ") : null;
  const itemDay = item.dateTime?.slice(0, 10);
  const dateLabel = itemDay === day ? w.c.today : w.lang === "es" && itemDay && /^\d{4}-\d{2}-\d{2}$/.test(itemDay) ? dayText(itemDay, w) : date;
  const localCount = (part: string) => w.lang === "en" ? part : part.replace(/(\d+) open\b/g, (_, count: string) =>
    (count === "1" ? w.c.openCountOne : w.c.openCountOther).replace("{count}", count));
  // "all day" from the read is a row title here: "Open all day" (copy row 11); "midnight" reads "12:00 AM" (row 12).
  // R2: thin spaces round the en dash ("12:00 AM – 8:00 AM"), as the kit's timeRangeText sets them.
  const time = /^all day$/i.test(when.trim()) ? w.c.openAllDay : midnight(when.replace(/\s*–\s*/, "\u2009–\u2009"));
  const title = local(w, plain(single ? `${single[0]} ${time}` : time));
  const detail = local(w, plain([dateLabel, gapPlace(item), ...(single ? [single[1]] : rest).map(localCount)].join(" · ")));
  const label = w.lang === "es" ? `${actionCenterNavigation(item, w.lang).label}: ${title}, ${detail}` : row.label;
  return { ...row, title, detail, label };
}

/** Timecards to approve: one row per pay period, naming whose cards are waiting; it opens Time. Nov 14, 2026 inspection
 * (BR-7): each row says how many cards it holds and whether its pay period has ended, the words Home's Payday uses for
 * the cards it counts ("Pay period ended"), so the two screens' numbers can be told apart. */
function timecardRows(items: ActionItem[], day: string, open = true, dateInNote = false, w: W = EN): Row[] {
  const { c, t } = w;
  // Phase 4 (U09): the card's own pay period comes from the typed review facts; an older payload without them keeps
  // the period the item's line names.
  const periodText = (item: ActionItem) => { const period = item.review?.period; return period ? dateRange(period.startDate, period.endDate, { locale: c.locale }) : plain(spacedRanges(readableDates(item.detail.split(" · ")[1] ?? ""))).replace(/\.\s*$/, ""); };
  const byPeriod = new Map<string, ActionItem[]>();
  for (const item of items) { const period = periodText(item); byPeriod.set(period, [...(byPeriod.get(period) ?? []), item]); }
  return [...byPeriod].flatMap(([period, all]) => {
    // Phase 4 (U03): the count and the names are the cards this person may review (the server's actorMayReview). A card
    // another reviewer approves, the signed-in person's own included, is its own row under the period, so it stays
    // visible; a card whose review facts are missing says that it could not be checked. Neither is counted.
    const list = all.filter(mine);
    // Review B5 (NV-243): a period is a title, never a sentence ("Nov 2–8", not "Nov 2–8.").
    const title = plain(period || c.thisPayPeriod);
    const rest: Row[] = all.filter(item => !mine(item)).map(item => {
      const name = concernsActor(item) ? t.yourTimecard : itemPerson(item) ?? item.detail.split(" · ")[0] ?? title;
      const why = reviewRoute(item) === "other_reviewer" ? t.otherReviewer : t.reviewUnchecked;
      const review = new URL(item.href, "https://nevora.invalid");
      return { key: `timecard-other:${item.id}`, href: review.pathname === "/app/timecards" ? review.pathname + review.search + review.hash : "/app/timecards",
        label: `${name}, ${title}. ${why}.${reviewRoute(item) === "other_reviewer" ? ` ${t.reviewerNeeded}` : ""}`, title: plain(name), detail: title, lines: [why], quiet: true };
    });
    if (!list.length) return rest;
    const names = list.map(item => itemPerson(item) ?? item.detail.split(" · ")[0]).map(name => name.split(" ")[0]);
    // Time opens on that pay period (the items' own review link: ?start=&end=), and on the person's card when only one
    // is waiting. Without the period it would open the current week, where an earlier period's cards aren't shown.
    const review = new URL(list[0].href, "https://nevora.invalid");
    if (list.length > 1) review.hash = "";
    const href = review.pathname === "/app/timecards" ? review.pathname + review.search + review.hash : "/app/timecards";
    const end = periodEnd(list[0]) ?? "";
    const state = /^\d{4}-\d{2}-\d{2}$/.test(end) ? end < day ? c.periodEnded : c.periodOpen : undefined;
    const cards = c.timecards(list.length, all.length);
    // Phase 3 (MG-005): a pay period that is still open can't be approved yet; its row says the day approval opens.
    const opens = !open && /^\d{4}-\d{2}-\d{2}$/.test(end) ? c.opens(dayText(nextDay(end), w)) : undefined;
    // Jose (Nov 15, 2026): when the card's heading line already says the day approval opens, the row names the people.
    return [{ key: `timecards:${period}`, href, label: `${opens ? c.groups.stillOpen : c.groups.timecards}, ${title}${opens ? `, ${opens.toLowerCase()}` : state ? `, ${state.toLowerCase()}` : ""}: ${names.join(", ")}`, title,
      detail: opens && !dateInNote ? `${opens} · ${cards}` : `${cards} · ${names.join(", ")}`, value: opens ? undefined : state, valueTone: "soft" as const }, ...rest];
  });
}
const nextDay = (date: string) => new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const periodEnd = (item: ActionItem) => timecardPeriod(item)?.endDate ?? null;
const periodEnded = (item: ActionItem, day: string) => { const end = periodEnd(item); return !end || end < day; };
/** Phase 4 (U03): this person may review it (the server's typed actorMayReview). */
const mine = (item: ActionItem) => reviewRoute(item) === "mine";

function shiftRow(shift: TodayShift, timeZone: string, observedAt: string | undefined, showPlace: boolean, scoped: boolean, w: W = EN): Row {
  const entry = shiftEntry(shift, timeZone, observedAt, showPlace);
  const running = shift.status === "not_clocked_in";
  // R7 (copy row 9): the heading says Not clocked in or Missed clock-ins, so the line says only when the shift began or ended.
  const when = local(w, (running ? w.c.shiftBegan : w.c.shiftEnded)(clock(running ? shift.startAt : shift.endAt, timeZone)));
  const href = scoped ? '/app/schedule?' + new URLSearchParams({ week: weekStartFor(businessDate(new Date(shift.startAt), timeZone)), location: shift.locationId }) : entry.href;
  const label = scoped ? w.c.viewShiftFor(shift.employeeName) : w.lang === "en" ? entry.label
    : running ? w.c.contactFor(shift.employeeName, ATTENDANCE.es.notClockedIn) : w.c.reviewTimecardFor(shift.employeeName, ATTENDANCE.es.missed);
  return { key: entry.key, href, label, title: shift.employeeName, detail: plain(showPlace ? `${when} · ${shift.locationName}` : when),
    value: running ? lateBy(shift, observedAt) : undefined, valueTone: "red" };
}

/** Plan ahead: one row per kind. One item opens itself; several show their count and open the first. */
function planRows(items: ActionItem[], timeZone: string, w: W = EN): Row[] {
  const byType = new Map<ActionItem["type"], ActionItem[]>();
  for (const item of items) byType.set(item.type, [...(byType.get(item.type) ?? []), item]);
  return [...byType].map(([type, list]) => {
    const first = itemRow(list[0], timeZone, false, w);
    const title = (w.lang === "en" ? planLabel[type] : w.c.plan[type]) ?? first.title;
    return list.length === 1 ? { ...first, title, label: first.label }
      : { key: `plan:${type}`, href: first.href, label: `${title}, ${list.length}`, title, value: String(list.length), valueTone: "soft" };
  });
}

/** Things to do lists exactly what Home and the sidebar count (who hasn't clocked in, today's urgent items and people's
 * requests). Owner premium round 2 (R3, R6): every kind has its own heading with its count ("Open shifts 3", "Missed
 * clock-ins 1"), and related kinds share a card, so the page never shows more than three cards:
 *   1. Open shifts (the schedule's job);
 *   2. Time: people not clocked in, missed clock-ins, other urgent clock-in items, time corrections and timecards to
 *      approve (the time job);
 *   3. Requests: time off, swaps, can't-work and other requests, ending with "More requests" (the full request lists and
 *      Older items), which is its own card only when no request is waiting.
 * Each kind keeps its anchor (#todo-open, #todo-missed, #todo-time-off, …) and the Time card keeps #todo-review, so Home's
 * links still land. The headings' counts add up to the sidebar badge. Everything else the action center holds
 * (corrections and timecards that aren't urgent, planning and earlier gaps) is on Older items and is never counted.
 * Presentation only: the same reads and the same counts as before. */
export function groupThingsToDo(snapshot: Extract<ActionCenter, { state: "ready" }>, today: Today | null, timeZone: string, coverageFirst: boolean, scoped = false, lang: PortalLang = "en") {
  const w = wordsFor(lang), { c } = w;
  const row = (item: ActionItem) => itemRow(item, timeZone, false, w);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(snapshot.observedAt));
  const value = needsYou(snapshot.items, day, today?.state === "ready" ? today.missed : [], workspaceNow(snapshot.observedAt, timeZone));
  const urgent = value.now, later = value.planning;
  const of = (types: ActionItem["type"][], list: ActionItem[]) => list.filter(item => types.includes(item.type));
  const requests = [...urgent.filter(item => item.category === "requests"), ...value.requests];
  const known: ActionItem["type"][] = ["TIME_OFF", "EXCHANGE", "CALLOUT"];
  const timeKinds: ActionItem["type"][] = ["TIME_CORRECTION", "TIMECARD"];
  const places = new Set(value.noClockIn.map(shift => shift.locationName)).size > 1;
  // Jose's attendance words (Nov 11, 2026): a shift still in progress with no punch is "Not clocked in"; only a shift that
  // ended with no punch is "Missed".
  const noClockIn = splitNoClockIn(value.noClockIn);
  // On a narrow phone the line may wrap; the count stays with its noun ("1 open", "Needs 1 person").
  // Approved leave over a published shift (Nov 9, 2026): the schedule's job, next to open shifts. "Fill Maria Rivera’s
  // shift" over its day, time and place; an older approval with no reviewer says an Owner needs to take it. No decision.
  const repair: Group = { id: "repair", title: c.groups.repair, rows: urgent.filter(isStaffingRepair).map(item => ({ ...row(item),
    title: repairTitle(item, lang), detail: local(w, plain(midnight(repairWhen(item, lang)))), ...(item.ownerEmployeeId === null ? { value: c.notAssigned, valueTone: "amber" as const } : {}) })) };
  const open: Group = { id: "open", title: c.groups.open, rows: of(["COVERAGE_GAP"], urgent).map(item => gapRow(item, timeZone, day, lang))
    .map(gap => ({ ...gap, detail: gap.detail?.replace(/ (\d+) open$/, " $1\u00a0open") })) };
  const time: Group[] = [
    { id: "not-clocked-in", title: ATTENDANCE[lang].notClockedIn, rows: noClockIn.running.map(shift => shiftRow(shift, timeZone, snapshot.observedAt, places, scoped, w)) },
    { id: "missed", title: c.groups.missed, rows: noClockIn.ended.map(shift => shiftRow(shift, timeZone, snapshot.observedAt, places, scoped, w)) },
    { id: "now", title: c.groups.now, rows: urgent.filter(item => item.type !== "COVERAGE_GAP" && item.category !== "requests" && !timeKinds.includes(item.type) && !isStaffingRepair(item)).map(row) },
    // Phase 3 (MG-005): corrections that wait on this person can be decided today, so they sit with today's Time kinds
    // and are part of the count (needsYou counts them; the reviewer's own correction is another person's to decide).
    { id: "corrections", title: c.groups.corrections, rows: [...of(["TIME_CORRECTION"], urgent), ...value.corrections].map(row) },
    { id: "timecards", title: c.groups.timecards, rows: timecardRows(of(["TIMECARD"], urgent), day, true, false, w), count: of(["TIMECARD"], urgent).filter(mine).length },
  ];
  const asked: Group[] = [
    { id: "time-off", title: c.groups.timeOff, rows: of(["TIME_OFF"], requests).map(row) },
    // Phase 8 (a.md #14): the card holds swaps and cover requests, so it carries the page's name for both.
    { id: "swaps", title: c.groups.swaps, rows: of(["EXCHANGE"], requests).map(row) },
    { id: "cant-work", title: c.groups.cantWork, rows: of(["CALLOUT"], requests).map(row) },
    { id: "requests", title: c.groups.requests, rows: requests.filter(item => !known.includes(item.type)).map(row) },
  ];
  const shown = (groups: Group[]) => groups.filter(group => group.rows.length);
  const cards: Family[] = [
    { id: "card-open", title: c.families.open, groups: shown([repair, open]) },
    { id: "review", title: c.families.time, groups: shown(time) },
    { id: "card-requests", title: c.families.requests, groups: shown(asked) },
  ];
  const families = (coverageFirst ? cards : [cards[1], cards[0], cards[2]]).filter(family => family.groups.length);
  // Review B2 (NV-002): timecards that wait for a review are things to do too, so they are listed here, after today's
  // cards. Phase 3 (MG-005): the cards of a pay period that has ended can be approved today ("Timecards to approve");
  // the cards of a period still open can't, so they are one closed card at the bottom that says the day approval opens.
  // The reviewer's own correction (another person decides it) stays listed with the waiting reviews.
  const periodCards = of(["TIMECARD"], later), due = periodCards.filter(item => periodEnded(item, day)), notOpen = periodCards.filter(item => !periodEnded(item, day));
  const waiting: Group[] = [
    // Phase 4 (U03): corrections another reviewer decides stay listed here; the count is only what this person can decide.
    { id: "waiting-corrections", title: c.groups.corrections, rows: of(["TIME_CORRECTION"], later).map(row), count: of(["TIME_CORRECTION"], later).filter(mine).length },
    { id: "waiting-timecards", title: c.groups.timecards, rows: timecardRows(due, day, true, false, w), count: due.filter(mine).length },
  ].filter(group => group.rows.length);
  // Jose (Nov 15, 2026): the card is "Pay period still open", and when one period is waiting its line says the day
  // approval opens, in the words Time exports uses. Two periods keep the day on each row.
  const openEnds = [...new Set(notOpen.filter(mine).map(periodEnd).filter((end): end is string => !!end))];
  const opensOn = openEnds.length === 1 ? dayText(nextDay(openEnds[0]), w) : null;
  const closed: Group[] = [
    { id: "closed-timecards", title: c.groups.stillOpen, rows: timecardRows(notOpen, day, false, !!opensOn, w), count: notOpen.filter(mine).length,
      // The day stays on one line on a narrow phone ("Mon, Nov 16." never breaks before "16").
      ...(opensOn ? { note: c.approveFrom(opensOn.replace(/ /g, "\u00a0")) } : {}) },
  ].filter(group => group.rows.length);
  const more: Group[] = [
    { id: "plan", title: c.groups.plan, rows: planRows(later.filter(item => !timeKinds.includes(item.type)), timeZone, w), count: later.filter(item => !timeKinds.includes(item.type)).length },
    // Earlier this week: one row per kind (a week of past coverage gaps is one row with its count, not a long list).
    { id: "earlier", title: c.groups.earlier, rows: value.past.length > 1
      ? [{ key: "earlier:gaps", href: "/app/schedule", label: c.gapsEarlier(value.past.length), title: c.coverageGaps, value: String(value.past.length), valueTone: "soft" as const }]
      : value.past.map(item => itemRow(item, timeZone, true, w)), count: value.past.length },
  ].filter(group => group.rows.length);
  // Phase 4 (U03): the count with its completeness. When today's clock-ins couldn't be read, or a correction's review
  // facts are missing, the count is a lower bound ("at least") and the page never offers all-clear.
  const total: NeedsYouTotal = needsYouTotal(value, { clockInsUnavailable: today?.state === "unavailable" });
  return { value, families, waiting, closed, more, total };
}

/** R7 (copy row 6): the screen-reader line matches the page's name. "5 things to do today", never "need you". */
export const toDoSentence = (n: number, exact = true, lang: PortalLang = "en") => { const { c, t } = wordsFor(lang); return n === 0 ? exact ? c.nothingToDo : `${t.notAllChecked}.`
  : exact ? c.thingsToDo(n) : t.toDoAtLeast(n); };

const groupCount = (group: Group) => group.count ?? group.rows.length;

export function ManagerInboxCorp({ weekStart, actorId, timeZone, coverageFirst = false, view = "today", scoped = false }: { weekStart: string; actorId: string; timeZone: string; coverageFirst?: boolean; view?: "today" | "more"; scoped?: boolean }) {
  const { snapshot, connection, refresh } = useActionCenter(weekStart, actorId, true);
  const { snapshot: today, refresh: refreshToday } = useToday();
  return <ThingsToDoPage snapshot={snapshot} today={today} connection={connection} onRefresh={() => { refresh(); refreshToday(); }} timeZone={timeZone} coverageFirst={coverageFirst} view={view} scoped={scoped} />;
}

const rowOf = (row: Row) => <li key={row.key}>
  <CorpRow href={row.href} label={row.label} title={row.swapWith ? <BSwapNames a={row.title} b={row.swapWith} /> : row.title} bold detail={row.lines?.length ? <>{row.detail}{row.lines.map(line => <span key={line} className="b-row__more">{line}</span>)}</> : row.detail} value={row.value} valueTone={row.valueTone} chevron />
</li>;

/** R3: one count voice. The label, then the figure in grey, no brackets ("Open shifts 3"). */
const headed = (title: string, n: number) => <>{title}<CorpCount>{n}</CorpCount></>;

/** One kind inside a card: its heading row with the count, then its rows. Nov 1 upscale: the Time off kind ends with
 * "See all time off ›", the way to every time off request. */
const kindOf = (group: Group, c: InboxCopy = EN.c) => <section key={group.id} id={`todo-${group.id}`} className="c-todo__kind" aria-labelledby={`todo-${group.id}-label`}>
  <div className="c-card__head"><h2 className="c-card__label" id={`todo-${group.id}-label`}>{headed(group.title, groupCount(group))}</h2></div>
  <CorpRows label={group.title}>{group.rows.map(rowOf)}
    {group.id === "time-off" ? <li className="c-todo__seeall"><CorpRow href="/app/requests" label={c.seeAllTimeOffLabel} title={c.seeAllTimeOff} one chevron /></li> : null}
  </CorpRows>
</section>;

/** Nov 1 upscale: "More" is its own card under its own label, after the cards: Shift requests and Done and older (what
 * Things to do lists but doesn't count), as plain rows; Time off requests too while no Time off card ends with its link. */
const moreCard = (timeOffShown: boolean, scoped: boolean, c: InboxCopy = EN.c) => <section key="more" id="todo-more" className="c-section c-todo__more" aria-labelledby="todo-more-label">
  <h2 className="c-section__label" id="todo-more-label">{c.more}</h2>
  <div className="c-card">
    <CorpRows label={c.more}>
      {timeOffShown ? null : <li><CorpRow href="/app/requests" label={c.allTimeOffLabel} title={c.timeOffRequests} one chevron /></li>}
      {!scoped && <li><CorpRow href="/app/exchange" label={c.allShiftRequestsLabel} title={c.shiftRequests} one chevron /></li>}
      <li><CorpRow href="/app/inbox?view=more" label={c.laterLabel} title={c.later} one chevron /></li>
    </CorpRows>
  </div>
</section>;

/** Presentation only: the released action center observation and today's shifts. */
export function ThingsToDoPage({ snapshot, today = null, connection, onRefresh, timeZone, coverageFirst = false, view = "today", scoped = false }: {
  snapshot: ActionCenter | null; today?: Today | null; connection: ActionCenterConnection; onRefresh: () => void; timeZone: string; coverageFirst?: boolean;
  /** "more": Older items, the items Things to do doesn't count (its own page, Back to Things to do). */
  view?: "today" | "more"; scoped?: boolean;
}) {
  const lang = usePortalLang(), { c, t } = wordsFor(lang);
  const ready = connection === "ready" && snapshot?.state === "ready" ? snapshot : null;
  const grouped = ready ? groupThingsToDo(ready, today, timeZone, coverageFirst, scoped, lang) : null;
  const value = grouped?.value ?? null, more = grouped?.more ?? [], families = grouped?.families ?? [], waiting = grouped?.waiting ?? [], closed = grouped?.closed ?? [];
  const exact = grouped?.total.exact ?? true;
  const moreView = view === "more";
  // Closing F1 (NV-002): the Later and done row names what it holds.
  const moreCount = (id: string) => { const group = more.find(item => item.id === id); return group ? groupCount(group) : 0; };
  const laterCounts = { plan: moreCount("plan"), earlier: moreCount("earlier") };
  const shown = moreView ? more.length : families.length + waiting.length + closed.length;
  const todayFailed = today?.state === "unavailable";
  const summary = value ? `${toDoSentence(value.count, exact, lang)}${todayFailed ? ` ${c.clockInsFailed}` : ""}${grouped?.total.uncheckedReviews ? ` ${t.correctionsUnchecked(grouped.total.uncheckedReviews)}` : ""}` : c.status[connection];
  let body: ReactNode;
  if (!ready && (connection === "unavailable" || connection === "ready")) {
    // P3: the kit's one error card.
    body = <CorpCard as="div" ariaLabel={c.title}><div className="c-error-card"><p className="c-error-card__title">{c.failedTitle}</p>
      <p className="c-error-card__body">{c.failedLine}</p>
      <CorpButton kind="neutral" className="c-error-card__action c-todo__retry" onClick={() => { onRefresh(); focusAfterRetry("#todo-title", ".c-todo__retry"); }}>{c.tryAgain}</CorpButton>
    </div></CorpCard>;
  } else if (!ready) {
    body = <CorpCard as="div" ariaLabel={c.title}><CorpBody>
      <p className="c-todo__state" aria-busy={connection === "loading" || connection === "reconnecting" || undefined}>{c.status[connection]}</p>
      {connection === "access_lost" ? <CorpButtonLink href="/login" kind="secondary" size="md" native>{c.signIn}</CorpButtonLink> : null}
    </CorpBody></CorpCard>;
  } else if (!shown) {
    // A10: the kit's empty card, never one bare line.
    body = <CorpCard as="div" ariaLabel={c.title}><div className="c-empty c-empty--card">{moreView
      ? <><b className="c-empty__title">{c.nothingLater}</b><span className="c-empty__body">{c.nothingLaterLine}</span></>
      : exact ? <><b className="c-empty__title">{c.allSet}</b><span className="c-empty__body">{c.nothingLine}</span></>
      : <><b className="c-empty__title">{t.nothingListed}</b><span className="c-empty__body">{t.nothingListedLine}</span></>}</div></CorpCard>;
  } else if (moreView) {
    body = more.map(group => <CorpCard key={group.id} id={`todo-${group.id}`} label={headed(group.title, groupCount(group))}>
      <CorpRows label={group.title}>{group.rows.map(rowOf)}</CorpRows>
    </CorpCard>);
  } else {
    // At most three cards of things to do (see groupThingsToDo), then the More card.
    const timeOffShown = families.some(family => family.groups.some(group => group.id === "time-off"));
    body = <>{families.map(family => <div key={family.id} id={`todo-${family.id}`} className="c-card c-todo__card" role="group" aria-label={family.title}>
      {family.groups.map(group => kindOf(group, c))}
    </div>)}{waiting.length + closed.length ? <section className="c-section" aria-labelledby="todo-waiting-label"><h2 className="c-section__label" id="todo-waiting-label">{c.waiting}</h2>
      <div id="todo-card-waiting" className="c-card c-todo__card" role="group" aria-label={c.waiting}>{[...waiting, ...closed].map(group => kindOf(group, c))}</div></section> : null}{moreCard(timeOffShown, scoped, c)}</>;
  }
  // The request lists stay one tap away while the page loads, fails or has nothing waiting.
  if (!moreView && (!ready || !shown)) body = <>{body}{moreCard(false, scoped, c)}</>;
  const title = moreView ? c.later : c.title;
  // A7: a single-column page, capped at the kit's narrow width on desktop.
  return <CorpPage className="c-todo c-page--narrow" labelledBy="todo-title">
    <div data-todo-state={ready ? (shown ? "ready" : "clear") : connection} hidden />
    {/* Direction B: the phone screen (phones under data-nv-b); tablets and desktop keep the cards below. */}
    {moreView ? <LaterB ready={!!ready} groups={more} statusLine={summary} onRefresh={onRefresh} connection={connection} /> : <InboxB ready={ready} families={families} waiting={waiting} closed={closed} later={ready ? laterCounts : undefined} total={value ? value.count : null} exact={exact} uncheckedReviews={grouped?.total.uncheckedReviews ?? 0} connection={connection} statusLine={summary} todayFailed={!!ready && todayFailed} onRefresh={onRefresh} back scoped={scoped} />}
    {/* Phone: "‹ Home" over the page; when Things to do is a tab of its own the shell hides it and the large title shows. */}
    <CorpNav back={moreView ? { href: "/app/inbox", label: c.title } : { href: "/app", label: c.home }} title={title} phoneOnly />
    <CorpTitle id="todo-title" title={title} sub={moreView ? undefined : <span role="status" className="c-sr">{summary}</span>} wide />
    {ready && todayFailed ? <CorpCard as="div" ariaLabel={c.clockIns}><CorpBody>
      <p className="c-todo__state">{c.clockInsFailed}</p>
      <CorpButton kind="secondary" size="md" onClick={onRefresh}>{c.tryAgain}</CorpButton>
    </CorpBody></CorpCard> : null}
    {body}
    {/* Review B5 (NV-243): the note offers where to look instead. */}
    {ready?.limitedAttendance ? <CorpNote>{c.limited} <Link className="c-link" href="/app?view=attendance">{c.whoIsWorking}</Link></CorpNote> : null}
  </CorpPage>;
}
