import { describe, expect, it, rs } from '@rstest/core';
import {
  KNOWLEDGE_HEADER, KNOWLEDGE_LIMITS, companyTime, createKnowledgeClient, documentErrors, entryState, entrySummary, isoInstant, normalizeText, parseReceipt, parseSnapshot,
  parseVersion, profileBody, profileErrors, refusedCharacter, utf8Bytes, zonedInput, zonedInstant, type KnowledgeEntry,
} from "./knowledge-client";
import { readTextFile } from "@/components/owner-advisor/knowledge/knowledge-page";
import { viewFromParams, viewHref } from "@/components/owner-advisor/knowledge/views";

// Fictional IDs and digests only.
const DOC = "44444444-4444-4444-8444-444444444444", V1 = "55555555-5555-4555-8555-555555555555", V2 = "66666666-6666-4666-8666-666666666666";
const DIGEST = "a".repeat(64);
const meta = (versionId: string, extra: Record<string, unknown> = {}) => ({ versionId, title: "Fictional opening procedure", locale: "en", category: "operations", sourceName: "opening.md", textDigest: DIGEST,
  createdAt: "2026-11-15T12:00:00.123+00:00", publishedAt: null, effectiveFrom: null, effectiveUntil: null, reviewDue: null, ...extra });

describe("reading the contract's shapes", () => {
  it("reads a snapshot, drops deleted entries and fails whole on anything malformed", () => {
    const snapshot = parseSnapshot({ state: "ready", revision: 3, entries: [
      { documentId: DOC, kind: "document", archived: false, deleted: false, publishedVersionId: V1, versions: [meta(V1, { publishedAt: "2026-11-15T12:05:00+00:00" }), meta(V2)] },
      { documentId: "77777777-7777-4777-8777-777777777777", kind: "document", archived: false, deleted: true, publishedVersionId: null, versions: [] },
    ] });
    expect(snapshot.revision).toBe(3);
    expect(snapshot.entries).toHaveLength(1);
    expect(snapshot.entries[0].versions[0].publishedAt).toBe("2026-11-15T12:05:00.000Z");
    expect(() => parseSnapshot({ state: "ready", revision: 1, entries: [{ documentId: "not-an-id", kind: "document", archived: false, publishedVersionId: null, versions: [] }] })).toThrow();
    expect(() => parseSnapshot({ state: "unavailable" })).toThrow();
    expect(() => parseSnapshot({ state: "ready", revision: 1, entries: [{ documentId: DOC, kind: "document", archived: false, publishedVersionId: null, versions: [meta(V1, { textDigest: "short" })] }] })).toThrow();
  });
  it("reads Postgres text timestamps from the exact-version view as instants", () => {
    expect(isoInstant("2026-11-15 12:00:00.123+00")).toBe("2026-11-15T12:00:00.123Z");
    expect(isoInstant("2026-11-15 08:00:00.123456-04")).toBe("2026-11-15T12:00:00.123Z");
    expect(isoInstant("2026-11-15 17:30:00+05:30")).toBe("2026-11-15T12:00:00.000Z");
    expect(isoInstant(null)).toBeNull();
    expect(() => isoInstant("tomorrow")).toThrow();
    const version = parseVersion({ ...meta(V1), documentId: DOC, kind: "profile", createdAt: "2026-11-15 12:00:00.123+00", body: "businessDescription:\nFictional bakery.",
      profileFields: { businessDescription: "Fictional bakery.", unknown: "ignored" }, current: false, archived: false });
    expect(version.profileFields).toEqual({ businessDescription: "Fictional bakery." });
    expect(version.body).toBe("businessDescription:\nFictional bakery.");
  });
  it("reads receipts, with or without a version", () => {
    expect(parseReceipt({ state: "draft_saved", operationId: "op-1", documentId: DOC, versionId: V1, textDigest: DIGEST, revision: 2, savedAt: "2026-11-15T12:00:00Z" }).versionId).toBe(V1);
    expect(parseReceipt({ state: "archived", operationId: "op-2", documentId: DOC, revision: 3, savedAt: "2026-11-15T12:00:00Z" }).versionId).toBeNull();
    expect(() => parseReceipt({ state: "done", operationId: "x", documentId: DOC, revision: 1, savedAt: "2026-11-15T12:00:00Z" })).toThrow();
  });
});

describe("checking text before saving, the way the server does", () => {
  it("normalizes line endings and surrounding space, and counts UTF-8 bytes", () => {
    expect(normalizeText("  a\r\nb\rc  \n")).toBe("a\nb\nc");
    expect(utf8Bytes("ñ")).toBe(2);
  });
  it("finds control characters and broken surrogates with their line, and allows tabs and emoji", () => {
    expect(refusedCharacter("one\ntwo\u0007")).toEqual({ line: 2 });
    expect(refusedCharacter("ok\tfine 🍞")).toBeNull();
    expect(refusedCharacter("a\ud800b")).toEqual({ line: 1 });
  });
  it("shows every size problem instead of shortening", () => {
    const base = { title: "Opening", category: "operations", locale: "en" as const, body: "Check the roster.", sourceName: null, effectiveFrom: null, effectiveUntil: null, reviewDue: null };
    expect(documentErrors(base)).toEqual({});
    expect(documentErrors({ ...base, title: "x".repeat(241) }).title).toContain("241 of 240 bytes");
    expect(documentErrors({ ...base, body: "x".repeat(KNOWLEDGE_LIMITS.documentBytes + 1) }).body).toContain("Over the 256 KB limit");
    expect(documentErrors({ ...base, body: "   " }).body).toBeTruthy();
    expect(documentErrors({ ...base, sourceName: "manual.pdf" }).sourceName).toBeTruthy();
    expect(documentErrors({ ...base, sourceName: "a/b.md" }).sourceName).toBeTruthy();
    expect(documentErrors({ ...base, effectiveFrom: "2026-11-20T09:00:00-05:00", effectiveUntil: "2026-11-20T08:00:00-05:00" }).effectiveUntil).toBeTruthy();
  });
  it("builds the profile text the server stores and checks its size", () => {
    expect(profileBody({ businessDescription: " Fictional bakery. ", objectives: "", escalationRoles: "Owner decides." })).toBe("businessDescription:\nFictional bakery.\n\nescalationRoles:\nOwner decides.");
    expect(profileErrors({}, { effectiveFrom: null, effectiveUntil: null, reviewDue: null }).businessDescription).toBeTruthy();
    expect(profileErrors({ businessDescription: "é".repeat(9000) }, { effectiveFrom: null, effectiveUntil: null, reviewDue: null }).businessDescription).toContain("16 KB limit");
  });
});

describe("company time", () => {
  it("turns a picked wall-clock time into an instant with the company's offset, across clock changes", () => {
    expect(zonedInstant("2026-11-20T09:00", "America/New_York")).toBe("2026-11-20T09:00:00-05:00");
    expect(zonedInstant("2026-07-20T09:00", "America/New_York")).toBe("2026-07-20T09:00:00-04:00");
    expect(zonedInstant("2026-11-20T09:00", "Asia/Kolkata")).toBe("2026-11-20T09:00:00+05:30");
    // 2:30 AM on Mar 8, 2026 doesn't exist in New York; it resolves forward and the screen shows the result.
    expect(zonedInstant("2026-03-08T02:30", "America/New_York")).toBe("2026-03-08T03:30:00-04:00");
    // 1:30 AM on Nov 1, 2026 happens twice; the first one is taken.
    expect(zonedInstant("2026-11-01T01:30", "America/New_York")).toBe("2026-11-01T01:30:00-04:00");
    expect(zonedInstant("nope", "America/New_York")).toBeNull();
    expect(zonedInput("2026-11-20T14:00:00.000Z", "America/New_York")).toBe("2026-11-20T09:00");
    expect(zonedInput(null, "America/New_York")).toBe("");
    expect(companyTime("2026-11-20T14:00:00.000Z", "America/New_York", true)).toBe("Fri, Nov 20, 2026, 9:00 AM EST");
  });
});

describe("what an entry is now", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");
  const entry = (extra: Partial<KnowledgeEntry>, versions: Record<string, unknown>[]): KnowledgeEntry => ({ documentId: DOC, kind: "document", archived: false, publishedVersionId: null,
    versions: versions.map(version => parseSnapshot({ state: "ready", revision: 0, entries: [{ documentId: DOC, kind: "document", archived: false, publishedVersionId: null, versions: [version] }] }).entries[0].versions[0]), ...extra });
  const labels = (value: KnowledgeEntry) => entryState(value, now, "America/New_York").statuses.map(status => status.label);
  it("never counts a draft as guidance", () => expect(labels(entry({}, [meta(V1)]))).toEqual(["Draft, not published"]));
  it("is in use inside its window and says so when a newer draft waits", () => {
    expect(labels(entry({ publishedVersionId: V1 }, [meta(V1, { publishedAt: "2026-11-15T12:00:00Z" })]))).toEqual(["In use by Rondo"]);
    expect(labels(entry({ publishedVersionId: V1 }, [meta(V1, { publishedAt: "2026-11-15T12:00:00Z" }), meta(V2)]))).toEqual(["In use by Rondo", "Unpublished draft"]);
  });
  it("names a future start, an end and an overdue review", () => {
    expect(labels(entry({ publishedVersionId: V1 }, [meta(V1, { publishedAt: "2026-11-15T12:00:00Z", effectiveFrom: "2026-11-20T14:00:00Z" })]))).toEqual(["Starts Nov 20"]);
    expect(labels(entry({ publishedVersionId: V1 }, [meta(V1, { publishedAt: "2026-11-15T12:00:00Z", effectiveUntil: "2026-11-16T00:00:00Z" })]))).toEqual(["Ended Nov 15"]);
    expect(labels(entry({ publishedVersionId: V1 }, [meta(V1, { publishedAt: "2026-11-15T12:00:00Z", reviewDue: "2026-11-16T11:00:00Z" })]))).toEqual(["In use by Rondo", "Review overdue"]);
  });
  it("is only archived when archived", () => expect(labels(entry({ archived: true }, [meta(V1, { publishedAt: "2026-11-15T12:00:00Z" })]))).toEqual(["Archived"]));
  it("gives a list row one chip for what needs a look, and plain text for the normal state", () => {
    const row = (value: KnowledgeEntry) => entrySummary(value, now, "America/New_York");
    expect(row(entry({ publishedVersionId: V1 }, [meta(V1, { publishedAt: "2026-11-15T12:00:00Z" })]))).toEqual({ chip: null, value: "In use" });
    expect(row(entry({}, [meta(V1)])).chip).toEqual({ tone: "amber", label: "Draft" });
    expect(row(entry({ publishedVersionId: V1 }, [meta(V1, { publishedAt: "2026-11-15T12:00:00Z", reviewDue: "2026-11-16T11:00:00Z" }), meta(V2)])).chip?.label).toBe("Review due");
    expect(row(entry({ publishedVersionId: V1 }, [meta(V1, { publishedAt: "2026-11-15T12:00:00Z" }), meta(V2)])).chip?.label).toBe("Draft waiting");
    expect(row(entry({ publishedVersionId: V1 }, [meta(V1, { publishedAt: "2026-11-15T12:00:00Z", effectiveFrom: "2026-11-20T14:00:00Z" })])).chip).toEqual({ tone: "teal", label: "Starts Nov 20" });
    expect(row(entry({ archived: true }, [meta(V1, { publishedAt: "2026-11-15T12:00:00Z" })]))).toEqual({ chip: null, value: "Archived" });
  });
});

describe("transport", () => {
  const command = { op: "archive" as const, requestId: "11111111-1111-4111-8111-111111111111", expectedRevision: 2, documentId: DOC };
  it("sends the intent header same-origin, and Accept alone for the JSON version view", async () => {
    const fetcher = rs.fn(async () => new Response(JSON.stringify({ ...meta(V1), documentId: DOC, kind: "document", body: "x", profileFields: null, current: true, archived: false }), { status: 200 }));
    const client = createKnowledgeClient(fetcher);
    expect((await client.version(DOC, V1, new AbortController().signal)).kind).toBe("ready");
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/owner/advisor/knowledge/entries/${DOC}/versions/${V1}`);
    expect(init.credentials).toBe("same-origin");
    expect(init.headers).toEqual({ [KNOWLEDGE_HEADER]: "1", accept: "application/json" });
  });
  it.each([[400, "invalid"], [401, "forbidden"], [403, "forbidden"], [409, "conflict"], [429, "limit"], [503, "uncertain"], [500, "uncertain"]])("maps %i to %s", async (status, kind) => {
    const client = createKnowledgeClient(async () => new Response("{}", { status }));
    expect((await client.write(command)).kind).toBe(kind);
  });
  it("treats a dropped connection or an unreadable success as uncertain, never as done", async () => {
    expect((await createKnowledgeClient(async () => { throw new TypeError("offline"); }).write(command)).kind).toBe("uncertain");
    expect((await createKnowledgeClient(async () => new Response("not json", { status: 200 })).write(command)).kind).toBe("uncertain");
  });
  it("posts the command as is", async () => {
    const fetcher = rs.fn(async () => new Response(JSON.stringify({ state: "archived", operationId: "op", documentId: DOC, revision: 3, savedAt: "2026-11-16T12:00:00Z" }), { status: 200 }));
    const outcome = await createKnowledgeClient(fetcher).write(command);
    expect(outcome.kind).toBe("receipt");
    const init = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(command);
  });
  it("reads a missing version and a revoked session apart from an outage", async () => {
    expect((await createKnowledgeClient(async () => new Response("", { status: 404 })).version(DOC, V1, new AbortController().signal)).kind).toBe("missing");
    expect((await createKnowledgeClient(async () => new Response("", { status: 401 })).list(new AbortController().signal)).kind).toBe("forbidden");
    expect((await createKnowledgeClient(async () => new Response("", { status: 503 })).list(new AbortController().signal)).kind).toBe("unavailable");
  });
});

describe("loading a file and the page's addresses", () => {
  it("loads UTF-8 .txt and .md, and refuses other files and other encodings", async () => {
    expect(await readTextFile(new File(["﻿Abrir a las 7."], "apertura.md"))).toEqual({ text: "Abrir a las 7.", name: "apertura.md" });
    expect(await readTextFile(new File(["x"], "manual.pdf"))).toHaveProperty("error");
    expect(await readTextFile(new File([new Uint8Array([0x41, 0xff, 0x42])], "latin1.txt"))).toHaveProperty("error");
  });
  it("round-trips every view through its address and ignores anything else", () => {
    for (const view of [{ name: "library" }, { name: "profile" }, { name: "document", documentId: null }, { name: "document", documentId: DOC }, { name: "entry", documentId: DOC }, { name: "version", documentId: DOC, versionId: V1 }] as const) {
      const params = Object.fromEntries(new URL(viewHref(view), "http://local.test").searchParams);
      expect(viewFromParams(params)).toEqual(view);
    }
    expect(viewFromParams({ view: "entry", doc: "../../etc" })).toEqual({ name: "library" });
  });
});
