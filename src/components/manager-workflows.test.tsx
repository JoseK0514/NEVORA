import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
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
vi.mock("@/app/app/exchange/actions", () => ({ reviewExchangeAction: vi.fn(),shiftChangeAction:vi.fn(),reconcileShiftChangeAction:async()=>null }));
vi.mock("@/app/app/exchange/callout/actions", () => ({ reviewCalloutAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter:()=>({refresh:()=>{}}), redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("next/link", () => ({ default: ({href,children,...props}: ComponentProps<"a">) => createElement("a",{href,...props},children) }));

beforeEach(() => { vi.clearAllMocks(); vi.mocked(requireSession).mockResolvedValue({id:"reviewer",firstName:"Alex",lastName:"Rivera",role:"MANAGER",primaryLocationId:"loc"}); });

it.each(["EMPLOYEE","LEAD"] as const)("denies %s direct management review before reading team data", async role => {
  vi.mocked(requireSession).mockResolvedValue({id:"viewer",firstName:"Sam",lastName:"Cruz",role,primaryLocationId:"loc"});
  for (const page of [() => ManagerTimeOff({}), () => ManagerAvailability({ timeZone:"America/Puerto_Rico",currentWeek:"2026-09-28"}), () => ManagerShiftRequests({ timeZone:"America/Puerto_Rico",}), () => CoverageSuggestionsPage({searchParams:Promise.resolve({})})]) await expect(page()).rejects.toThrow("redirect:/app");
  expect(listPendingTimeOffRequests).not.toHaveBeenCalled(); expect(listAvailabilitySubmissionStatuses).not.toHaveBeenCalled(); expect(listManagerPendingExchanges).not.toHaveBeenCalled();
});
it.each(["OWNER","MANAGER"] as const)("gives %s operational Time Off views and read-only history", async role => {
  vi.mocked(requireSession).mockResolvedValue({id:"reviewer",firstName:"Alex",lastName:"Rivera",role,primaryLocationId:"loc"});
  const pending = renderToStaticMarkup(await ManagerTimeOff({tab:"team"}));
  expect(listPendingTimeOffRequests).toHaveBeenCalledOnce();
  expect(pending).toContain("Pending"); expect(pending).not.toMatch(/New Request|My Requests|startDate/);
  const approved = renderToStaticMarkup(await ManagerTimeOff({tab:"approved"}));
  expect(listTeamTimeOffRequests).toHaveBeenCalledWith("APPROVED"); expect(approved).not.toContain("<form");
  await ManagerTimeOff({tab:"declined"}); expect(listTeamTimeOffRequests).toHaveBeenCalledWith("DENIED");
});
it("distinguishes missing, intentionally unavailable and submitted windows without treating seeded hours as a submission", async () => {
  const html = renderToStaticMarkup(await ManagerAvailability({ timeZone:"America/Puerto_Rico",currentWeek:"2026-09-28"}));
  expect(html).toContain("1 missing"); expect(html).toContain("Unavailable all week"); expect(html).toContain("Not submitted"); expect(html).toContain("FUEL – 2"); expect(html).toContain("6:00 AM – 2:00 PM"); expect(html).not.toContain("7:00 AM"); expect(html).not.toContain("<form"); expect(html).not.toContain("checkbox");
});
it("keeps management pending, coverage and outcome data separate", async () => {
  const pending = renderToStaticMarkup(await ManagerShiftRequests({ timeZone:"America/Puerto_Rico",tab:"requests"}));
  expect(listManagerPendingExchanges).toHaveBeenCalledOnce(); expect(listPendingCallouts).toHaveBeenCalledOnce(); expect(listManagementCoverage).not.toHaveBeenCalled(); expect(pending).not.toMatch(/Offer Shift|Trade Shift|Accept Swap/);
  await ManagerShiftRequests({ timeZone:"America/Puerto_Rico",tab:"coverage"}); expect(listManagementCoverage).toHaveBeenCalledOnce(); expect(listTeamExchangeActivity).not.toHaveBeenCalled();
  await ManagerShiftRequests({ timeZone:"America/Puerto_Rico",tab:"activity"}); expect(listTeamExchangeActivity).toHaveBeenCalledWith(true);
});

it("handles an invalid management week without reading or editing personal availability", async () => {
  const html = renderToStaticMarkup(await ManagerAvailability({ timeZone:"America/Puerto_Rico",week:"2026-99-99",currentWeek:"2026-09-28"}));
  expect(html).toContain("That schedule week is not valid");
  expect(listAvailabilitySubmissionStatuses).toHaveBeenCalledWith("2026-09-28");
});

it("a Lead-gap suggestion URL rejects otherwise eligible Employees using the shared engine", async () => {
 vi.mocked(getShiftValidationContext).mockResolvedValue({ position: undefined, workspace: {id:"test-workspace",active:true,timeZone:"America/Puerto_Rico"}, location: {id:"loc",workspaceId:"test-workspace",active:true},  employee: { positionIds: [],  active: true, role: "EMPLOYEE", eligibleLocationIds: ["loc"], targetWeeklyHours: 24, maximumWeeklyHours: 40 }, existingShifts: [], availability: [{ dayOfWeek: 1, startTime: "06:00", endTime: "18:00" }], weeklyAvailability: [], availabilityExceptions: [], approvedTimeOff: [], existingWeeklyMinutes: 0 });
 const params = { week: "2026-10-05", date: "2026-10-05", locationId: "loc", start: "08:00", end: "16:00" };
 const general = renderToStaticMarkup(await CoverageSuggestionsPage({ searchParams: Promise.resolve(params) }));
 expect(general).toContain("1 eligible");
 const leadOnly = renderToStaticMarkup(await CoverageSuggestionsPage({ searchParams: Promise.resolve({ ...params, lead: "1" }) }));
 expect(leadOnly).toContain("0 eligible"); expect(leadOnly).toContain("No eligible employees found.");
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
 const result=renderToStaticMarkup(await ManagerShiftRequests({timeZone:'America/Puerto_Rico'}));expect(result).not.toContain('name="expectedRevision" value="0"');expect(result).not.toContain('value="DECLINE_CALLOUT"');expect(result).toContain('Reload the current request revision');
});

it('H12 actionable manager exception explains its reason outside the action grid',async()=>{
 vi.mocked(listPendingCallouts).mockResolvedValue([]);
 vi.mocked(listManagerPendingExchanges).mockResolvedValue([{id:'reason',requestRevision:2,kind:'COVERAGE',status:'MANAGER_PENDING',requestedByEmployeeId:'e1',requestedByName:'Fictional Requester',requestedByRole:'EMPLOYEE',targetEmployeeId:'e2',createdAt:'2026-10-03T00:00:00Z',sourceShift:{id:'s',scheduleId:'sched',employeeId:'e1',employeeName:'Fictional',locationId:'loc',locationName:'North',weekStart:'2026-10-05',date:'2026-10-05',startTime:'08:00',endTime:'12:00'}}]);
 vi.mocked(readShiftChangeAvailability).mockResolvedValueOnce({allowed:true,notice:'Projected scheduled overtime needs manager review.'});
 const html=renderToStaticMarkup(await ManagerShiftRequests({timeZone:'America/Puerto_Rico'}));
 expect(html).toContain('>Approve<');expect(html).toContain('Projected scheduled overtime needs manager review.');
 expect(html.indexOf('Projected scheduled overtime')).toBeLessThan(html.indexOf('class="manager-workflow-review"'));
 expect(html).not.toMatch(/operationalProfile|weeklyMinutes|classification/);
});
