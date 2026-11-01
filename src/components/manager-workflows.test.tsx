import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireSession } from "@/lib/auth/session";
import { getShiftValidationContext } from "@/lib/data/schedules";
import CoverageSuggestionsPage from "../app/app/schedule/coverage/page";
import { ManagerTimeOff } from "./manager-time-off";
import { ManagerAvailability } from "./manager-availability";
import { ManagerShiftRequests } from "./manager-shift-requests";
import { listPendingTimeOffRequests, listTeamTimeOffRequests } from "@/lib/data/requests";
import { listAvailabilitySubmissionStatuses } from "@/lib/data/availability-submissions";
import { listManagementCoverage, listManagerPendingExchanges, listTeamExchangeActivity } from "@/lib/data/exchanges";
import {readShiftChangeAvailability} from '@/lib/data/shift-changes';
import { listPendingCallouts } from "@/lib/data/callouts";

const access=vi.hoisted(()=>({denied:false}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>access.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),coverage:{kind:'COMPANY',locationIds:[]},authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn(),requireSessionMutationProof:async()=>({employee:{id:"reviewer",role:"MANAGER"},sessionTokenHash:"a".repeat(64)}) }));
vi.mock("@/lib/auth/permissions", () => import("../lib/auth/permissions"));
vi.mock("@/lib/scheduling/periods", () => import("../lib/scheduling/periods"));
vi.mock("@/lib/date-utils", () => import("../lib/date-utils"));
vi.mock("@/components/page-header", () => import("./page-header"));
vi.mock("@/components/status-pill", () => import("./status-pill"));
vi.mock("@/lib/data/schedule-health", () => ({ listEmployeeHourTargets: vi.fn(async () => []) }));
vi.mock("@/lib/data/hour-fairness", () => ({ listHourFairness: vi.fn(async () => []) }));
vi.mock("@/lib/data/schedules", () => ({ getShiftValidationContext: vi.fn() }));
vi.mock("@/lib/scheduling/coverage-ranking", () => import("../lib/scheduling/coverage-ranking"));
vi.mock("@/lib/scheduling/validate-shift", () => import("../lib/scheduling/validate-shift"));
vi.mock("@/lib/data/requests", () => ({ listPendingTimeOffRequests: vi.fn(async () => []), listTeamTimeOffRequests: vi.fn(async () => []) }));
vi.mock("@/lib/data/availability-submissions", () => ({ listAvailabilitySubmissionStatuses: vi.fn(async () => [
  {employeeId:"missing",employeeName:"Missing Person",submitted:false,windowCount:0,state:"NOT_SUBMITTED"},
  {employeeId:"unavailable",employeeName:"Unavailable Person",submitted:true,windowCount:0,state:"SUBMITTED_UNAVAILABLE"},
  {employeeId:"available",employeeName:"Available Person",submitted:true,windowCount:1,state:"SUBMITTED"},
]) }));
vi.mock("@/lib/data/employees", () => ({ listEmployees: async () => [{ positionIds: [], id:"available",firstName:"Sam",lastName:"Rivera",role:"EMPLOYEE",active:true,eligibleLocationIds:["loc"],primaryLocationId:"loc"}], listLocations: async () => [{id:"loc",shortName:"FUEL – 2"}] }));
vi.mock("@/lib/data/availability", () => ({ listTeamAvailabilityWindows: async () => [
  {id:"window",employeeId:"available",dayOfWeek:1,startTime:"06:00",endTime:"14:00"},
  {id:"seeded",employeeId:"missing",dayOfWeek:1,startTime:"07:00",endTime:"15:00"},
] }));
vi.mock("@/lib/data/week-settings", () => ({ getUpcomingAvailabilityWeek: async () => null, getWeekSettings: async () => null }));
vi.mock("@/lib/data/exchanges", () => ({ listManagerPendingExchanges: vi.fn(async () => []), listManagementCoverage: vi.fn(async () => []), listTeamExchangeActivity: vi.fn(async () => []) }));
vi.mock("@/lib/data/callouts", () => ({ listPendingCallouts: vi.fn(async () => []), listTeamCalloutHistory: vi.fn(async () => []) }));
vi.mock("@/app/app/requests/actions", () => ({ reviewTimeOffAction: vi.fn() }));
vi.mock("@/lib/data/workspaces", () => ({ getWorkspace: async () => ({ timeZone: "America/Puerto_Rico" }) }));
vi.mock("@/app/app/exchange/actions", () => ({ reviewExchangeAction: vi.fn(),shiftChangeAction:vi.fn(),reconcileShiftChangeAction:async()=>null }));
vi.mock("@/app/app/exchange/callout/actions", () => ({ reviewCalloutAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter:()=>({refresh:()=>{}}), redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("next/link", () => ({ useLinkStatus: () => ({ pending: false }), default: ({href,children,prefetch,...props}: ComponentProps<"a"> & { prefetch?: boolean }) => { void prefetch; return createElement("a",{href,...props},children); } }));

beforeEach(() => { access.denied=false;vi.clearAllMocks(); vi.mocked(requireSession).mockResolvedValue({id:"reviewer",firstName:"Alex",lastName:"Rivera",role:"MANAGER",primaryLocationId:"loc"}); });

it.each(["EMPLOYEE","LEAD"] as const)("denies %s direct management review before reading team data", async role => {
  vi.mocked(requireSession).mockResolvedValue({id:"viewer",firstName:"Sam",lastName:"Cruz",role,primaryLocationId:"loc"});
  for (const page of [() => ManagerTimeOff({}), () => ManagerAvailability({ timeZone:"America/Puerto_Rico",currentWeek:"2026-09-28"}), () => ManagerShiftRequests({ timeZone:"America/Puerto_Rico",}), () => CoverageSuggestionsPage({searchParams:Promise.resolve({})})]) await expect(page()).rejects.toThrow("redirect:/app");
  expect(listPendingTimeOffRequests).not.toHaveBeenCalled(); expect(listAvailabilitySubmissionStatuses).not.toHaveBeenCalled(); expect(listManagerPendingExchanges).not.toHaveBeenCalled();
});
it.each(["OWNER","MANAGER"] as const)("gives %s operational Time Off views and read-only history", async role => {
  vi.mocked(requireSession).mockResolvedValue({id:"reviewer",firstName:"Alex",lastName:"Rivera",role,primaryLocationId:"loc"});
  const pending = renderToStaticMarkup(await ManagerTimeOff({tab:"team"}));
  expect(listPendingTimeOffRequests).toHaveBeenCalledOnce();
  expect(pending).toContain("Waiting"); expect(pending).not.toMatch(/New Request|My Requests|startDate/);
  const approved = renderToStaticMarkup(await ManagerTimeOff({tab:"approved"}));
  expect(listTeamTimeOffRequests).toHaveBeenCalledWith("APPROVED"); expect(approved).not.toContain("<form");
  await ManagerTimeOff({tab:"declined"}); expect(listTeamTimeOffRequests).toHaveBeenCalledWith("DENIED");
});
it("distinguishes missing, intentionally unavailable and submitted windows without treating seeded hours as a submission", async () => {
  // Times are kept whole with no-break spaces; compare the words.
  const html = renderToStaticMarkup(await ManagerAvailability({ timeZone:"America/Puerto_Rico",currentWeek:"2026-09-28"})).replace(/\u00a0/g, " ");
  // Quiet (v4): Not sent and Sent carry the counts; seeded hours on someone who hasn't sent don't count or show.
  expect(html).toContain(">Not sent · 1</button>"); expect(html).toContain(">Sent · 2</button>");
  expect(html).toContain("2 of 3 sent");
  expect(html).toContain('aria-label="Missing Person, No primary location, not sent"'); expect(html).not.toContain("7:00 AM");
  // A link to someone who has sent opens the Sent list with their hours.
  const sent = renderToStaticMarkup(await ManagerAvailability({ timeZone:"America/Puerto_Rico",currentWeek:"2026-09-28",employeeId:"available"})).replace(/\u00a0/g, " ");
  expect(sent).toContain("6:00 AM – 2:00 PM"); expect(sent).toContain("Unavailable all week"); expect(sent).not.toContain("7:00 AM");
});
it("keeps management pending, coverage and outcome data separate", async () => {
  const pending = renderToStaticMarkup(await ManagerShiftRequests({ timeZone:"America/Puerto_Rico",tab:"requests"}));
  expect(listManagerPendingExchanges).toHaveBeenCalledOnce(); expect(listPendingCallouts).toHaveBeenCalledOnce(); expect(listManagementCoverage).not.toHaveBeenCalled(); expect(pending).not.toMatch(/Offer shift|Trade shift|Accept Swap/);
  await ManagerShiftRequests({ timeZone:"America/Puerto_Rico",tab:"coverage"}); expect(listManagementCoverage).toHaveBeenCalledOnce(); expect(listTeamExchangeActivity).not.toHaveBeenCalled();
  await ManagerShiftRequests({ timeZone:"America/Puerto_Rico",tab:"activity"}); expect(listTeamExchangeActivity).toHaveBeenCalledWith(true);
});

it("handles an invalid management week without reading or editing personal availability", async () => {
  const html = renderToStaticMarkup(await ManagerAvailability({ timeZone:"America/Puerto_Rico",week:"2026-99-99",currentWeek:"2026-09-28"}));
  expect(html).toContain("That week isn’t valid, so this is the upcoming week.");
  expect(listAvailabilitySubmissionStatuses).toHaveBeenCalledWith("2026-09-28");
});

it("a Lead-gap suggestion URL rejects otherwise eligible Employees using the shared engine", async () => {
 vi.mocked(getShiftValidationContext).mockResolvedValue({ position: undefined, workspace: {id:"test-workspace",active:true,timeZone:"America/Puerto_Rico"}, location: {id:"loc",workspaceId:"test-workspace",active:true},  employee: { positionIds: [],  active: true, role: "EMPLOYEE", eligibleLocationIds: ["loc"], targetWeeklyHours: 24, maximumWeeklyHours: 40 }, existingShifts: [], availability: [{ dayOfWeek: 1, startTime: "06:00", endTime: "18:00" }], weeklyAvailability: [], availabilityExceptions: [], approvedTimeOff: [], existingWeeklyMinutes: 0 });
 const params = { week: "2026-10-05", date: "2026-10-05", locationId: "loc", start: "08:00", end: "16:00" };
 const general = renderToStaticMarkup(await CoverageSuggestionsPage({ searchParams: Promise.resolve(params) }));
 expect(general).toContain("1\u00a0person");
 const leadOnly = renderToStaticMarkup(await CoverageSuggestionsPage({ searchParams: Promise.resolve({ ...params, lead: "1" }) }));
 expect(leadOnly).toContain("0\u00a0people"); expect(leadOnly).toContain("No one is free for this shift");
});

vi.mock("@/lib/business-time",()=>import("../lib/business-time"));
it('unknown mandatory rules never expose a generic management Approve',async()=>{
 vi.mocked(listManagerPendingExchanges).mockResolvedValue([{id:'unknown',requestRevision:2,actionable:true,kind:'COVERAGE',status:'MANAGER_PENDING',requestedByEmployeeId:'e1',requestedByName:'Fictional Requester',requestedByRole:'EMPLOYEE',targetEmployeeId:'e2',createdAt:'2026-10-03T00:00:00Z',sourceShift:{id:'s',scheduleId:'sched',employeeId:'e1',employeeName:'Fictional',locationId:'loc',locationName:'North',weekStart:'2026-10-05',date:'2026-10-05',startTime:'08:00',endTime:'12:00'}}]);
 const html=renderToStaticMarkup(await ManagerShiftRequests({timeZone:'America/Puerto_Rico'}));expect(html).not.toContain('>Approve<');expect(html).toContain('Needs Owner rule review');
});

vi.mock('@/lib/data/shift-changes',()=>({readShiftChangeAvailability:vi.fn(async()=>({allowed:false,notice:'Needs Owner rule review'}))}));
vi.mock('@/lib/data/shift-change-views',()=>({readShiftChangeHistoryView:async()=>[]}));

it('missing current revision never fabricates a mutation identity',async()=>{
 vi.mocked(listPendingCallouts).mockResolvedValue([{id:'missing-revision',shiftId:'s',employeeId:'e1',employeeName:'Fictional',locationId:'loc',locationName:'North',weekStart:'2026-10-05',date:'2026-10-05',startTime:'08:00',endTime:'12:00',reasonCode:'OTHER',status:'PENDING',createdAt:'2026-10-03T00:00:00Z'}]);
 const result=renderToStaticMarkup(await ManagerShiftRequests({timeZone:'America/Puerto_Rico'}));expect(result).not.toContain('name="expectedRevision" value="0"');expect(result).not.toContain('value="DECLINE_CALLOUT"');expect(result).toContain('This request changed. Reload to see the latest.');
});

it('H12 actionable manager exception explains its reason outside the action grid',async()=>{
 vi.mocked(listPendingCallouts).mockResolvedValue([]);
 vi.mocked(listManagerPendingExchanges).mockResolvedValue([{id:'reason',requestRevision:2,kind:'COVERAGE',status:'MANAGER_PENDING',requestedByEmployeeId:'e1',requestedByName:'Fictional Requester',requestedByRole:'EMPLOYEE',targetEmployeeId:'e2',createdAt:'2026-10-03T00:00:00Z',sourceShift:{id:'s',scheduleId:'sched',employeeId:'e1',employeeName:'Fictional',locationId:'loc',locationName:'North',weekStart:'2026-10-05',date:'2026-10-05',startTime:'08:00',endTime:'12:00'}}]);
 vi.mocked(readShiftChangeAvailability).mockResolvedValueOnce({allowed:true,notice:'Projected scheduled overtime needs manager review.'});
 const html=renderToStaticMarkup(await ManagerShiftRequests({timeZone:'America/Puerto_Rico'}));
 expect(html).toContain('>Approve<');expect(html).toContain('Projected scheduled overtime needs manager review.');
 expect(html.indexOf('Projected scheduled overtime')).toBeLessThan(html.indexOf('class="q-acts"'));
 expect(html).not.toMatch(/operationalProfile|weeklyMinutes|classification/);
});

it("names who decided a request and when, once the read includes it (Codex C1), and stays quiet without it", async () => {
  const base = { id: "r1", employeeId: "e1", employeeName: "Fictional Person", startDate: "2026-10-29", endDate: "2026-10-30", status: "APPROVED", createdAt: "2026-10-01T15:00:00.000Z" };
  vi.mocked(listTeamTimeOffRequests).mockResolvedValueOnce([{ ...base, reviewerName: "Fictional Manager", reviewedAt: "2026-10-02T15:00:00.000Z" }] as never);
  const decided = renderToStaticMarkup(await ManagerTimeOff({ tab: "approved" })).replace(/\u00a0/g, " ");
  expect(decided).toContain("Approved by Fictional Manager · Oct 2");
  vi.mocked(listTeamTimeOffRequests).mockResolvedValueOnce([base] as never);
  const older = renderToStaticMarkup(await ManagerTimeOff({ tab: "approved" }));
  expect(older).not.toContain("Approved by");
});

it("Back to Inbox keeps the Inbox's selected item, and ignores anything that isn't an item id (IS-P4-11)", async () => {
  const pending = { id: "req-1", employeeId: "e1", employeeName: "Fictional Person", startDate: "2026-10-29", endDate: "2026-10-30", status: "PENDING", createdAt: "2026-10-01T15:00:00.000Z" };
  vi.mocked(listPendingTimeOffRequests).mockResolvedValueOnce([pending] as never);
  const kept = renderToStaticMarkup(await ManagerTimeOff({ tab: "pending", requestId: "req-1", filter: "requests", item: "TIME_OFF:req-1" }));
  expect(kept).toContain('href="/app/inbox?filter=requests&amp;item=TIME_OFF%3Areq-1"');
  vi.mocked(listPendingTimeOffRequests).mockResolvedValueOnce([pending] as never);
  const hostile = renderToStaticMarkup(await ManagerTimeOff({ tab: "pending", requestId: "req-1", filter: "requests", item: "javascript:alert(1)" }));
  expect(hostile).toContain('href="/app/inbox?filter=requests"');
});
it('honors company-read denial before team requests, availability and activity loaders (presentation boundary)',async()=>{access.denied=true;for(const load of [()=>ManagerTimeOff({}),()=>ManagerAvailability({timeZone:'America/Puerto_Rico',currentWeek:'2026-10-12'}),()=>ManagerShiftRequests({timeZone:'America/Puerto_Rico'}),()=>CoverageSuggestionsPage({searchParams:Promise.resolve({week:'2026-10-12',date:'2026-10-12',locationId:'loc',start:'08:00',end:'16:00'})})]){const html=renderToStaticMarkup(await load());expect(html).toContain('Return to Home');expect(html).toContain('current company-wide management access');}expect(listPendingTimeOffRequests).not.toHaveBeenCalled();expect(listAvailabilitySubmissionStatuses).not.toHaveBeenCalled();expect(listManagerPendingExchanges).not.toHaveBeenCalled();expect(getShiftValidationContext).not.toHaveBeenCalled();});

// This suite checks server-page composition. Mounted lifetime behavior has its own browser harness.
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));

describe("management sees every shift in full before deciding (Codex review, Oct 23)", () => {
  const shift = (over: Record<string, unknown>) => ({ id: "s", scheduleId: "sched", employeeId: "e1", employeeName: "Fictional Ana", locationId: "north", locationName: "North Office", weekStart: "2026-10-05", date: "2026-10-05", startTime: "08:00", endTime: "12:00", ...over });
  const plain = (html: string) => html.replace(/ /g, " ");
  it("a swap shows both employees, full dates, start and end times and locations ahead of Approve", async () => {
    vi.mocked(listPendingCallouts).mockResolvedValue([]);
    vi.mocked(listManagerPendingExchanges).mockResolvedValue([{ id: "swap", requestRevision: 3, actionable: true, kind: "SWAP", status: "MANAGER_PENDING", requestedByEmployeeId: "e1", requestedByName: "Fictional Ana", requestedByRole: "EMPLOYEE", targetEmployeeId: "e2", targetEmployeeName: "Fictional Ben", createdAt: "2026-10-03T00:00:00Z",
      sourceShift: shift({}) as never, targetShift: shift({ id: "t", employeeId: "e2", employeeName: "Fictional Ben", locationId: "south", locationName: "South Office", date: "2026-10-08", startTime: "14:00", endTime: "18:00" }) as never }]);
    vi.mocked(readShiftChangeAvailability).mockResolvedValueOnce({ allowed: true } as never);
    const html = plain(renderToStaticMarkup(await ManagerShiftRequests({ timeZone: "America/Puerto_Rico" })));
    const facts = html.slice(html.indexOf('class="q-facts"'), html.indexOf('class="q-acts"'));
    for (const text of ["Fictional Ana’s shift", "Mon, Oct 5, 2026", "8:00 AM – 12:00 PM", "North Office", "Fictional Ben’s shift", "Thu, Oct 8, 2026", "2:00 PM – 6:00 PM", "South Office"]) expect(facts).toContain(text);
    expect(html).toContain(">Approve<");
    expect(html.indexOf("South Office")).toBeLessThan(html.indexOf(">Approve<"));
    // Still a revision-bound decision on the same request.
    expect(html).toContain('name="expectedRevision" value="3"');
  });
  it("coverage shows the affected shift and who picked it up, or that no one has", async () => {
    vi.mocked(listPendingCallouts).mockResolvedValue([]);
    const cover = { id: "cover", requestRevision: 2, actionable: true, kind: "COVERAGE" as const, status: "MANAGER_PENDING" as const, requestedByEmployeeId: "e1", requestedByName: "Fictional Ana", requestedByRole: "EMPLOYEE" as const, createdAt: "2026-10-03T00:00:00Z", sourceShift: shift({ endTime: "02:00", startTime: "18:00" }) as never };
    vi.mocked(listManagerPendingExchanges).mockResolvedValue([{ ...cover, targetEmployeeId: "e2", targetEmployeeName: "Fictional Ben" }]);
    const named = plain(renderToStaticMarkup(await ManagerShiftRequests({ timeZone: "America/Puerto_Rico" })));
    expect(named).toContain("Mon, Oct 5, 2026"); expect(named).toContain("6:00 PM – 2:00 AM, ends Tue, Oct 6, 2026"); expect(named).toContain("North Office"); expect(named).toContain("Picked up by Fictional Ben");
    vi.mocked(listManagerPendingExchanges).mockResolvedValue([cover]);
    expect(plain(renderToStaticMarkup(await ManagerShiftRequests({ timeZone: "America/Puerto_Rico" })))).toContain("No one has picked it up yet");
  });
  it("an “Unable to work” report shows the affected shift with its reason and note", async () => {
    vi.mocked(listManagerPendingExchanges).mockResolvedValue([]);
    vi.mocked(listPendingCallouts).mockResolvedValue([{ id: "callout", requestRevision: 4, shiftId: "s", employeeId: "e1", employeeName: "Fictional Ana", locationId: "north", locationName: "North Office", weekStart: "2026-10-05", date: "2026-10-05", startTime: "08:00", endTime: "12:00", reasonCode: "TRANSPORTATION", reasonNote: "Fictional bus strike", status: "PENDING", createdAt: "2026-10-03T00:00:00Z" }]);
    const html = plain(renderToStaticMarkup(await ManagerShiftRequests({ timeZone: "America/Puerto_Rico" })));
    const facts = html.slice(html.indexOf('class="q-facts"'));
    for (const text of ["Fictional Ana’s shift", "Mon, Oct 5, 2026", "8:00 AM – 12:00 PM", "North Office", "Transportation issue", "Fictional bus strike"]) expect(facts).toContain(text);
  });
  it("a deep-linked request opens with its shifts showing", async () => {
    vi.mocked(listPendingCallouts).mockResolvedValue([]);
    vi.mocked(listManagerPendingExchanges).mockResolvedValue([{ id: "linked", requestRevision: 1, kind: "COVERAGE", status: "MANAGER_PENDING", requestedByEmployeeId: "e1", requestedByName: "Fictional Ana", requestedByRole: "EMPLOYEE", createdAt: "2026-10-03T00:00:00Z", sourceShift: shift({}) as never }]);
    expect(renderToStaticMarkup(await ManagerShiftRequests({ timeZone: "America/Puerto_Rico", requestId: "linked" }))).toMatch(/<details class="q-details q-request__details" open="">/);
  });
});
