/* Rondo AI for a Manager: the screen's side of Codex's contract (docs/handoffs/2026-11-18-rondo-manager-ui-contract.md).
 * One read-only endpoint, GET /api/manager/advisor, with three views: the Manager's locations and questions, one week's
 * summary for one location, and one guided answer. Every read is private and short-lived: the caller keeps it on screen
 * only for its `validForMs`, counted from the moment it arrived. */
import {
  MANAGER_ADVISOR_HEADER, MANAGER_ADVISOR_QUESTIONS,
  type ManagerAdvisorDay, type ManagerAdvisorLocation, type ManagerAdvisorQuestion, type ManagerAdvisorResponse,
} from "@/lib/owner-advisor/manager-contracts";
import type { Lang } from "../format";
import { MANAGER_COPY } from "./manager-copy";

export const MANAGER_RONDO_PATH = "/api/manager/advisor";

export type ManagerRondoContext = { locations: ManagerAdvisorLocation[]; questions: ManagerAdvisorQuestion[]; observedAt: string; validForMs: number };
export type ManagerRondoWeek = { weekStart: string; location: ManagerAdvisorLocation; days: ManagerAdvisorDay[]; observedAt: string; validForMs: number };
export type ManagerRondoAnswer = { weekStart: string; location: ManagerAdvisorLocation; question: ManagerAdvisorQuestion; value: number; observedAt: string; validForMs: number };

/** What a read came back as. `session`: signed out (401). `forbidden`: no current Manager access to this (403).
 * `disabled`: Rondo is off for Managers (404). `invalid`: the week, location or question was not accepted (400).
 * `unavailable`: the server could not read it, or the network failed (503 and anything else). */
export type ManagerRondoRead<T> = { kind: "ok"; data: T; receivedAt: number }
  | { kind: "session" | "forbidden" | "disabled" | "invalid" | "unavailable" | "aborted" };

export type ManagerRondoQuery = { view: "context" } | { view: "weekly"; weekStart: string; locationId: string }
  | { view: "answer"; weekStart: string; locationId: string; question: ManagerAdvisorQuestion };

export function managerRondoUrl(query: ManagerRondoQuery) {
  if (query.view === "context") return MANAGER_RONDO_PATH;
  const params = new URLSearchParams({ view: query.view, weekStart: query.weekStart, locationId: query.locationId });
  if (query.view === "answer") params.set("question", query.question);
  return `${MANAGER_RONDO_PATH}?${params}`;
}

const isQuestion = (value: unknown): value is ManagerAdvisorQuestion => typeof value === "string" && (MANAGER_ADVISOR_QUESTIONS as readonly string[]).includes(value);
const isCount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const isLocation = (value: unknown): value is ManagerAdvisorLocation => !!value && typeof value === "object"
  && typeof (value as ManagerAdvisorLocation).id === "string" && typeof (value as ManagerAdvisorLocation).name === "string";
const isDay = (value: unknown): value is ManagerAdvisorDay => !!value && typeof value === "object" && typeof (value as ManagerAdvisorDay).date === "string"
  && isCount((value as ManagerAdvisorDay).draftShifts) && isCount((value as ManagerAdvisorDay).publishedShifts)
  && isCount((value as ManagerAdvisorDay).releasedShifts) && isCount((value as ManagerAdvisorDay).scheduledMinutes);

/** Checks the body against the view that was asked for; anything else is treated as the server being unable to answer. */
export function parseManagerRondo(query: ManagerRondoQuery, body: unknown): ManagerRondoContext | ManagerRondoWeek | ManagerRondoAnswer | null {
  const value = body as ManagerAdvisorResponse | null;
  if (!value || typeof value !== "object" || value.state !== "ready" || value.view !== query.view) return null;
  if (typeof value.observedAt !== "string" || !isCount(value.validForMs)) return null;
  const lease = { observedAt: value.observedAt, validForMs: value.validForMs };
  if (value.view === "context") {
    if (!Array.isArray(value.locations) || !value.locations.every(isLocation) || !Array.isArray(value.questions)) return null;
    return { locations: value.locations, questions: value.questions.filter(isQuestion), ...lease };
  }
  if (query.view === "context" || value.weekStart !== query.weekStart || !isLocation(value.location) || value.location.id !== query.locationId) return null;
  if (value.view === "weekly") {
    if (!Array.isArray(value.days) || value.days.length !== 7 || !value.days.every(isDay)) return null;
    return { weekStart: value.weekStart, location: value.location, days: value.days, ...lease };
  }
  if (query.view !== "answer" || value.question !== query.question || !isCount(value.value)) return null;
  return { weekStart: value.weekStart, location: value.location, question: value.question, value: value.value, ...lease };
}

export type ManagerRondoFetch = (input: string, init: RequestInit) => Promise<Response>;

export async function readManagerRondo<T extends ManagerRondoContext | ManagerRondoWeek | ManagerRondoAnswer>(query: ManagerRondoQuery,
  signal?: AbortSignal, fetcher: ManagerRondoFetch = (input, init) => fetch(input, init), now: () => number = Date.now): Promise<ManagerRondoRead<T>> {
  let response: Response;
  try {
    response = await fetcher(managerRondoUrl(query), { method: "GET", credentials: "same-origin", cache: "no-store", signal,
      headers: { [MANAGER_ADVISOR_HEADER]: "1", accept: "application/json" } });
  } catch {
    return signal?.aborted ? { kind: "aborted" } : { kind: "unavailable" };
  }
  if (signal?.aborted) return { kind: "aborted" };
  if (response.status === 401) return { kind: "session" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404) return { kind: "disabled" };
  if (response.status === 400) return { kind: "invalid" };
  if (!response.ok) return { kind: "unavailable" };
  let body: unknown;
  try { body = await response.json(); } catch { return signal?.aborted ? { kind: "aborted" } : { kind: "unavailable" }; }
  if (signal?.aborted) return { kind: "aborted" };
  const data = parseManagerRondo(query, body);
  return data ? { kind: "ok", data: data as T, receivedAt: now() } : { kind: "unavailable" };
}

/* ---------- Words ---------- */

const LOCALE: Record<Lang, string> = { en: "en-US", es: "es-PR" };
const count = (n: number, lang: Lang) => n.toLocaleString(LOCALE[lang]);
/** "8 h", "7 h 30 min", "45 min": planned time from the schedule, never rounded to look like a whole number. */
export function minutesText(minutes: number, lang: Lang = "en") {
  const h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
  if (!minutes) return "0 h";
  if (!h) return `${m} min`;
  return m ? `${count(h, lang)} h ${m} min` : `${count(h, lang)} h`;
}

/** The four guided questions, in the person's language (`QUESTION_TEXT` is the English). */
export const questionText = (lang: Lang = "en") => MANAGER_COPY[lang].questions;
export const QUESTION_TEXT: Record<ManagerAdvisorQuestion, string> = MANAGER_COPY.en.questions;
/** The order the questions are offered in: what is out first, then what is still being built, the hours, the exceptions. */
export const QUESTION_ORDER: ManagerAdvisorQuestion[] = ["published_shifts", "draft_shifts", "scheduled_minutes", "released_shifts"];

/** The answer's figure (said large) and the sentence under it. */
export function answerText(answer: Pick<ManagerRondoAnswer, "question" | "value">, lang: Lang = "en"): { figure: string; line: string } {
  const n = answer.value, t = MANAGER_COPY[lang];
  switch (answer.question) {
    case "published_shifts": return { figure: t.shifts(count(n, lang), n === 1), line: n ? t.publishedLine : t.publishedNone };
    case "draft_shifts": return { figure: t.drafts(count(n, lang), n === 1), line: n ? t.draftLine : t.draftNone };
    case "scheduled_minutes": return { figure: minutesText(n, lang), line: t.minutesLine };
    case "released_shifts": return { figure: t.shifts(count(n, lang), n === 1), line: n ? t.releasedLine : t.releasedNone };
  }
}

/** One day's facts for the week list: published, drafts, released; zero facts are left out. */
export function dayFacts(day: ManagerAdvisorDay, lang: Lang = "en"): string[] {
  const t = MANAGER_COPY[lang];
  const facts = [
    day.publishedShifts ? t.shifts(count(day.publishedShifts, lang), day.publishedShifts === 1) : "",
    day.draftShifts ? t.drafts(count(day.draftShifts, lang), day.draftShifts === 1) : "",
    day.releasedShifts ? t.released(count(day.releasedShifts, lang), day.releasedShifts === 1) : "",
  ].filter(Boolean);
  return facts.length ? facts : [t.noShifts];
}
