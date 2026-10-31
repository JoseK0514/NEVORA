import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({ statuses: [] as { locationId: string; status: string }[], warnings: {} as Record<string, boolean>, denied: false, pending: null as unknown }));
vi.mock("next/link", () => ({ default: ({ children, prefetch: _p, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", props, children) }));
vi.mock("@/lib/auth/session", () => ({ requireSessionMutationProof: async () => ({ employee: { id: "QAOWNER", role: "OWNER" } }) }));
vi.mock("@/lib/auth/permissions", () => ({ MANAGER_ROLES: ["OWNER", "MANAGER"], requireRoles: async () => ({ id: "QAOWNER", role: "OWNER" }) }));
vi.mock("@/lib/data/workspaces", () => ({ getWorkspace: async () => ({ id: "w", timeZone: "America/Puerto_Rico" }) }));
vi.mock("@/lib/business-time", () => ({ businessDate: () => "2026-10-30" }));
vi.mock("@/lib/company-access/operational-scope.server", () => ({ withOperationalCompany: async (_proof: unknown, load: () => Promise<unknown>) => f.denied ? { state: "unavailable", reason: "access_denied" } : { state: "ready", data: await load(), authority: "fixture", observedAt: "2026-10-30T12:00:00Z", validForMs: 15000 } }));
vi.mock("@/components/company-access/scoped-read-frame", () => ({ ScopedReadFrame: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/company-access/operational-unavailable", () => ({ OperationalUnavailable: ({ title }: { title: string }) => createElement("p", null, title) }));
vi.mock("@/components/schedule-generation-controls", () => ({ ScheduleGenerationControls: () => createElement("div", null, "Build week") }));
vi.mock("@/components/schedule-copy-form", () => ({ ScheduleCopyForm: ({ label, command }: { label: string; command: { kind: string; weekStart: string } }) => createElement("button", { "data-kind": command.kind, "data-week": command.weekStart }, label) }));
vi.mock("@/lib/data/employees", () => ({ listLocations: async () => [{ id: "loc-1", shortName: "Condado" }, { id: "loc-2", shortName: "Dorado" }, { id: "loc-3", shortName: "Hato Rey" }] }));
vi.mock("@/lib/data/schedules", () => ({ listScheduleStatuses: async () => f.statuses, listWeekShifts: async () => [{ locationId: "loc-1", isCalloutApproved: false }, { locationId: "loc-1", isCalloutApproved: false }, { locationId: "loc-2", isCalloutApproved: false }] }));
vi.mock("@/lib/data/schedule-generation-review", () => ({ getScheduleGenerationReview: async () => ({ editable: true, attempted: 0, needsSetup: 0, coverage: null, exclusions: [] }) }));
vi.mock("@/lib/data/schedule-publication-review", () => ({ getSchedulePublishReadiness: async (_week: string, id: string) => ({ hasWarnings: !!f.warnings[id], coverageGaps: f.warnings[id] ? 2 : 0, missingLeadBlocks: 0, underTargetCount: 0, overTargetCount: 0, unconfiguredTargetCount: 0 }) }));
vi.mock("./actions", () => ({ publishDraftsAction: async () => {} }));
vi.mock("../actions", () => ({ publishScheduleChangesAction: async () => {} }));
vi.mock("@/lib/company-access/operational-read.server", () => ({ readSchedulePendingChanges: async () => f.pending ? { state: "ready", data: f.pending } : { state: "unavailable", reason: "read_failed" } }));
const value = (startTime: string, endTime: string) => ({ employeeId: "e1", employeeName: "Dana Kim", locationId: "loc-1", date: "2026-11-03", startTime, endTime, positionId: null, positionName: null, isDesignatedLead: false, notes: null });
const pendingData = (canPublish = true) => ({ weekStart: "2026-11-02", hasPendingChanges: true, pendingCount: 2, neverCaptured: false, latestRevision: null, canPublish, truncated: false,
  locations: [{ locationId: "loc-1", locationName: "Condado", pendingCount: 2 }],
  changes: [
    { shiftId: "s1", locationId: "loc-1", employeeId: "e1", employeeName: "Dana Kim", date: "2026-11-03", kind: "CHANGED", fields: ["TIME"], before: value("12:00", "20:00"), after: value("14:00", "20:00"), editCount: 1, lastEditedAt: null, lastEditedBy: null },
    { shiftId: "s2", locationId: "loc-1", employeeId: "e2", employeeName: "Sam Ortiz", date: "2026-11-04", kind: "ADDED", fields: ["ADDED"], before: null, after: { ...value("08:00", "16:00"), employeeName: "Sam Ortiz" }, editCount: 1, lastEditedAt: null, lastEditedBy: null },
  ] });
const { default: Page } = await import("./page");
const html = async (params: Record<string, string> = {}) => renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ week: "2026-11-02", ...params }) }));
beforeEach(() => { f.statuses = [{ locationId: "loc-1", status: "PUBLISHED" }, { locationId: "loc-2", status: "DRAFT" }]; f.warnings = {}; f.denied = false; f.pending = null; });

it("names the week, each location's state and shift count, and publishes every draft with one button", async () => {
  const out = await html();
  expect(out).toContain("<small>Next week</small><b>Nov 2 – 8</b>");
  expect(out).toContain(">1 draft</span>");
  expect(out).toMatch(/Condado<\/span><span class="c-row__detail"><span>2 shifts<\/span><\/span><\/span><span class="c-row__trail"><span class="c-pill c-pill--neutral">Published/);
  expect(out).toMatch(/Dorado<\/span><span class="c-row__detail"><span>1 shift<\/span>.*c-pill--amber">Draft/);
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
  expect(out).toContain("2 uncovered coverage blocks");
  expect(out).toContain('name="confirmWarnings" value="yes"');
  expect(out).toContain(">Publish 2 drafts anyway<");
  expect(await html()).not.toContain("confirmWarnings");
});

it("says when nothing is left to publish, and stops when access is unavailable", async () => {
  f.statuses = [{ locationId: "loc-1", status: "PUBLISHED" }];
  expect(await html()).toContain("Everything planned this week is published.");
  f.denied = true;
  expect(await html()).toContain("Build and publish unavailable");
});

it("lists changes to the published week and publishes them once with Publish changes", async () => {
  f.statuses = [{ locationId: "loc-1", status: "PUBLISHED" }];
  f.pending = pendingData();
  const out = await html();
  expect(out).toContain(">2 changes<");
  expect(out).toContain(">Changes not published (2)<");
  expect(out).toContain("Tue, Nov 3 · Time changed · 12:00 PM – 8:00 PM → 2:00 PM – 8:00 PM");
  expect(out).toMatch(/Sam Ortiz.*Wed, Nov 4 · Added · 8:00 AM – 4:00 PM.*c-pill--amber">Added/);
  expect(out).toContain(">Publish changes<");
  expect(out).toContain("Each person with a change is notified once when you publish.");
  expect(out).not.toContain('name="locationId"');
  // Warnings for the published locations are reviewed here first; Publish changes anyway confirms.
  f.warnings["loc-1"] = true;
  const review = await html({ review: "changes" });
  expect(review).toContain("Review before publishing");
  expect(review).toContain(">Publish changes anyway<");
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
