import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, rs } from '@rstest/core';
import { CoverageRepairConflictError } from "@/lib/scheduling/coverage-repair";
import NewShiftPage from "./page";

const state = rs.hoisted(() => ({ read: rs.fn(), decode: rs.fn(), proof: { employee: { id: "manager" } } }));
rs.mock("next/link", () => ({ default: ({ children, ...props }: ComponentProps<"a">) => createElement("a", props, children) }));
rs.mock("@/lib/auth/permissions", () => ({ MANAGER_ROLES: ["MANAGER", "OWNER"], requireRoles: rs.fn() }));
rs.mock("@/lib/auth/session", () => ({ requireSessionMutationProof: async () => state.proof }));
rs.mock("@/lib/data/coverage-repair.server", () => ({ readCoverageRepairSelection: state.read, decodeCoverageRepairReview: state.decode }));
rs.mock("@/lib/data/employees", () => ({ listEmployees: rs.fn(), listLocations: rs.fn() }));
rs.mock("@/lib/data/workspaces", () => ({ getWorkspace: rs.fn() }));
rs.mock("@/lib/data/positions", () => ({ listPositions: rs.fn() }));
rs.mock("@/app/app/schedule/actions", () => ({ createShiftAction: rs.fn() }));

const locator = { version: 1, weekStart: "2030-10-07", gapKey: "gap", locationId: "real-location", date: "2030-10-07", startTime: "20:00", endTime: "24:00", target: "POSITION", positionId: "real-position", reported: { missingStaff: 2, requiresLead: true, positions: [{ positionId: "real-position", missing: 1 }] } };
const selected = { locator, employeeId: "real-employee", employeeName: "Taylor Rivera", locationName: "Main Office", positionName: "Customer Support", isDesignatedLead: true };
beforeEach(() => { state.read.mockReset().mockResolvedValue(selected); state.decode.mockReset().mockReturnValue({ locator }); });

it("a published week: the Publish change button is the approval and says who will see it (Phase 2, Nov 22, 2026)", async () => {
  state.read.mockResolvedValue({ ...selected, publication: "PUBLISHED" });
  const html = renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve({ review: "retained-review" }) }));
  expect(html).toContain('<input type="hidden" name="publicationConsent" value="on"/>');
  expect(html).toContain("Publish change");
  expect(html).toContain("Taylor will see this shift in their schedule. We’ll also send them a notification.");
  expect(html).not.toContain('type="checkbox"');
  expect(html).not.toContain("Save draft");
});
it("shows and submits only the server-reviewed assignment, ignoring forged query prefills", async () => {
  const html = renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve({ review: "retained-review", employeeId: "FORGED", positionId: "FORGED", locationId: "FORGED", start: "00:00" }) }));
  expect(state.read).toHaveBeenCalledWith("retained-review", state.proof);
  expect(html).toContain('name="coverageRepairReview" value="retained-review"');
  for (const [name, value] of Object.entries({ employeeId: "real-employee", locationId: "real-location", positionId: "real-position", startTime: "20:00", endTime: "24:00", isDesignatedLead: "on" })) expect(html).toContain(`name="${name}" value="${value}"`);
  expect(html).not.toContain("FORGED");
  expect(html).toContain("Taylor Rivera");
  expect(html).toContain("Customer Support");
  expect(html).toContain("Fills the Customer Support need");
  expect(html).toContain("Open shift");
});
it("explains the midnight boundary without changing canonical 24:00", async () => {
  // Times and dates are kept whole with no-break spaces; compare the words.
  const html = renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve({ review: "retained-review" }) })).replace(/\u00a0/g, " ");
  expect(html.replace(/<[^>]+>/g, "").replace(/[\u2009\u202f]/g, " ")).toMatch(/8:00 ?PM – 12:00 ?AM/);
  expect(html.replace(/\u00a0/g, " ")).toContain("Ends Tue, Oct 8");
  expect(html).toContain('name="endTime" value="24:00"');
});
it("retains a non-Lead staffing repair with no inferred position or Lead flag", async () => {
  state.read.mockResolvedValue({ ...selected, locator: { ...locator, target: "STAFFING", positionId: undefined }, positionName: undefined, isDesignatedLead: false });
  const html = renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve({ review: "retained-review", lead: "1", positionId: "FORGED" }) }));
  expect(html).toContain('name="positionId" value=""');
  expect(html).not.toContain('name="isDesignatedLead"');
  expect(html).not.toContain("Shift lead");
  expect(html).toContain("Fills the staffing need");
});
it("a stale selection removes the save action and keeps a trusted refresh path", async () => {
  state.read.mockRejectedValue(new CoverageRepairConflictError());
  const html = renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve({ review: "stale-review" }) }));
  expect(html).toContain("Coverage changed");
  expect(html).toContain("Open current review");
  expect(html).toContain("refresh=1");
  expect(html).not.toContain("Publish change");
  expect(html).not.toContain("Save draft");
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
const operationalPageFixture=rs.hoisted(()=>({denied:false,publishDenied:false}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({assertOperationalAccess:async()=>({scope:{mode:'COMPANY'}}),isOperationalAuthorizationError:(error:unknown)=>error instanceof Error&&error.message==='operational_authorization',readOperationalAuthority:async()=>({state:'ready',scope:{mode:'COMPANY',locationIds:[]}}),withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));

rs.mock('@/lib/workforce/authority.server',()=>({assertWorkforcePermission:async()=>{if(operationalPageFixture.publishDenied)throw new Error('operational_authorization');}}));

beforeEach(()=>{operationalPageFixture.denied=false;operationalPageFixture.publishDenied=false;});

it('withholds protected body and commands after current company-scope denial',async()=>{operationalPageFixture.denied=true;const {default:GuardedPage}=await import('./page');const html=renderToStaticMarkup(await GuardedPage({searchParams:Promise.resolve({review:'retained-review'})}));expect(html).toContain('Company-wide access needed');expect(state.read).not.toHaveBeenCalled();expect(html).not.toContain('Taylor Rivera');});

rs.mock('@/lib/company-access/operational-read.server',()=>({readOperationalShiftEditor:async()=>{throw Error('Unexpected scoped read in Company fixture');}}));

// QA S-06 (Nov 21, 2026): a Manager without Publish schedules was offered the publish acknowledgement and then refused.
it('a published week without the publish permission says so up front, with no acknowledgement and no save',async()=>{
  operationalPageFixture.publishDenied=true;
  state.read.mockResolvedValue({ ...selected, publication: "PUBLISHED" });
  const html=renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve({ review: "retained-review" }) }));
  expect(html).toContain('Publishing permission needed');
  expect(html).toContain('Ask the Owner to make this change, or to let you publish.');
  expect(html).not.toContain('publicationConsent');
  expect(html).not.toContain('Publish change');
  expect(html).not.toContain('<form');
  expect(html).toContain('Back to coverage');
});
it('a draft week needs no publish permission and keeps its save',async()=>{
  operationalPageFixture.publishDenied=true;
  const html=renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve({ review: "retained-review" }) }));
  expect(html).toContain('Save draft');
  expect(html).toContain('Added as a draft.');
  expect(html).not.toContain('publicationConsent');
  expect(html).not.toContain('Publishing permission needed');
});
