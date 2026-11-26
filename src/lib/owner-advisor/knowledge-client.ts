/* Company knowledge for Rondo: the Owner screens' side of Codex's contract
 * (docs/handoffs/2026-11-15-rondo-company-knowledge-ui-contract.md in the backend candidate). Browser-safe: no server or
 * Node modules. The server stays the authority for every check; these mirror its limits so an Owner sees every size or
 * character problem before saving, never after a silent cut. */
import { formatWithZone } from "../time-zone-label";

export const KNOWLEDGE_ENDPOINT = "/api/owner/advisor/knowledge";
export const KNOWLEDGE_HEADER = "x-nevora-company-knowledge";
export const KNOWLEDGE_LIMITS = { profileBytes: 16384, documentBytes: 262144, titleBytes: 240, fileNameBytes: 120, documents: 20, versions: 100 } as const;

export const PROFILE_FIELDS = ["businessDescription", "productsServices", "customerCommitments", "operatingProcedures", "objectives", "escalationRoles"] as const;
export type ProfileField = typeof PROFILE_FIELDS[number];
export type ProfileFields = Partial<Record<ProfileField, string>>;
export const PROFILE_LABELS: Record<ProfileField, { label: string; help: string }> = {
  businessDescription: { label: "What the business does", help: "Rondo reads this first" },
  productsServices: { label: "Products and services", help: "What you sell" },
  customerCommitments: { label: "Promises to customers", help: "Standards you keep" },
  operatingProcedures: { label: "How you run things", help: "Daily routines" },
  objectives: { label: "Current goals", help: "What matters now" },
  escalationRoles: { label: "Who decides what", help: "Exceptions and approvals" },
};

export const CATEGORIES = [
  { value: "operations", label: "Operations" },
  { value: "products", label: "Products and services" },
  { value: "service", label: "Customer service" },
  { value: "policy", label: "Policy" },
  { value: "other", label: "Other" },
] as const;
export type Category = typeof CATEGORIES[number]["value"];
export const categoryLabel = (value: string) => CATEGORIES.find(item => item.value === value)?.label ?? (value === "profile" ? "Business profile" : "Other");
export type KnowledgeLocale = "en" | "es";
export const LOCALE_LABELS: Record<KnowledgeLocale, string> = { en: "English", es: "Spanish" };

export type KnowledgeValidity = { effectiveFrom: string | null; effectiveUntil: string | null; reviewDue: string | null };
export type KnowledgeVersionMeta = KnowledgeValidity & {
  versionId: string; title: string; locale: KnowledgeLocale; category: string; sourceName: string | null; textDigest: string;
  createdAt: string; publishedAt: string | null;
};
export type KnowledgeEntry = { documentId: string; kind: "profile" | "document"; archived: boolean; publishedVersionId: string | null; versions: KnowledgeVersionMeta[] };
export type KnowledgeSnapshot = { revision: number; entries: KnowledgeEntry[] };
export type KnowledgeVersion = KnowledgeVersionMeta & { documentId: string; kind: "profile" | "document"; body: string; profileFields: ProfileFields | null; current: boolean; archived: boolean };
export type KnowledgeReceipt = { state: "draft_saved" | "published" | "archived" | "deleted"; operationId: string; documentId: string; versionId: string | null; textDigest: string | null; revision: number; savedAt: string };

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const fail = (): never => { throw new Error("Unreadable company knowledge"); };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const uuid = (value: unknown) => typeof value === "string" && UUID.test(value) ? value : fail();
const text = (value: unknown, max = 100000) => typeof value === "string" && value.length <= max ? value : fail();
/** Postgres writes "2026-11-15 12:00:00.123+00" in text casts and an ISO form in JSON; both become one ISO instant. */
export function isoInstant(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.length > 64) return fail();
  const normalized = value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? new Date(time).toISOString() : fail();
}
const required = (value: unknown) => isoInstant(value) ?? fail();

function meta(value: unknown): KnowledgeVersionMeta {
  if (!object(value)) return fail();
  if (value.locale !== "en" && value.locale !== "es") return fail();
  if (typeof value.textDigest !== "string" || !DIGEST.test(value.textDigest)) return fail();
  return {
    versionId: uuid(value.versionId), title: text(value.title, 1000), locale: value.locale, category: text(value.category, 40),
    sourceName: value.sourceName === null || value.sourceName === undefined ? null : text(value.sourceName, 500), textDigest: value.textDigest,
    createdAt: required(value.createdAt), publishedAt: isoInstant(value.publishedAt),
    effectiveFrom: isoInstant(value.effectiveFrom), effectiveUntil: isoInstant(value.effectiveUntil), reviewDue: isoInstant(value.reviewDue),
  };
}
/** The library list. Anything malformed fails the whole read: the page says it couldn't load, never "nothing here". */
export function parseSnapshot(value: unknown): KnowledgeSnapshot {
  if (!object(value) || value.state !== "ready" || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 || !Array.isArray(value.entries)) return fail();
  const entries = value.entries.map(entry => {
    if (!object(entry) || (entry.kind !== "profile" && entry.kind !== "document") || typeof entry.archived !== "boolean" || !Array.isArray(entry.versions)) return fail();
    const publishedVersionId = entry.publishedVersionId === null ? null : uuid(entry.publishedVersionId);
    return { documentId: uuid(entry.documentId), kind: entry.kind, archived: entry.archived, publishedVersionId, versions: entry.versions.map(meta) } as KnowledgeEntry;
  }).filter((entry, index, all) => !(value.entries as Record<string, unknown>[])[index]?.deleted && all.findIndex(other => other.documentId === entry.documentId) === index);
  return { revision: Number(value.revision), entries };
}
export function parseVersion(value: unknown): KnowledgeVersion {
  if (!object(value) || (value.kind !== "profile" && value.kind !== "document") || typeof value.current !== "boolean" || typeof value.archived !== "boolean" || typeof value.body !== "string") return fail();
  let profileFields: ProfileFields | null = null;
  if (value.profileFields !== null && value.profileFields !== undefined) {
    if (!object(value.profileFields)) return fail();
    profileFields = {};
    for (const key of PROFILE_FIELDS) if (typeof value.profileFields[key] === "string") profileFields[key] = value.profileFields[key] as string;
  }
  return { ...meta(value), documentId: uuid(value.documentId), kind: value.kind, body: value.body, profileFields, current: value.current, archived: value.archived };
}
export function parseReceipt(value: unknown): KnowledgeReceipt {
  if (!object(value) || !["draft_saved", "published", "archived", "deleted"].includes(String(value.state)) || !Number.isSafeInteger(value.revision)) return fail();
  return {
    state: value.state as KnowledgeReceipt["state"], operationId: text(value.operationId, 200), documentId: uuid(value.documentId),
    versionId: value.versionId === undefined || value.versionId === null ? null : uuid(value.versionId),
    textDigest: value.textDigest === undefined || value.textDigest === null ? null : typeof value.textDigest === "string" && DIGEST.test(value.textDigest) ? value.textDigest : fail(),
    revision: Number(value.revision), savedAt: required(value.savedAt),
  };
}

/* ---------- Text checks (mirroring the server's) ---------- */
const encoder = new TextEncoder();
export const utf8Bytes = (value: string) => encoder.encode(value).length;
/** The server trims surrounding whitespace and turns CRLF/CR into LF; this is what will be saved. */
export const normalizeText = (value: string) => value.replace(/\r\n?/g, "\n").trim();
/** The first character the server refuses (a control character or a broken surrogate), with its line, or null. */
export function refusedCharacter(value: string): { line: number } | null {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    const control = code <= 0x08 || code === 0x0b || code === 0x0c || (code >= 0x0e && code <= 0x1f) || code === 0x7f;
    const high = code >= 0xd800 && code <= 0xdbff, low = code >= 0xdc00 && code <= 0xdfff;
    let broken = false;
    if (high) { const next = value.charCodeAt(index + 1); if (next >= 0xdc00 && next <= 0xdfff) index++; else broken = true; }
    else if (low) broken = true;
    if (control || broken) return { line: value.slice(0, index).split("\n").length };
  }
  return null;
}
export const sizeText = (bytes: number) => bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;

export type DateField = "effectiveFrom" | "effectiveUntil" | "reviewDue";
export type DraftErrors = Partial<Record<"title" | "body" | "sourceName" | ProfileField | DateField, string>>;
function characterError(value: string) { const refused = refusedCharacter(value); return refused ? `Line ${refused.line} has a hidden character. Remove it` : null; }
function dateErrors(validity: KnowledgeValidity): DraftErrors {
  if (validity.effectiveFrom && validity.effectiveUntil && Date.parse(validity.effectiveFrom) >= Date.parse(validity.effectiveUntil)) return { effectiveUntil: "End after the start" };
  return {};
}
export type DocumentDraft = { title: string; category: string; locale: KnowledgeLocale; body: string; sourceName: string | null } & KnowledgeValidity;
export function documentErrors(draft: DocumentDraft): DraftErrors {
  const errors: DraftErrors = { ...dateErrors(draft) };
  const title = normalizeText(draft.title);
  if (!title) errors.title = "Enter a title";
  else if (/[\r\n\t]/.test(title)) errors.title = "Keep the title on one line";
  else if (utf8Bytes(title) > KNOWLEDGE_LIMITS.titleBytes) errors.title = `Title too long (${utf8Bytes(title)} of ${KNOWLEDGE_LIMITS.titleBytes} bytes)`;
  else { const refused = characterError(title); if (refused) errors.title = refused; }
  const body = normalizeText(draft.body);
  if (!body) errors.body = "Add the text";
  else if (utf8Bytes(body) > KNOWLEDGE_LIMITS.documentBytes) errors.body = `Over the ${sizeText(KNOWLEDGE_LIMITS.documentBytes)} limit. Split it up`;
  else { const refused = characterError(body); if (refused) errors.body = refused; }
  if (draft.sourceName !== null) {
    const name = normalizeText(draft.sourceName);
    if (!/\.(txt|md)$/i.test(name) || /[\\/\r\n\t]/.test(name)) errors.sourceName = "Only .txt and .md files can be loaded";
    else if (utf8Bytes(name) > KNOWLEDGE_LIMITS.fileNameBytes) errors.sourceName = "File name too long";
  }
  return errors;
}
/** The profile's saved text, built the way the server builds it (one "field:" block per filled field). */
export function profileBody(fields: ProfileFields) {
  return normalizeText(PROFILE_FIELDS.filter(key => normalizeText(fields[key] ?? "")).map(key => `${key}:\n${normalizeText(fields[key] ?? "")}`).join("\n\n"));
}
export function profileErrors(fields: ProfileFields, validity: KnowledgeValidity): DraftErrors {
  const errors: DraftErrors = { ...dateErrors(validity) };
  if (!normalizeText(fields.businessDescription ?? "")) errors.businessDescription = "Describe what the business does";
  for (const key of PROFILE_FIELDS) { const value = fields[key] ?? ""; const refused = value ? characterError(value) : null; if (refused) errors[key] = refused; }
  const total = utf8Bytes(profileBody(fields));
  if (!errors.businessDescription && total > KNOWLEDGE_LIMITS.profileBytes) errors.businessDescription = `Over the ${sizeText(KNOWLEDGE_LIMITS.profileBytes)} limit. Shorten it`;
  return errors;
}

/* ---------- Company time ---------- */
const parts = (time: number, timeZone: string) => {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(time)).filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)]));
  return Date.UTC(values.year, values.month - 1, values.day, values.hour % 24, values.minute, values.second);
};
const offsetAt = (time: number, timeZone: string) => parts(time, timeZone) - Math.floor(time / 1000) * 1000;
const pad = (value: number) => String(value).padStart(2, "0");
/** A wall-clock time the Owner picked ("2026-11-20T09:00") in the company's zone, as an instant with its offset
 * ("2026-11-20T09:00:00-04:00"). A time skipped by a clock change resolves forward; the screen shows the result. */
export function zonedInstant(local: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return null;
  const wall = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  // The offsets a day either side cover any one clock change. A repeated time takes the earlier instant; a skipped one
  // keeps the offset from before the change, so it lands that much later (2:30 on a spring-forward night reads 3:30).
  const before = offsetAt(wall - 86400000, timeZone), after = offsetAt(wall + 86400000, timeZone);
  const valid = [...new Set([before, after])].map(offset => wall - offset).filter(time => offsetAt(time, timeZone) === wall - time).sort((a, b) => a - b);
  const time = valid[0] ?? wall - before;
  const offset = Math.round(offsetAt(time, timeZone) / 60000), sign = offset < 0 ? "-" : "+", abs = Math.abs(offset);
  const shown = new Date(time + offset * 60000);
  return `${shown.getUTCFullYear()}-${pad(shown.getUTCMonth() + 1)}-${pad(shown.getUTCDate())}T${pad(shown.getUTCHours())}:${pad(shown.getUTCMinutes())}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
/** An instant as the wall-clock value of a date-and-time field in the company's zone. */
export function zonedInput(iso: string | null, timeZone: string) {
  if (!iso) return "";
  const shown = new Date(parts(Date.parse(iso), timeZone));
  return `${shown.getUTCFullYear()}-${pad(shown.getUTCMonth() + 1)}-${pad(shown.getUTCDate())}T${pad(shown.getUTCHours())}:${pad(shown.getUTCMinutes())}`;
}
export function companyTime(iso: string | null, timeZone: string, withZone = false) {
  if (!iso) return null;
  return withZone ? formatWithZone("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }, new Date(iso), timeZone) : new Intl.DateTimeFormat("en-US", { timeZone, ...{ weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" } }).format(new Date(iso));
}

/* ---------- What an entry is now ---------- */
export type EntryStatus = { tone: "green" | "amber" | "teal" | "grey"; label: string };
export type EntryState = { published: KnowledgeVersionMeta | null; latest: KnowledgeVersionMeta; draft: KnowledgeVersionMeta | null; statuses: EntryStatus[]; inUse: boolean };
/** Drafts never count as guidance; a published version counts only inside its effective window. Review due is advisory:
 * an overdue source is still used, so it gets its own amber status beside the others. */
export function entryState(entry: KnowledgeEntry, now: number, timeZone: string): EntryState {
  const latest = entry.versions[entry.versions.length - 1];
  const published = entry.versions.find(version => version.versionId === entry.publishedVersionId) ?? null;
  const draft = latest && !latest.publishedAt && latest.versionId !== published?.versionId ? latest : null;
  const statuses: EntryStatus[] = [];
  let inUse = false;
  const day = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(new Date(iso));
  if (entry.archived) statuses.push({ tone: "grey", label: "Archived" });
  else if (!published) statuses.push({ tone: "amber", label: "Draft, not published" });
  else if (published.effectiveFrom && Date.parse(published.effectiveFrom) > now) statuses.push({ tone: "teal", label: `Starts ${day(published.effectiveFrom)}` });
  else if (published.effectiveUntil && Date.parse(published.effectiveUntil) <= now) statuses.push({ tone: "grey", label: `Ended ${day(published.effectiveUntil)}` });
  else { statuses.push({ tone: "green", label: "In use by Rondo" }); inUse = true; }
  if (!entry.archived && published?.reviewDue && Date.parse(published.reviewDue) <= now) statuses.push({ tone: "amber", label: "Review overdue" });
  if (!entry.archived && published && draft) statuses.push({ tone: "amber", label: "Unpublished draft" });
  return { published, latest, draft, statuses, inUse };
}

/** One list row's status, said once: a chip only for what needs a look (a draft, a review date that passed, a later start);
 * the normal state ("In use") is plain grey text. */
export type EntrySummary = { chip: { tone: "amber" | "teal"; label: string } | null; value: string | null };
export function entrySummary(entry: KnowledgeEntry, now: number, timeZone: string): EntrySummary {
  const state = entryState(entry, now, timeZone);
  const day = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(new Date(iso));
  if (entry.archived) return { chip: null, value: "Archived" };
  const published = state.published;
  if (!published) return { chip: { tone: "amber", label: "Draft" }, value: null };
  if (published.reviewDue && Date.parse(published.reviewDue) <= now) return { chip: { tone: "amber", label: "Review due" }, value: null };
  if (state.draft) return { chip: { tone: "amber", label: "Draft waiting" }, value: null };
  if (published.effectiveFrom && Date.parse(published.effectiveFrom) > now) return { chip: { tone: "teal", label: `Starts ${day(published.effectiveFrom)}` }, value: null };
  if (published.effectiveUntil && Date.parse(published.effectiveUntil) <= now) return { chip: null, value: `Ended ${day(published.effectiveUntil)}` };
  return { chip: null, value: "In use" };
}

/* ---------- Transport ---------- */
export type KnowledgeCommand =
  | ({ op: "draft_document"; requestId: string; expectedRevision: number; documentId: string | null; title: string; locale: KnowledgeLocale; category: string; sourceName: string | null; body: string } & KnowledgeValidity)
  | ({ op: "draft_profile"; requestId: string; expectedRevision: number; locale: KnowledgeLocale; fields: ProfileFields } & KnowledgeValidity)
  | { op: "publish"; requestId: string; expectedRevision: number; documentId: string; versionId: string; reviewedTextDigest: string }
  | { op: "archive"; requestId: string; expectedRevision: number; documentId: string }
  | { op: "delete"; requestId: string; expectedRevision: number; documentId: string; acknowledged: true };
/** `uncertain`: the request may or may not have been applied. Its exact command is kept and only ever sent again as is. */
export type WriteOutcome = { kind: "receipt"; receipt: KnowledgeReceipt } | { kind: "invalid" | "forbidden" | "conflict" | "limit" | "uncertain" };
export type ReadOutcome<T> = { kind: "ready"; value: T } | { kind: "forbidden" | "unavailable" | "missing" };
type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
const headers = { [KNOWLEDGE_HEADER]: "1" };
export const versionHref = (documentId: string, versionId: string) => `${KNOWLEDGE_ENDPOINT}/entries/${documentId}/versions/${versionId}`;

export function createKnowledgeClient(fetcher: Fetcher = (input, init) => fetch(input, init)) {
  async function read<T>(path: string, parse: (value: unknown) => T, signal: AbortSignal, accept?: string): Promise<ReadOutcome<T>> {
    try {
      const response = await fetcher(path, { method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error", signal, headers: { ...headers, ...(accept ? { accept } : {}) } });
      if (response.status === 401 || response.status === 403) return { kind: "forbidden" };
      if (response.status === 404) return { kind: "missing" };
      if (!response.ok) return { kind: "unavailable" };
      return { kind: "ready", value: parse(await response.json()) };
    } catch { return { kind: "unavailable" }; }
  }
  return {
    list: (signal: AbortSignal) => read(KNOWLEDGE_ENDPOINT, parseSnapshot, signal),
    /** The exact saved version for review. The server compares Accept exactly, so it is sent alone. */
    version: (documentId: string, versionId: string, signal: AbortSignal) => read(versionHref(documentId, versionId), parseVersion, signal, "application/json"),
    /** Never aborted by the page: leaving mid-write would turn a likely success into an uncertain result. */
    async write(command: KnowledgeCommand, signal?: AbortSignal): Promise<WriteOutcome> {
      let response: Response;
      try {
        response = await fetcher(KNOWLEDGE_ENDPOINT, { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal,
          headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(command) });
      } catch { return { kind: "uncertain" }; }
      if (response.status === 401 || response.status === 403) return { kind: "forbidden" };
      if (response.status === 400) return { kind: "invalid" };
      if (response.status === 409) return { kind: "conflict" };
      if (response.status === 429) return { kind: "limit" };
      if (!response.ok) return { kind: "uncertain" };
      try { return { kind: "receipt", receipt: parseReceipt(await response.json()) }; } catch { return { kind: "uncertain" }; }
    },
  };
}
export type KnowledgeClient = ReturnType<typeof createKnowledgeClient>;
export const newRequestId = () => crypto.randomUUID();
