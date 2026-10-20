import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { CoverageRepairConflictError } from "@/lib/scheduling/coverage-repair";
import NewShiftPage from "./page";

const state = vi.hoisted(() => ({ read: vi.fn(), decode: vi.fn(), proof: { employee: { id: "manager" } } }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: ComponentProps<"a">) => createElement("a", props, children) }));
vi.mock("@/lib/auth/permissions", () => ({ MANAGER_ROLES: ["MANAGER", "OWNER"], requireRoles: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireSessionMutationProof: async () => state.proof }));
vi.mock("@/lib/data/coverage-repair.server", () => ({ readCoverageRepairSelection: state.read, decodeCoverageRepairReview: state.decode }));
vi.mock("@/lib/data/employees", () => ({ listEmployees: vi.fn(), listLocations: vi.fn() }));
vi.mock("@/lib/data/workspaces", () => ({ getWorkspace: vi.fn() }));
vi.mock("@/lib/data/positions", () => ({ listPositions: vi.fn() }));
vi.mock("@/app/app/schedule/actions", () => ({ createShiftAction: vi.fn() }));

const locator = { version: 1, weekStart: "2030-10-07", gapKey: "gap", locationId: "real-location", date: "2030-10-07", startTime: "20:00", endTime: "24:00", target: "POSITION", positionId: "real-position", reported: { missingStaff: 2, requiresLead: true, positions: [{ positionId: "real-position", missing: 1 }] } };
const selected = { locator, employeeId: "real-employee", employeeName: "Taylor Rivera", locationName: "Main Office", positionName: "Customer Support", isDesignatedLead: true };
beforeEach(() => { state.read.mockReset().mockResolvedValue(selected); state.decode.mockReset().mockReturnValue({ locator }); });

it("shows and submits only the server-reviewed assignment, ignoring forged query prefills", async () => {
  const html = renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve({ review: "retained-review", employeeId: "FORGED", positionId: "FORGED", locationId: "FORGED", start: "00:00" }) }));
  expect(state.read).toHaveBeenCalledWith("retained-review", state.proof);
  expect(html).toContain('name="coverageRepairReview" value="retained-review"');
  for (const [name, value] of Object.entries({ employeeId: "real-employee", locationId: "real-location", positionId: "real-position", startTime: "20:00", endTime: "24:00", isDesignatedLead: "on" })) expect(html).toContain(`name="${name}" value="${value}"`);
  expect(html).not.toContain("FORGED");
  expect(html).toContain("Taylor Rivera");
  expect(html).toContain("Customer Support");
  expect(html).toContain("Anything else this shift still needs stays open on the schedule.");
});
it("explains the midnight boundary without changing canonical 24:00", async () => {
  // Times and dates are kept whole with no-break spaces; compare the words.
  const html = renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve({ review: "retained-review" }) })).replace(/\u00a0/g, " ");
  expect(html).toContain("8:00 PM – 12:00 AM");
  expect(html).toContain("Ends Tue, Oct 8");
  expect(html).toContain('name="endTime" value="24:00"');
});
it("retains a non-Lead staffing repair with no inferred position or Lead flag", async () => {
  state.read.mockResolvedValue({ ...selected, locator: { ...locator, target: "STAFFING", positionId: undefined }, positionName: undefined, isDesignatedLead: false });
  const html = renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve({ review: "retained-review", lead: "1", positionId: "FORGED" }) }));
  expect(html).toContain('name="positionId" value=""');
  expect(html).not.toContain('name="isDesignatedLead"');
  expect(html).toContain("Not needed");
  expect(html).toContain("This fills the staffing requirement.");
});
it("a stale selection removes the save action and keeps a trusted refresh path", async () => {
  state.read.mockRejectedValue(new CoverageRepairConflictError());
  const html = renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve({ review: "stale-review" }) }));
  expect(html).toContain("Coverage changed");
  expect(html).toContain("Open current review");
  expect(html).toContain("refresh=1");
  expect(html).not.toContain("Save replacement");
  expect(html).not.toContain('name="coverageRepairReview"');
});
it("an untrusted malformed review falls back to schedule with no submission form", async () => {
  state.read.mockRejectedValue(new CoverageRepairConflictError()); state.decode.mockImplementation(() => { throw new CoverageRepairConflictError(); });
  const html = renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve({ review: "invalid" }) }));
  expect(html).toContain('href="/app/schedule"');
  expect(html).not.toContain("<form");
});
it("an unavailable data source remains an error rather than a stale or fabricated selection", async () => {
  state.read.mockRejectedValue(new Error("unavailable source"));
  await expect(NewShiftPage({ searchParams: Promise.resolve({ review: "retained-review" }) })).rejects.toThrow("unavailable source");
});

// Server composition tests; actual mounted finite-body behavior is checked separately.
const operationalPageFixture=vi.hoisted(()=>({denied:false}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({readOperationalAuthority:async()=>({state:'ready',scope:{mode:'COMPANY',locationIds:[]}}),withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));

beforeEach(()=>{operationalPageFixture.denied=false;});

it('withholds protected body and commands after current company-scope denial',async()=>{operationalPageFixture.denied=true;const {default:GuardedPage}=await import('./page');const html=renderToStaticMarkup(await GuardedPage({searchParams:Promise.resolve({review:'retained-review'})}));expect(html).toContain('current company-wide management access');expect(state.read).not.toHaveBeenCalled();expect(html).not.toContain('Taylor Rivera');});

vi.mock('@/lib/company-access/operational-read.server',()=>({readOperationalShiftEditor:async()=>{throw Error('Unexpected scoped read in Company fixture');}}));
