import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, rs } from '@rstest/core';

const f = rs.hoisted(() => ({ statuses: [] as { locationId: string; status: string }[], warnings: {} as Record<string, boolean>, denied: false, role: "OWNER", pending: null as unknown }));
rs.mock("next/link", () => ({ default: ({ children, prefetch: _p, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", props, children) }));
rs.mock("@/lib/auth/session", () => ({ requireSessionMutationProof: async () => ({ employee: { id: "QAOWNER", role: f.role } }) }));
rs.mock("@/lib/auth/permissions", () => ({ MANAGER_ROLES: ["OWNER", "MANAGER"], requireRoles: async () => ({ id: "QAOWNER", role: f.role }) }));
rs.mock("@/lib/data/workspaces", () => ({ getWorkspace: async () => ({ id: "w", timeZone: "America/Puerto_Rico" }) }));
rs.mock("@/lib/business-time", () => ({ businessDate: () => "2026-10-30" }));
rs.mock("@/lib/company-access/operational-scope.server", () => ({ withOperationalCompany: async (_proof: unknown, load: () => Promise<unknown>) => f.denied || f.role === "MANAGER" ? { state: "unavailable", reason: "access_denied" } : { state: "ready", data: await load(), authority: "fixture", observedAt: "2026-10-30T12:00:00Z", validForMs: 15000 } }));
rs.mock("@/components/company-access/scoped-read-frame", () => ({ ScopedReadFrame: ({ children }: { children: React.ReactNode }) => children }));
rs.mock("@/components/company-access/operational-unavailable", () => ({ OperationalUnavailable: ({ title, closed }: { title: string; closed?: { title: string; line: string } }) => createElement("p", null, closed ? `${title}: ${closed.title}. ${closed.line}` : title) }));
rs.mock("@/components/schedule-generation-controls", () => ({ ScheduleGenerationControls: () => createElement("div", null, "Build week") }));
rs.mock("@/components/schedule-copy-form", () => ({ ScheduleCopyForm: ({ label, command }: { label: string; command: { kind: string; weekStart: string } }) => createElement("button", { "data-kind": command.kind, "data-week": command.weekStart }, label) }));
rs.mock("@/lib/data/employees", () => ({ listLocations: async () => [{ id: "loc-1", shortName: "Condado" }, { id: "loc-2", shortName: "Dorado" }, { id: "loc-3", shortName: "Hato Rey" }] }));
rs.mock("@/lib/data/schedules", () => ({ listScheduleStatuses: async () => f.statuses, listWeekShifts: async () => [{ locationId: "loc-1", isCalloutApproved: false }, { locationId: "loc-1", isCalloutApproved: false }, { locationId: "loc-2", isCalloutApproved: false }] }));
rs.mock("@/lib/data/schedule-generation-review", () => ({ getScheduleGenerationReview: async () => ({ editable: true, attempted: 0, needsSetup: 0, coverage: null, exclusions: [] }) }));
rs.mock("@/lib/data/schedule-publication-review", () => ({ getSchedulePublishReadiness: async (_week: string, id: string) => ({ hasWarnings: !!f.warnings[id], coverageGaps: f.warnings[id] ? 2 : 0, missingLeadBlocks: 0, underTargetCount: 0, overTargetCount: 0, unconfiguredTargetCount: 0 }) }));
rs.mock("./actions", () => ({ publishDraftsAction: async () => {} }));
rs.mock("../actions", () => ({ publishScheduleAction: async () => {}, publishScheduleChangesAction: async () => {} }));
rs.mock("@/lib/company-access/operational-read.server", () => ({
  readManagerSchedulePublish: async () => f.denied ? { state: "unavailable", reason: "access_denied" } : ({
    state: "ready", authority: "fixture", observedAt: "2026-10-30T12:00:00Z", validForMs: 15000,
    data: { locations: [{ id: "loc-1", name: "Calle Loíza", shortName: "Calle Loíza", status: "DRAFT", shiftCount: 2 }], publishLocationIds: ["loc-1"], review: [] },
  }),
  readSchedulePendingChanges: async () => f.pending ? { state: "ready", data: f.pending } : { state: "unavailable", reason: "read_failed" } }));
const value = (startTime: string, endTime: string) => ({ employeeId: "e1", employeeName: "Dana Kim", locationId: "loc-1", date: "2026-11-03", startTime, endTime, positionId: null, positionName: null, isDesignatedLead: false, notes: null });
const pendingData = (canPublish = true) => ({ weekStart: "2026-11-02", hasPendingChanges: true, pendingCount: 2, neverCaptured: false, latestRevision: null, canPublish, truncated: false,
  locations: [{ locationId: "loc-1", locationName: "Condado", pendingCount: 2 }],
  changes: [
    { shiftId: "s1", locationId: "loc-1", employeeId: "e1", employeeName: "Dana Kim", date: "2026-11-03", kind: "CHANGED", fields: ["TIME"], before: value("12:00", "20:00"), after: value("14:00", "20:00"), editCount: 1, lastEditedAt: null, lastEditedBy: null },
    { shiftId: "s2", locationId: "loc-1", employeeId: "e2", employeeName: "Sam Ortiz", date: "2026-11-04", kind: "ADDED", fields: ["ADDED"], before: null, after: { ...value("08:00", "16:00"), employeeName: "Sam Ortiz" }, editCount: 1, lastEditedAt: null, lastEditedBy: null },
  ] });
const { default: Page } = await import("./page");
const html = async (params: Record<string, string> = {}) => renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ week: "2026-11-02", ...params }) }));
beforeEach(() => { f.statuses = [{ locationId: "loc-1", status: "PUBLISHED" }, { locationId: "loc-2", status: "DRAFT" }]; f.warnings = {}; f.denied = false; f.role = "OWNER"; f.pending = null; });

it("names the week, each location's state and shift count, and publishes every draft with one button", async () => {
  const out = await html();
  expect(out).toContain("<small>Next week</small><b>Nov 2–8</b>");
  expect(out).toContain(">1 draft</span>");
  // Review B1 (NV-071): Published is done, so it reads green.
  expect(out).toMatch(/Condado<\/span><span class="c-row__detail"><span>2 shifts<\/span><\/span><\/span><span class="c-row__trail"><span class="c-pill c-pill--green b-chip b-chip--green">Published/);
  expect(out).toMatch(/Dorado<\/span><span class="c-row__detail"><span>1 shift<\/span>.*c-pill--amber b-chip b-chip--amber">Draft/);
  expect(out).toMatch(/Hato Rey.*Nothing scheduled.*Not started/);
  expect(out).toContain('name="locationId" value="loc-2"');
  expect(out).not.toContain('name="locationId" value="loc-1"');
  expect(out).toContain("Your team is notified when you publish.");
  expect(out).toContain(">Publish Dorado<");
  expect(out).toContain('href="/app/schedule?week=2026-11-02"');
  // Board O-BuildPublish: a sheet with Cancel; Start from holds building, copying last week and templates.
  expect(out).toContain('class="c-shift__cancel" href="/app/schedule?week=2026-11-02">Cancel</a>');
  expect(out).toMatch(/<summary[^>]*>.*Start from.*Availability/);
  expect(out).toContain('data-kind="PREVIOUS_WEEK" data-week="2026-11-02">Copy last week</button>');
  expect(out).toContain('href="/app/schedule/templates?week=2026-11-02"');
  expect(out.match(/class="c-btn c-btn--full"/g)).toHaveLength(1);
});

it("lists readiness warnings per location before Publish anyway confirms", async () => {
  f.statuses.push({ locationId: "loc-3", status: "DRAFT" });
  f.warnings["loc-2"] = true;
  const out = await html({ review: "1" });
  expect(out).toContain("Review before publishing");
  // One row per warning: the amber Warning glyph, the count at 600, then what it counts.
  expect(out).toMatch(/<li><svg[^>]*c-publish__warn-ic[^>]*>.*?<\/svg><span><b class="c-num">2<\/b> uncovered coverage blocks<\/span><\/li>/);
  expect(out).toContain('c-publish__back" href="/app/schedule?week=');
  expect(out).toContain('name="confirmWarnings" value="yes"');
  expect(out).toContain(">Publish 2 drafts anyway<");
  expect(out).toContain('class="nv-compact-action"');
  const ordinary = await html();
  expect(ordinary).not.toContain("confirmWarnings");
  expect(ordinary).not.toContain('class="nv-compact-action"');
});

it("says when nothing is left to publish, and stops when access is unavailable", async () => {
  f.statuses = [{ locationId: "loc-1", status: "PUBLISHED" }];
  // Batch nav gate (Nov 23, 2026): the week's green Published says it once; no row pill or closing line repeats it.
  const done = await html();
  expect(done.match(/>Published</g)).toHaveLength(1);
  expect(done).not.toContain("Everything planned this week is published.");
  expect(done).not.toContain('class="c-btn c-btn--full"');
  f.denied = true;
  expect(await html()).toContain("Build and publish unavailable");
});

it("lists changes to the published week and publishes them once with Publish changes", async () => {
  f.statuses = [{ locationId: "loc-1", status: "PUBLISHED" }];
  f.pending = pendingData();
  const out = await html();
  expect(out).toContain(">2 changes<");
  expect(out).toContain('>Changes not published<span class="c-count c-num"><span class="sr-only">\u00a0</span>2</span><');
  // Final polish (confirmations review A #19): the facts are whole parts; the chip alone says Added.
  const words = out.replace(/<span class="b-when-s">[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "").replace(/[\u00a0\u2060\u202f]/g, m => m === "\u2060" ? "" : " ");
  expect(words).toContain("Tue, Nov 3 · Time changed · 12:00 PM – 8:00 PM → 2:00 PM – 8:00 PM");
  expect(words).toMatch(/Sam OrtizWed, Nov 4 · 8:00 AM – 4:00 PMAdded/);
  expect(words).not.toContain("Added · ");
  expect(out).toContain(">Publish changes<");
  expect(out).toContain("Each person with a change is notified once when you publish.");
  expect(out).not.toContain('name="locationId"');
  // Warnings for the published locations are reviewed here first; Publish changes anyway confirms.
  f.warnings["loc-1"] = true;
  const review = await html({ review: "changes" });
  expect(review).toContain("Review before publishing");
  expect(review).toContain(">Publish changes anyway<");
  expect(review).toContain('class="nv-compact-action"');
  expect(out).not.toContain('class="nv-compact-action"');
  expect(review).toContain('name="confirmWarnings" value="yes"');
});

it("publishes drafts and held changes together, and tells a location Manager who publishes", async () => {
  f.pending = pendingData();
  expect(await html()).toContain(">Publish Dorado and changes<");
  f.statuses = [{ locationId: "loc-1", status: "PUBLISHED" }];
  f.pending = pendingData(false);
  const out = await html();
  expect(out).toContain("An Owner or company-wide Manager publishes these changes.");
  expect(out).not.toContain(">Publish changes<");
});

it("opens publishing for a location-scoped Manager without exposing other locations or the bulk form", async () => {
  f.role = "MANAGER";
  const out = await html();
  expect(out).toMatch(/Calle Loíza.*2 shifts.*Draft/);
  expect(out).not.toMatch(/Build and publish unavailable|Condado|Dorado|Hato Rey|Copy last week/);
  // QA A3-05 (Nov 21, 2026): the Manager holds Publish schedules here, so they get that location's own Publish form, and
  // only that one (no bulk form across locations).
  expect(out.match(/name="locationId"/g)).toHaveLength(1);
  expect(out).toContain('name="locationId" value="loc-1"');
  expect(out).toContain("Publish Calle Loíza");
  expect(out).not.toContain('value="loc-2"');
  // It goes through the per-location action, which returns here for that location's warning review.
  expect(out).toContain('name="from" value="publish"');
});

it("a Manager without Publish schedules is told which permission is missing, not to sign in again", async () => {
  f.role = "MANAGER"; f.denied = true;
  const out = await html();
  expect(out).toContain("Publishing permission needed");
  expect(out).toContain("An Owner can give it to you.");
  expect(out).not.toContain("Company-wide access needed");
  expect(out).not.toContain("Sign in again");
});
