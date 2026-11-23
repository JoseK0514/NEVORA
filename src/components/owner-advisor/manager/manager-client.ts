/* Rondo AI for a Manager: the screen's side of Codex's contract (docs/handoffs/2026-11-18-rondo-manager-ui-contract.md).
 * One read-only endpoint, GET /api/manager/advisor, with three views: the Manager's locations and questions, one week's
 * summary for one location, and one guided answer. Every read is private and short-lived: the caller keeps it on screen
 * only for its `validForMs`, counted from the moment it arrived. */
import {
  MANAGER_ADVISOR_HEADER, MANAGER_ADVISOR_QUESTIONS,
  type ManagerAdvisorDay, type ManagerAdvisorLocation, type ManagerAdvisorQuestion, type ManagerAdvisorResponse,
} from "@/lib/owner-advisor/manager-contracts";

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

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
/** "8 h", "7 h 30 min", "45 min": planned time from the schedule, never rounded to look like a whole number. */
export function minutesText(minutes: number) {
  const h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
  if (!minutes) return "0 h";
  if (!h) return `${m} min`;
  return m ? `${h.toLocaleString("en-US")} h ${m} min` : `${h.toLocaleString("en-US")} h`;
}

export const QUESTION_TEXT: Record<ManagerAdvisorQuestion, string> = {
  published_shifts: "How many shifts are published?",
  draft_shifts: "How many shifts are drafts?",
  scheduled_minutes: "How many hours are scheduled?",
  released_shifts: "How many shifts were released?",
};
/** The order the questions are offered in: what is out first, then what is still being built, the hours, the exceptions. */
export const QUESTION_ORDER: ManagerAdvisorQuestion[] = ["published_shifts", "draft_shifts", "scheduled_minutes", "released_shifts"];

/** The answer's figure (said large) and the sentence under it. */
export function answerText(answer: Pick<ManagerRondoAnswer, "question" | "value">): { figure: string; line: string } {
  const n = answer.value;
  switch (answer.question) {
    case "published_shifts": return { figure: plural(n, "shift", "shifts"), line: n ? "The team can see these shifts." : "Nothing is published for this week." };
    case "draft_shifts": return { figure: plural(n, "draft", "drafts"), line: n ? "The team sees them once you publish." : "No drafts for this week." };
    case "scheduled_minutes": return { figure: minutesText(n), line: "Planned time from the schedule. Timecards show hours worked." };
    case "released_shifts": return { figure: plural(n, "shift", "shifts"), line: n ? "Each one followed an approved “Can’t work” request. They aren’t in the draft or published counts." : "No shifts released this week." };
  }
}

/** One day's facts for the week list: published, drafts, released; zero facts are left out. */
export function dayFacts(day: ManagerAdvisorDay): string[] {
  const facts = [
    day.publishedShifts ? plural(day.publishedShifts, "shift", "shifts") : "",
    day.draftShifts ? plural(day.draftShifts, "draft", "drafts") : "",
    day.releasedShifts ? `${day.releasedShifts.toLocaleString("en-US")} released` : "",
  ].filter(Boolean);
  return facts.length ? facts : ["No shifts"];
}
