// Scheduling restrictions (U02): each state of the screen, for both sides, in English and in Spanish. The documents are
// made with the server's own rules (fictional people and weeks), so the screen is checked against real shapes.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from '@rstest/core';

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }), usePathname: () => "/app" }));

import { applyRestrictionCommand, emptyRestrictionDocument, type RestrictionDocument } from "@/lib/scheduling/restrictions";
import type { RestrictionsCommand, RestrictionsSnapshot } from "@/lib/scheduling/restrictions-client";
import { openPlan, planFromUnavailable, type WeekPlan } from "@/lib/scheduling/restrictions-week";
import { RestrictionsScreen, type RestrictionsScreenProps } from "./restrictions-screen";
import { clockText, dayText, instantText, restrictionsCopy, spanText, type RestrictionsCopy } from "./copy";

const OP = (n: number) => `${String(n).padStart(8, "0")}-3333-4333-8333-333333333333`;
const NOW = new Date("2030-10-16T16:00:00Z"); // Wednesday in the week of Monday, October 14, 2030 (workplace time).
const owner = { actorId: "OWNER-1", actorRole: "OWNER" as const, now: "2030-09-24T14:00:00.000Z", earliestWeek: "2030-09-30" };
const employee = { actorId: "EMP-1", actorRole: "EMPLOYEE" as const, now: "2030-10-12T14:00:00.000Z", earliestWeek: "2030-10-21" };
const weekdays = [1, 2, 3, 4, 5].flatMap(dayOfWeek => [{ dayOfWeek, startTime: "00:00", endTime: "08:00" }, { dayOfWeek, startTime: "16:00", endTime: "24:00" }]);
const weekend = [{ dayOfWeek: 0, startTime: "00:00", endTime: "24:00" }, { dayOfWeek: 6, startTime: "00:00", endTime: "24:00" }];
const overnight = [{ dayOfWeek: 1, startTime: "00:00", endTime: "22:00" }, { dayOfWeek: 2, startTime: "06:00", endTime: "24:00" }, ...weekend];

function build(steps: ((document: RestrictionDocument) => RestrictionDocument)[]): RestrictionDocument { return steps.reduce((document, step) => step(document), emptyRestrictionDocument()); }
const set = (operation: number, effectiveWeek: string, unavailable: typeof weekdays, reason = "Agreed with the employee") => (document: RestrictionDocument) =>
  applyRestrictionCommand(document, { kind: "SET", operationId: OP(operation), expectedRevision: document.revision, reason, effectiveWeek, unavailable }, { ...owner, earliestWeek: effectiveWeek }).document;
const ask = (operation: number, effectiveWeek: string, unavailable: typeof weekdays, reason = "Class on Tuesdays this term") => (document: RestrictionDocument) =>
  applyRestrictionCommand(document, { kind: "REQUEST", operationId: OP(operation), expectedRevision: document.revision, reason, effectiveWeek, unavailable }, employee).document;
const decide = (operation: number, requestId: number, decision: "APPROVE" | "DENY", effectiveWeek?: string, reason = decision === "APPROVE" ? "Approved" : "We need you on Sundays through December") => (document: RestrictionDocument) =>
  applyRestrictionCommand(document, { kind: "DECIDE", operationId: OP(operation), expectedRevision: document.revision, reason, requestId: OP(requestId), decision, ...(effectiveWeek ? { effectiveWeek } : {}) } as never,
    { ...owner, now: "2030-10-13T15:00:00.000Z", earliestWeek: effectiveWeek ?? "2030-10-21" }).document;

const snapshot = (document: RestrictionDocument, earliestWeek = "2030-10-21"): RestrictionsSnapshot => ({ document, legacyUnconfirmed: document.versions.length === 0, earliestWeek });
const LEGACY = snapshot(emptyRestrictionDocument());
const IN_EFFECT = snapshot(build([set(1, "2030-09-30", [...weekdays, ...weekend])]), "2030-10-21");
const OPEN = snapshot(build([set(1, "2030-09-30", [])]));
const FUTURE_ONLY = snapshot(build([set(1, "2030-10-21", overnight)]), "2030-10-28");
const WAITING = snapshot(build([set(1, "2030-09-30", [...weekdays, ...weekend]), ask(2, "2030-10-21", [...weekdays, ...weekend, { dayOfWeek: 2, startTime: "00:00", endTime: "24:00" }])]));
const DECIDED = snapshot(build([set(1, "2030-09-30", [...weekdays, ...weekend]), ask(2, "2030-10-21", overnight), ask(3, "2030-10-21", weekend, "Sundays for church"), decide(4, 2, "APPROVE", "2030-10-21"), decide(5, 3, "DENY")]), "2030-10-28");

const base = { employeeId: "EMP-1", actorId: "OWNER-1", view: "view-value", timeZone: "America/Puerto_Rico", name: "Maria Rivera", firstName: "Maria", now: NOW };
const management: RestrictionsScreenProps = { ...base, scope: "management", backHref: "/app/employees/EMP-1", availabilityHref: "/app/availability?employeeId=EMP-1" };
const own: RestrictionsScreenProps = { ...base, scope: "employee", actorId: "EMP-1", backHref: "/app/availability" };
const html = (props: RestrictionsScreenProps) => renderToStaticMarkup(<RestrictionsScreen {...props} />);
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const ready = (value: RestrictionsSnapshot) => ({ state: "ready" as const, snapshot: value });
const plan: WeekPlan = { ...planFromUnavailable(IN_EFFECT.document.versions[0].unavailable), 6: { mode: "ranges", ranges: [{ start: "22:00", end: "06:00" }] } };
const command: RestrictionsCommand = { kind: "SET", operationId: OP(9), expectedRevision: 1, reason: "Agreed with the employee", effectiveWeek: "2030-10-21", unavailable: [] };
const en = restrictionsCopy("en"), es = restrictionsCopy("es");

describe("the words", () => {
  it("has every key in both languages, with the same kind of value", () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof RestrictionsCopy)[]) {
      expect(typeof es[key], key).toBe(typeof en[key]);
      if (typeof en[key] === "string" && key !== "locale") expect(String(es[key]).length, key).toBeGreaterThan(0);
    }
    expect(en.days).toHaveLength(7); expect(es.days).toHaveLength(7); expect(en.days[0]).toBe("Sunday"); expect(es.days[0]).toBe("Domingo");
  });
  it("follows the copy rules: no exclamation marks, no em dashes, no system words", () => {
    const tries: unknown[][] = [["Maria", "Mon, Oct 21", ["Monday", "Tuesday"]], [["Monday", "Tuesday"]], [2], ["Monday", 2]];
    const call = (fn: (...args: unknown[]) => string) => { for (const args of tries) { try { const out = fn(...args); if (typeof out === "string" && !/undefined|NaN|\[object/.test(out)) return out; } catch { /* next shape */ } } throw Error(`no sample for ${fn}`); };
    const sample = (t: RestrictionsCopy) => Object.values(t).map(value => typeof value === "function" ? call(value as (...args: unknown[]) => string) : Array.isArray(value) ? value.join(" ") : String(value)).join(" | ");
    for (const all of [sample(en), sample(es)]) {
      expect(all).not.toMatch(/[!—]/);
      expect(all).not.toMatch(/payload|operation id|entity|resource|legacy|revision|undefined|NaN|\[object/i);
      expect(all).not.toMatch(/\b(PENDING|APPROVED|DENIED|SET|REQUEST|DECIDE|APPROVE|DENY)\b/);
      expect(all).not.toMatch(/\b(simply|just|seamlessly|successfully|oops)\b/i);
    }
  });
  it("writes clock times and dates the same way everywhere", () => {
    expect(clockText(480, en)).toBe("8:00 AM"); expect(clockText(1350, en)).toBe("10:30 PM"); expect(clockText(0, en)).toBe("12:00 AM"); expect(clockText(1440, en)).toBe("12:00 AM");
    expect(spanText({ start: 1320, end: 1440 }, en)).toBe("10:00 PM – 12:00 AM");
    expect(clockText(480, es)).toBe("8:00 a.\u00a0m.");
    expect(spanText({ start: 1320, end: 1440 }, es)).toBe("10:00 p.\u00a0m. – 12:00 a.\u00a0m.");
    expect(spanText({ start: 0, end: 360 }, es)).toBe("12:00 a.\u00a0m. – 6:00 a.\u00a0m.");
    expect(dayText("2030-10-21", en)).toBe("Mon, Oct 21");
    expect(dayText("2030-10-21", es)).toMatch(/lun, 21 (de )?oct/);
    // 03:30 UTC on the 14th is still the 13th at the workplace.
    expect(instantText("2030-10-14T03:30:00.000Z", "America/Puerto_Rico", en)).toBe("Oct 13");
  });
});

describe("management side (Owner, Manager)", () => {
  it("loading keeps the page's frame and says Loading once", () => {
    const markup = html(management);
    expect(markup).toContain('class="c-page c-page--narrow rs rs--c"');
    expect(markup).toContain("<h1 id=\"rs-title\" tabindex=\"-1\">When they can be scheduled</h1>");
    expect(markup).toContain('class="rs-skel" role="status" aria-busy="true"');
    expect(text(markup)).toContain("Maria Rivera");
    expect(markup).not.toContain("b-spin");
  });
  it("an older record that was never confirmed is marked, with the two honest choices and no default", () => {
    const markup = html({ ...management, initial: { load: ready(LEGACY) } }), words = text(markup);
    expect(words).toContain("Not confirmed yet");
    // Phase 8 (a.md #23): the heading says the state once; no chip repeats it.
    expect(markup).not.toContain('<span class="b-chip b-chip--amber">Not confirmed</span>');
    expect(words).toContain("No agreement is recorded for Maria. The schedule still follows the hours they entered in Availability. Nothing is confirmed until you choose one of these.");
    expect(markup).toContain('href="/app/availability?employeeId=EMP-1"');
    expect(markup).toMatch(/<button[^>]*class="b-btn b-btn--quiet rs-act"[^>]*>No restrictions<\/button>/);
    expect(markup).toMatch(/<button[^>]*id="rs-main-action"[^>]*class="b-btn b-btn--teal rs-act"[^>]*>Set the agreed times<\/button>/);
    // Nothing is shown as agreed, and exactly one filled teal button is on the screen.
    expect(words).not.toContain("In effect");
    expect(markup.split("b-btn--teal").length - 1).toBe(1);
    // Phase 2 gate (Nov 23): the note above already names Availability, so the separate note is left out here.
    expect(words).not.toContain("Weekly availability is separate.");
  });
  it("the agreement in effect is a week, Monday first, with the Monday it started", () => {
    const markup = html({ ...management, initial: { load: ready(IN_EFFECT) } }), words = text(markup);
    expect(words).toContain("In effect now");
    expect(words).toContain("In effect since Mon, Sep 30");
    const days = [...markup.matchAll(/class="rs-week__n">([^<]+)</g)].map(match => match[1]);
    expect(days).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
    expect(words).toContain("8:00 AM – 4:00 PM");
    expect(words).toContain("Not this day");
    expect(markup).toContain('aria-label="Times Maria can be scheduled, by day"');
    expect(words).toContain("Times are the workplace’s local time (Puerto Rico time).");
    expect(markup).toMatch(/id="rs-main-action"[^>]*>Change the agreement</);
    // A stock reason is not shown as someone's note.
    expect(words).not.toContain("Note: Agreed with the employee");
  });
  it("explicit unrestricted is said in words, and is not the unconfirmed state", () => {
    const words = text(html({ ...management, initial: { load: ready(OPEN) } }));
    expect(words).toContain("No restrictions. Maria can be scheduled any day, at any time.");
    expect(words).not.toContain("Not confirmed");
  });
  it("a future version does not show as in effect; overnight is drawn on both days", () => {
    const markup = html({ ...management, initial: { load: ready(FUTURE_ONLY) } }), words = text(markup);
    expect(words).toContain("Nothing is in effect yet");
    expect(words).toContain("The first agreement starts Mon, Oct 21.");
    expect(words).toContain("Starts later");
    expect(words).toContain("Starts Mon, Oct 21");
    expect(words).toContain("10:00 PM – 12:00 AM continues into Tuesday");
    expect(words).toContain("12:00 AM – 6:00 AM from Monday night");
    expect(words).not.toContain("In effect since");
  });
  it("a waiting request shows what it changes against the agreement, with Approve tinted and Decline quiet", () => {
    const markup = html({ ...management, initial: { load: ready(WAITING) } }), words = text(markup);
    expect(words).toContain("Change requests");
    expect(words).toContain("Asked Oct 12");
    expect(words).toContain("For the week of Mon, Oct 21 · 1 day changes");
    expect(words).toContain("Note: Class on Tuesdays this term");
    expect(markup).toContain('<span class="b-chip b-chip--amber">Waiting</span>');
    expect(markup.split('<span class="b-chip b-chip--teal">Changed</span>').length - 1).toBe(1);
    // Only the day that changes is listed, against what it is now.
    expect(words).toContain("Tuesday Changed Not this day Now: 8:00 AM – 4:00 PM");
    expect(words).toContain("The other days stay as they are.");
    expect(markup).toMatch(/<button[^>]*class="b-btn b-btn--ghost rs-act"[^>]*aria-label="Approve the request Maria sent Oct 12"[^>]*>Approve<\/button>/);
    expect(markup).toMatch(/<button[^>]*class="b-btn b-btn--quiet b-rowact b-rowact--quiet"[^>]*aria-label="Decline the request Maria sent Oct 12"[^>]*>Decline<\/button>/);
  });
  it("approving asks for the Monday it starts, offering only admissible ones, and says why", () => {
    const markup = html({ ...management, initial: { load: ready(snapshot(WAITING.document, "2030-10-28")), deciding: { requestId: OP(2), decision: "APPROVE", week: "2030-10-28", note: "" } } }), words = text(markup);
    expect(words).toContain("Approve this request");
    const options = [...markup.matchAll(/<option value="(\d{4}-\d\d-\d\d)"/g)].map(match => match[1]);
    expect(options[0]).toBe("2030-10-28");
    expect(options.every(option => option >= "2030-10-28" && new Date(`${option}T12:00:00Z`).getUTCDay() === 1)).toBe(true);
    expect(words).toContain("They asked for the week of Mon, Oct 21. That week is closed, so the earliest start is Mon, Oct 28.");
    expect(words).toContain("Approve from Mon, Oct 28");
    // While a decision is open, the page's own action steps down from filled teal.
    expect(markup).not.toContain("b-btn--teal");
  });
  it("declining needs no week", () => {
    const markup = html({ ...management, initial: { load: ready(WAITING), deciding: { requestId: OP(2), decision: "DENY", week: "2030-10-21", note: "" } } });
    expect(text(markup)).toContain("Decline this request");
    expect(markup).not.toContain("<option");
    expect(text(markup)).toContain("Decline request");
  });
  it("decided requests keep their outcome, the date and the manager's note", () => {
    const words = text(html({ ...management, initial: { load: ready(DECIDED) } }));
    expect(words).toContain("Earlier requests");
    expect(words).toContain("Approved Oct 13, starts Mon, Oct 21");
    expect(words).toContain("Declined Oct 13");
    expect(words).toContain("Note: We need you on Sundays through December");
    expect(words).toContain("Starts later");
  });
  it("the editor: a block per day with All day, Set times and Not this day, ranges with labels, and the Monday picker with its reason", () => {
    const markup = html({ ...management, initial: { load: ready(IN_EFFECT), step: "edit", draft: { kind: "SET", plan, week: "2030-10-21", note: "" } } }), words = text(markup);
    expect(markup).toContain(">Change the agreement</h1>");
    expect(words).toContain("Times Maria can work");
    expect(markup.split('class="rs-ed__d" role="group"').length - 1).toBe(7);
    expect(markup).toContain('aria-label="Monday: when"');
    expect(markup).toMatch(/<button type="button" aria-pressed="true">Set times<\/button>/);
    expect(markup).toContain('aria-label="Monday, range 1, from"');
    expect(markup).toContain('type="time" step="300" aria-label="Monday, range 1, from" value="08:00"');
    expect(markup).toContain('aria-label="Remove range 1 on Monday"');
    expect(markup).toContain('aria-label="Add a time range on Monday"');
    // English flag B11 (Nov 26, 2026): named by its visible words plus the day, as in Spanish (no label/name mismatch).
    expect(markup).toMatch(/id="([^"]+)-copy-1"[^>]*aria-labelledby="\1-copy-1 \1-n-1"/);
    // Saturday 10 PM to 6 AM says where it ends, and Sunday says what Saturday brings into it.
    expect(words).toContain("Ends Sunday at 6:00 AM");
    expect(words).toContain("Also Saturday night until 6:00 AM");
    const options = [...markup.matchAll(/<option value="(\d{4}-\d\d-\d\d)"/g)].map(match => match[1]);
    expect(options).toHaveLength(12);
    expect(options[0]).toBe("2030-10-21");
    expect(words).toContain("The earliest start is Mon, Oct 21. Earlier weeks are already published or closed, or come before the latest agreement. An agreement always starts on a Monday.");
    expect(markup).toMatch(/class="b-btn b-btn--teal rs-act"[^>]*>Review</);
  });
  it("a draft week from before the current bound is never offered or sent: the picker starts at the bound", () => {
    const markup = html({ ...management, initial: { load: ready(snapshot(IN_EFFECT.document, "2030-11-04")), step: "review", draft: { kind: "SET", plan, week: "2030-10-21", note: "" } } });
    expect(text(markup)).toContain("Starts Mon, Nov 4");
    expect(text(markup)).not.toContain("Oct 21");
  });
  it("the review step says in a sentence what changes and from when", () => {
    const markup = html({ ...management, initial: { load: ready(IN_EFFECT), step: "review", draft: { kind: "SET", plan, week: "2030-10-21", note: " Agreed after the\nholiday rota " } } }), words = text(markup);
    expect(markup).toContain(">Review the change</h1>");
    expect(words).toContain("From Mon, Oct 21, Maria can be scheduled at these times. 2 days change: Saturday and Sunday.");
    expect(words).toContain("Until then, nothing changes.");
    expect(markup.split('<span class="b-chip b-chip--teal">Changed</span>').length - 1).toBe(2);
    expect(words).toContain("Note: Agreed after the holiday rota");
    expect(markup).toMatch(/class="b-btn b-btn--teal rs-act"[^>]*>Save agreement</);
    expect(words).toContain("Back to edit");
  });
  it("review says a first agreement, and explicit no restrictions, in their own words", () => {
    expect(text(html({ ...management, initial: { load: ready(LEGACY), step: "review", draft: { kind: "SET", plan, week: "2030-10-21", note: "" } } }))).toContain("From Mon, Oct 21, this becomes the first confirmed agreement for Maria.");
    expect(text(html({ ...management, initial: { load: ready(LEGACY), step: "review", draft: { kind: "SET", plan: openPlan(), week: "2030-10-21", note: "" } } }))).toContain("From Mon, Oct 21, Maria has no restrictions and can be scheduled any day, at any time.");
  });
  it("a save in progress disables both buttons and says Saving", () => {
    const markup = html({ ...management, initial: { load: ready(IN_EFFECT), step: "review", draft: { kind: "SET", plan, week: "2030-10-21", note: "" }, custody: { command, status: "sending" } } });
    expect(markup).toMatch(/aria-busy="true" disabled="">Saving…</);
    expect(markup).toMatch(/disabled="">Back to edit</);
    expect(markup).not.toContain("rs-issue");
  });
  it("conflict: what is current is shown, and the change can be reviewed again or discarded", () => {
    const markup = html({ ...management, initial: { load: ready(IN_EFFECT), draft: { kind: "SET", plan, week: "2030-10-21", note: "" }, issue: { kind: "conflict", decision: false } } }), words = text(markup);
    expect(markup).toContain('class="rs-issue" tabindex="-1"');
    expect(markup).toContain('role="alert"');
    expect(words).toContain("Someone else changed this agreement");
    expect(words).toContain("Your change was not saved. The agreement as it is now is shown below. Review your change against it before you send it again.");
    expect(words).toContain("Review again"); expect(words).toContain("Discard my change");
    expect(words).toContain("In effect now");
    expect(markup).not.toContain("b-btn--teal");
  });
  it("closed-week race: says the Monday is gone and offers the next one", () => {
    const words = text(html({ ...management, initial: { load: ready(snapshot(IN_EFFECT.document, "2030-10-28")), draft: { kind: "SET", plan, week: "2030-10-21", note: "" }, issue: { kind: "locked", asked: "2030-10-21", next: "2030-10-28", decision: false } } }));
    expect(words).toContain("That week is no longer available");
    expect(words).toContain("The week of Mon, Oct 21 closed before this was saved. Nothing was saved. The next week you can choose is Mon, Oct 28.");
    expect(words).toContain("Use Mon, Oct 28"); expect(words).toContain("Choose another week");
    expect(text(html({ ...management, initial: { load: ready(IN_EFFECT), draft: { kind: "SET", plan, week: "2030-10-21", note: "" }, issue: { kind: "locked", asked: "2030-10-21", next: null, decision: false } } }))).toContain("Choose a later week.");
  });
  it("unknown is never failed and never done: it says the result is not confirmed and how to check", () => {
    const markup = html({ ...management, initial: { load: ready(IN_EFFECT), step: "review", draft: { kind: "SET", plan, week: "2030-10-21", note: "" }, custody: { command, status: "unknown" } } }), words = text(markup);
    expect(words).toContain("We couldn’t confirm this was saved");
    expect(words).toContain("The reply was lost, so it may or may not be saved. Check before you do anything else. Checking never saves it twice.");
    expect(markup).toMatch(/class="b-btn b-btn--teal"[^>]*>(?:<span[^>]*>)*Check now</);
    expect(markup).toContain('data-kind="paused"');
    expect(markup).not.toContain('data-kind="failed"');
    expect(words).not.toMatch(/Agreement saved|couldn’t be saved/);
    // The form's own buttons wait: nothing else can be sent while the first result is open.
    expect(markup).toMatch(/disabled="">Save agreement</);
    const checked = text(html({ ...management, initial: { load: ready(IN_EFFECT), custody: { command, status: "not_saved" } } }));
    expect(checked).toContain("It is not saved yet");
    expect(checked).toContain("You can send the same change again. It is saved only once.");
    expect(checked).toContain("Send again");
    expect(text(html({ ...management, initial: { load: ready(IN_EFFECT), custody: { command, status: "still_unknown" } } }))).toContain("Still not confirmed");
    expect(text(html({ ...management, initial: { load: ready(IN_EFFECT), custody: { command, status: "unsent" } } }))).toContain("NEVORA couldn’t take it right now. Nothing was saved.");
  });
  it("not allowed for this location says who can; an Owner's record says Owner only", () => {
    const words = text(html({ ...management, initial: { load: { state: "denied" } } }));
    expect(words).toContain("You can’t manage this agreement");
    expect(words).toContain("Maria works at locations you don’t manage. An Owner, or a Manager with access to every location they work at, can change it.");
    expect(words).toContain("Back to Maria");
    expect(text(html({ ...management, ownerRecord: true, initial: { load: { state: "denied" } } }))).toContain("Only an Owner can manage this");
  });
  it("a missing session is its own state with Sign in, not a retry", () => {
    const markup = html({ ...management, initial: { load: { state: "signed_out" } } });
    expect(text(markup)).toContain("Your session ended");
    expect(markup).toContain('href="/login"');
    expect(text(markup)).not.toContain("Try again");
  });
  it("error and offline each have one sentence and one retry", () => {
    const failed = html({ ...management, initial: { load: { state: "failed" } } });
    expect(text(failed)).toContain("The agreement didn’t load"); expect(failed.split("Try again").length - 1).toBe(1); expect(failed).toContain('data-kind="failed"');
    const offline = html({ ...management, initial: { load: { state: "offline" } } });
    expect(text(offline)).toContain("You’re offline"); expect(offline).toContain('data-kind="offline"');
    expect(text(html({ ...management, initial: { load: { state: "access" } } }))).toContain("This page is out of date");
    for (const kind of ["invalid", "capacity", "denied"] as const) expect(html({ ...management, initial: { load: ready(IN_EFFECT), issue: { kind } } })).toContain("rs-issue");
  });
});

describe("Employee and Lead side", () => {
  it("draws the Direction B screen with the way back to Availability", () => {
    const markup = html({ ...own, initial: { load: ready(IN_EFFECT) } }), words = text(markup);
    expect(markup).toContain('class="c-page c-page--narrow rs rs--b"');
    expect(markup).toContain('<div class="b-screen b-screen--back">');
    expect(markup).toContain('href="/app/availability"');
    expect(markup).toContain('<h1 id="rs-title" tabindex="-1">Agreed times</h1>');
    expect(words).toContain("When you can be scheduled");
    expect(words).toContain("In effect since Mon, Sep 30");
    expect(words).toContain("You and your manager set these times. The availability you send each week is a preference.");
    // Phase 8 (review C, row 7): the note is the agreement card's footer, not a line on the canvas.
    expect(markup).toContain('<p class="eb-cardnote rs-separate">You and your manager set these times.');expect(markup).not.toContain('class="b-note"');
    expect(markup).toMatch(/id="rs-main-action"[^>]*>Ask to change it</);
    expect(markup).toContain('aria-label="Times you can be scheduled, by day"');
  });
  it("with nothing agreed it says so and never shows the availability they send as an agreement", () => {
    const words = text(html({ ...own, initial: { load: ready(LEGACY) } }));
    expect(words).toContain("Nothing agreed yet");
    expect(words).toContain("Your manager has not confirmed an agreement with you. Your schedule still follows the availability you send.");
    expect(words).toContain("Ask for agreed times");
    expect(words).not.toContain("No restrictions");
    // Phase 8 (review C, row 7): one designed empty state: no "Not confirmed" chip (that word is for an unknown result) and
    // no note that says something was agreed.
    expect(words).not.toContain("Not confirmed");expect(words).not.toContain("set these times");
  });
  it("a request they sent shows as Waiting with what they asked, and there is no way to approve", () => {
    const markup = html({ ...own, initial: { load: ready(WAITING) } }), words = text(markup);
    expect(words).toContain("Your requests");
    expect(words).toContain("Sent Oct 12");
    expect(markup).toContain('<span class="b-chip b-chip--amber">Waiting</span>');
    expect(words).toContain("Your manager has not decided yet. Nothing changes until they approve.");
    expect(words).not.toMatch(/Approve|Decline(?!d)/);
    expect(markup).not.toContain("rs-decide");
  });
  it("approved and declined requests say which, when, and the manager's note", () => {
    const words = text(html({ ...own, initial: { load: ready(DECIDED) } }));
    expect(words).toContain("Approved Oct 13, starts Mon, Oct 21");
    expect(words).toContain("Declined Oct 13");
    expect(words).toContain("Note: We need you on Sundays through December");
  });
  it("the request form is the same editor, with a note for the manager and a start week the manager finalises", () => {
    const markup = html({ ...own, initial: { load: ready(IN_EFFECT), step: "edit", draft: { kind: "REQUEST", plan, week: "2030-10-21", note: "" } } }), words = text(markup);
    expect(markup).toContain(">Ask to change it</h1>");
    expect(words).toContain("Times you can work");
    expect(words).toContain("From the week of");
    expect(words).toContain("Your manager chooses the final start date when they approve.");
    expect(words).toContain("Note for your manager (optional)");
    expect(markup.split('class="rs-ed__d" role="group"').length - 1).toBe(7);
  });
  it("the review says it is a request and that nothing changes until it is approved", () => {
    const markup = html({ ...own, initial: { load: ready(IN_EFFECT), step: "review", draft: { kind: "REQUEST", plan, week: "2030-10-21", note: "" } } }), words = text(markup);
    expect(words).toContain("You are asking for these times from the week of Mon, Oct 21. Your manager decides. Nothing changes until they approve.");
    expect(words).toContain("2 days change: Saturday and Sunday.");
    expect(markup).toMatch(/class="b-btn b-btn--teal rs-act"[^>]*>Send request</);
    expect(words).not.toContain("Save agreement");
  });
  it("loading, error, signed out and unknown are designed for this side too", () => {
    expect(html(own)).toContain("rs-skel");
    expect(text(html({ ...own, initial: { load: { state: "failed" } } }))).toContain("The agreement didn’t load");
    expect(text(html({ ...own, initial: { load: { state: "denied" } } }))).toContain("Ask your manager about your agreement.");
    expect(text(html({ ...own, initial: { load: ready(IN_EFFECT), custody: { command: { ...command, kind: "REQUEST" }, status: "unknown" } } }))).toContain("We couldn’t confirm this was saved");
  });
});

describe("Spanish (Puerto Rico): every state renders with no English left and no missing word", () => {
  // Every English sentence and label; a Spanish render must contain none of them.
  const english = (Object.keys(en) as (keyof RestrictionsCopy)[]).filter(key => !["days", "daysShort", "am", "pm", "locale", "and", "midnight"].includes(key) && typeof en[key] === "string" && en[key] !== es[key]).map(key => String(en[key]));
  // Whole words only ("To" is not found in "Todo", "Cancel" not in "Cancelar"); the fictional notes people typed are theirs.
  const whole = (phrase: string) => new RegExp(`(?<![\\p{L}\\p{N}])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "u");
  const leaks = (markup: string) => { const words = text(markup); return [...english.filter(phrase => whole(phrase).test(words)), ...en.days.filter(day => whole(day).test(words)), ...(/\b(AM|PM)\b|undefined|NaN|\[object/.test(words) ? ["clock or missing value"] : [])]; };
  const states: [string, RestrictionsScreenProps][] = [
    ["loading", { ...management }],
    ["legacy", { ...management, initial: { load: ready(LEGACY) } }],
    ["in effect", { ...management, initial: { load: ready(IN_EFFECT) } }],
    ["unrestricted", { ...management, initial: { load: ready(OPEN) } }],
    ["future", { ...management, initial: { load: ready(FUTURE_ONLY) } }],
    ["waiting", { ...management, initial: { load: ready(WAITING) } }],
    ["approve", { ...management, initial: { load: ready(snapshot(WAITING.document, "2030-10-28")), deciding: { requestId: OP(2), decision: "APPROVE", week: "2030-10-28", note: "" } } }],
    ["decline", { ...management, initial: { load: ready(WAITING), deciding: { requestId: OP(2), decision: "DENY", week: "2030-10-21", note: "" } } }],
    ["decided", { ...management, initial: { load: ready(DECIDED) } }],
    ["edit", { ...management, initial: { load: ready(IN_EFFECT), step: "edit", draft: { kind: "SET", plan, week: "2030-10-21", note: "" } } }],
    ["review", { ...management, initial: { load: ready(IN_EFFECT), step: "review", draft: { kind: "SET", plan, week: "2030-10-21", note: "" } } }],
    ["saving", { ...management, initial: { load: ready(IN_EFFECT), step: "review", draft: { kind: "SET", plan, week: "2030-10-21", note: "" }, custody: { command, status: "sending" } } }],
    ["conflict", { ...management, initial: { load: ready(IN_EFFECT), draft: { kind: "SET", plan, week: "2030-10-21", note: "" }, issue: { kind: "conflict", decision: false } } }],
    ["locked", { ...management, initial: { load: ready(IN_EFFECT), draft: { kind: "SET", plan, week: "2030-10-21", note: "" }, issue: { kind: "locked", asked: "2030-10-21", next: "2030-10-28", decision: false } } }],
    ["unknown", { ...management, initial: { load: ready(IN_EFFECT), custody: { command, status: "unknown" } } }],
    ["not saved", { ...management, initial: { load: ready(IN_EFFECT), custody: { command, status: "not_saved" } } }],
    ["unsent", { ...management, initial: { load: ready(IN_EFFECT), custody: { command, status: "unsent" } } }],
    ["denied", { ...management, initial: { load: { state: "denied" } } }],
    ["owner record", { ...management, ownerRecord: true, initial: { load: { state: "denied" } } }],
    ["signed out", { ...management, initial: { load: { state: "signed_out" } } }],
    ["failed", { ...management, initial: { load: { state: "failed" } } }],
    ["offline", { ...management, initial: { load: { state: "offline" } } }],
    ["invalid", { ...management, initial: { load: ready(IN_EFFECT), issue: { kind: "invalid" } } }],
    ["employee legacy", { ...own, initial: { load: ready(LEGACY) } }],
    ["employee in effect", { ...own, initial: { load: ready(IN_EFFECT) } }],
    ["employee waiting", { ...own, initial: { load: ready(WAITING) } }],
    ["employee decided", { ...own, initial: { load: ready(DECIDED) } }],
    ["employee edit", { ...own, initial: { load: ready(IN_EFFECT), step: "edit", draft: { kind: "REQUEST", plan, week: "2030-10-21", note: "" } } }],
    ["employee review", { ...own, initial: { load: ready(IN_EFFECT), step: "review", draft: { kind: "REQUEST", plan, week: "2030-10-21", note: "" } } }],
    ["employee denied", { ...own, initial: { load: { state: "denied" } } }],
  ];
  it.each(states)("%s", (_name, props) => {
    const markup = html({ ...props, lang: "es" });
    expect(leaks(markup)).toEqual([]);
    expect(text(markup)).not.toMatch(/\busted(?:es)?\b/i);
    expect(text(markup).trim().length).toBeGreaterThan(20);
  });
  it("names the Spanish copy action with its visible label and weekday", () => {
    const markup = html({ ...own, lang: "es", initial: { load: ready(IN_EFFECT), step: "edit", draft: { kind: "REQUEST", plan, week: "2030-10-21", note: "" } } });
    expect(markup).toMatch(/id="([^"]+)-copy-1"[^>]*aria-labelledby="\1-copy-1 \1-n-1"/);
    expect(markup).toContain("Copiar a otros días");
  });
  it("says the main states in Spanish", () => {
    const words = text(html({ ...management, lang: "es", initial: { load: ready(IN_EFFECT) } }));
    expect(words).toContain("Vigente desde el lun, 30 sep");
    expect(words).toContain("8:00 a. m. – 4:00 p. m.");
    expect(words).toContain("Lunes"); expect(words).toContain("Este día no");
    expect(text(html({ ...own, lang: "es", initial: { load: ready(WAITING) } }))).toContain("En espera");
    expect(text(html({ ...management, lang: "es", initial: { load: ready(IN_EFFECT), custody: { command, status: "unknown" } } }))).toContain("No pudimos confirmar que esto se guardó");
  });
});
