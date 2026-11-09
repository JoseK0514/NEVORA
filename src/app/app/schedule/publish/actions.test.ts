import { beforeEach, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({ warnings: {} as Record<string, boolean>, published: [] as string[], deniedAfter: false, events: [] as string[] }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Object.assign(new Error("redirect"), { url }); } }));
vi.mock("@/lib/auth/session", () => ({ requireSessionMutationProof: async () => ({ employee: { id: "QAOWNER", role: "OWNER" } }) }));
vi.mock("@/lib/auth/permissions", () => ({ MANAGER_ROLES: ["OWNER", "MANAGER"], requireRoles: async () => ({ id: "QAOWNER", role: "OWNER" }) }));
vi.mock("@/lib/data/schedule-publication-review", () => ({ getSchedulePublishReadiness: async (_week: string, locationId: string) => ({ hasWarnings: !!f.warnings[locationId] }) }));
vi.mock("@/lib/data/publication-revisions", () => ({ publishScheduleWithRevision: async ({ locationId }: { locationId: string }) => { f.events.push(`publish:${locationId}`); f.published.push(locationId); return { published: true }; } }));
vi.mock("@/lib/company-access/operational-scope.server", () => ({
  assertOperationalAccess: async () => { f.events.push("admit"); return { scope: { mode: "COMPANY" } }; },
  assertOriginalOperationalAccess: async () => { f.events.push("recheck"); if (f.deniedAfter) throw Object.assign(new Error("denied"), { denied: true }); },
  isOperationalAuthorizationError: (error: unknown) => !!(error as { denied?: boolean })?.denied,
}));
vi.mock("@/lib/data/management-session", () => ({ isManagementAuthorizationError: () => false }));
const { publishDraftsAction } = await import("./actions");

const form = (locations: string[], confirm = false) => { const data = new FormData(); data.set("weekStart", "2026-10-26"); for (const id of locations) data.append("locationId", id); if (confirm) data.set("confirmWarnings", "yes"); return data; };
const run = async (data: FormData) => { try { await publishDraftsAction(data); } catch (error) { return (error as { url?: string }).url; } };
beforeEach(() => { f.warnings = {}; f.published = []; f.deniedAfter = false; f.events = []; });

it("publishes every chosen draft through the revision writer, re-checking access after each, and opens Schedule", async () => {
  expect(await run(form(["loc-1", "loc-2"]))).toBe("/app/schedule?week=2026-10-26&published=all");
  expect(f.published).toEqual(["loc-1", "loc-2"]);
  expect(f.events).toEqual(["admit", "recheck", "publish:loc-1", "recheck", "publish:loc-2", "recheck"]);
  expect(await run(form(["loc-3"]))).toBe("/app/schedule?week=2026-10-26&published=loc-3");
});

it("stops for review when any draft has readiness warnings, and publishes only after Publish anyway", async () => {
  f.warnings["loc-2"] = true;
  expect(await run(form(["loc-1", "loc-2"]))).toBe("/app/schedule/publish?week=2026-10-26&review=1#publish-review");
  expect(f.published).toEqual([]);
  expect(await run(form(["loc-1", "loc-2"], true))).toBe("/app/schedule?week=2026-10-26&published=all");
  expect(f.published).toEqual(["loc-1", "loc-2"]);
});

it("refuses an invalid week or no locations, and stops when access changes mid-way", async () => {
  const bad = form([]); expect(await run(bad)).toBe("/app/schedule?error=INVALID_PUBLISH");
  f.deniedAfter = true;
  expect(await run(form(["loc-1", "loc-2"]))).toBe("/app/schedule?error=ACCESS_DENIED");
  expect(f.published).toEqual([]);
});
