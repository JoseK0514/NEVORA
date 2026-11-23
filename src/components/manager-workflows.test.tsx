import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import { requireSession } from "@/lib/auth/session";
import { getShiftValidationContext } from "@/lib/data/schedules";
import CoverageSuggestionsPage from "../app/app/schedule/coverage/page";
import { ManagerTimeOff } from "./manager-time-off";
import { ManagerAvailability } from "./manager-availability";
import { ManagerShiftRequests } from "./manager-shift-requests";
import { listWorkforceLeave } from "@/lib/data/requests";
import { listAvailabilitySubmissionStatuses } from "@/lib/data/availability-submissions";
import { listManagementCoverage, listManagerPendingExchanges, listTeamExchangeActivity } from "@/lib/data/exchanges";
import {readShiftChangeAvailability} from '@/lib/data/shift-changes';
import { listPendingCallouts } from "@/lib/data/callouts";

const access=rs.hoisted(()=>({denied:false}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({isOperationalAuthorizationError:()=>false,readOperationalAuthority:async()=>access.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',scope:{mode:'COMPANY'},authority:'fixture',locations:[],observedAt:'2026-10-14T12:00:00Z',validForMs:15000},withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>access.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),coverage:{kind:'COMPANY',locationIds:[]},authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
rs.mock("@/lib/auth/session", () => ({ requireSession: rs.fn(),requireSessionMutationProof:async()=>({employee:{id:"reviewer",role:"MANAGER"},sessionTokenHash:"a".repeat(64)}) }));
rs.mock("@/lib/data/schedule-health", () => ({ listEmployeeHourTargets: rs.fn(async () => []) }));
rs.mock("@/lib/data/hour-fairness", () => ({ listHourFairness: rs.fn(async () => []) }));
rs.mock("@/lib/data/schedules", () => ({ getShiftValidationContext: rs.fn() }));
rs.mock("@/lib/data/requests", () => ({ listWorkforceLeave: rs.fn(async () => access.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:[],coverage:{kind:'COMPANY',locationIds:[]},authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}) }));
rs.mock("@/lib/data/availability-submissions", () => ({ listAvailabilitySubmissionStatuses: rs.fn(async () => [
  {employeeId:"missing",employeeName:"Missing Person",submitted:false,windowCount:0,state:"NOT_SUBMITTED"},
  {employeeId:"unavailable",employeeName:"Unavailable Person",submitted:true,windowCount:0,state:"SUBMITTED_UNAVAILABLE"},
  {employeeId:"available",employeeName:"Available Person",submitted:true,windowCount:1,state:"SUBMITTED"},
]) }));
rs.mock("@/lib/data/employees", () => ({ listEmployees: async () => [{ positionIds: [], id:"available",firstName:"Sam",lastName:"Rivera",role:"EMPLOYEE",active:true,eligibleLocationIds:["loc"],primaryLocationId:"loc"}], listLocations: async () => [{id:"loc",shortName:"FUEL – 2"}] }));
rs.mock("@/lib/data/availability", () => ({ listTeamAvailabilityWindows: async () => [
  {id:"window",employeeId:"available",dayOfWeek:1,startTime:"06:00",endTime:"14:00"},
  {id:"seeded",employeeId:"missing",dayOfWeek:1,startTime:"07:00",endTime:"15:00"},
] }));
rs.mock("@/lib/data/week-settings", () => ({ getUpcomingAvailabilityWeek: async () => null, getWeekSettings: async () => null }));
rs.mock("@/lib/data/exchanges", () => ({ listManagerPendingExchanges: rs.fn(async () => []), listManagementCoverage: rs.fn(async () => []), listTeamExchangeActivity: rs.fn(async () => []) }));
rs.mock("@/lib/data/callouts", () => ({ listPendingCallouts: rs.fn(async () => []), listTeamCalloutHistory: rs.fn(async () => []) }));
rs.mock("@/app/app/requests/actions", () => ({ reviewTimeOffAction: rs.fn() }));
rs.mock("@/lib/data/workspaces", () => ({ getWorkspace: async () => ({ timeZone: "America/Puerto_Rico" }) }));
rs.mock("@/app/app/exchange/actions", () => ({ reviewExchangeAction: rs.fn(),shiftChangeAction:rs.fn(),reconcileShiftChangeAction:async()=>null }));
rs.mock("@/app/app/exchange/callout/actions", () => ({ reviewCalloutAction: rs.fn() }));
rs.mock("next/navigation", () => ({ useRouter:()=>({refresh:()=>{}}), redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
rs.mock("next/link", () => ({ useLinkStatus: () => ({ pending: false }), default: ({href,children,prefetch,...props}: ComponentProps<"a"> & { prefetch?: boolean }) => { void prefetch; return createElement("a",{href,...props},children); } }));

beforeEach(() => { access.denied=false;rs.clearAllMocks(); rs.mocked(requireSession).mockResolvedValue({id:"reviewer",firstName:"Alex",lastName:"Rivera",role:"MANAGER",primaryLocationId:"loc"}); });

it.each(["EMPLOYEE","LEAD"] as const)("denies %s direct management review before reading team data", async role => {
  rs.mocked(requireSession).mockResolvedValue({id:"viewer",firstName:"Sam",lastName:"Cruz",role,primaryLocationId:"loc"});
  for (const page of [() => ManagerTimeOff({}), () => ManagerAvailability({ timeZone:"America/Puerto_Rico",currentWeek:"2026-09-28"}), () => ManagerShiftRequests({ timeZone:"America/Puerto_Rico",}), () => CoverageSuggestionsPage({searchParams:Promise.resolve({})})]) await expect(page()).rejects.toThrow("redirect:/app/restricted");
  expect(listWorkforceLeave).not.toHaveBeenCalled(); expect(listAvailabilitySubmissionStatuses).not.toHaveBeenCalled(); expect(listManagerPendingExchanges).not.toHaveBeenCalled();
});
it.each(["OWNER","MANAGER"] as const)("gives %s operational Time Off views and read-only history", async role => {
  rs.mocked(requireSession).mockResolvedValue({id:"reviewer",firstName:"Alex",lastName:"Rivera",role,primaryLocationId:"loc"});
  const pending = renderToStaticMarkup(await ManagerTimeOff({tab:"team"}));
  expect(listWorkforceLeave).toHaveBeenCalledOnce();
  expect(pending).toContain("Waiting"); expect(pending).not.toMatch(/New Request|My Requests|startDate/);
  const approved = renderToStaticMarkup(await ManagerTimeOff({tab:"approved"}));
  expect(listWorkforceLeave).toHaveBeenCalledWith(expect.any(Object), "APPROVED"); expect(approved).not.toContain("<form");
  await ManagerTimeOff({tab:"declined"}); expect(listWorkforceLeave).toHaveBeenCalledWith(expect.any(Object), "DENIED");
});
it("distinguishes missing, intentionally unavailable and submitted windows without treating seeded hours as a submission", async () => {
  // Times are kept whole with no-break spaces; compare the words.
  const html = renderToStaticMarkup(await ManagerAvailability({ timeZone:"America/Puerto_Rico",currentWeek:"2026-09-28"})).replace(/\u00a0/g, " ");
  // Quiet (v4): Not sent and Sent carry the counts; seeded hours on someone who hasn't sent don't count or show.
  // R12 / copy table 14: the kit's segmented control. Nov 1 upscale: counts read "Not sent 1", the figure in the kit's count style.
  // Phase 2 (C10): Not sent and Sent are the people card's filter chips (as on Team), each count said there only.
  expect(html).toContain(">Not sent<b>1</b></button>"); expect(html).toContain(">Sent<b>2</b></button>");
  expect(html).not.toMatch(/\(\d+\)<\/button>/);
  expect(html).not.toContain("2 of 3 sent");
  expect(html).not.toMatch(/class="[^"]*\b(?:q-(?!sheet|page q-sheet|sr")|wb-|wc-|wa-|sig-|nv-)/);
  expect(html).toMatch(/Missing Person<\/span><span class="c-row__detail"><span>No primary location<\/span>/); expect(html).not.toContain("7:00 AM");
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
 rs.mocked(getShiftValidationContext).mockResolvedValue({ position: undefined, workspace: {id:"test-workspace",active:true,timeZone:"America/Puerto_Rico"}, location: {id:"loc",workspaceId:"test-workspace",active:true},  employee: { positionIds: [],  active: true, role: "EMPLOYEE", eligibleLocationIds: ["loc"], targetWeeklyHours: 24, maximumWeeklyHours: 40 }, existingShifts: [], availability: [{ dayOfWeek: 1, startTime: "06:00", endTime: "18:00" }], weeklyAvailability: [], availabilityExceptions: [], approvedTimeOff: [], existingWeeklyMinutes: 0 });
 const params = { week: "2026-10-05", date: "2026-10-05", locationId: "loc", start: "08:00", end: "16:00" };
 const general = renderToStaticMarkup(await CoverageSuggestionsPage({ searchParams: Promise.resolve(params) }));
 expect(general).toContain("1\u00a0person");
 const leadOnly = renderToStaticMarkup(await CoverageSuggestionsPage({ searchParams: Promise.resolve({ ...params, lead: "1" }) }));
 expect(leadOnly).not.toContain("No one free"); expect(leadOnly).toContain("No one is free");
});


it('unknown mandatory rules never expose a generic management Approve',async()=>{
 rs.mocked(listManagerPendingExchanges).mockResolvedValue([{id:'unknown',requestRevision:2,actionable:true,kind:'COVERAGE',status:'MANAGER_PENDING',requestedByEmployeeId:'e1',requestedByName:'Fictional Requester',requestedByRole:'EMPLOYEE',targetEmployeeId:'e2',createdAt:'2026-10-03T00:00:00Z',sourceShift:{id:'s',scheduleId:'sched',employeeId:'e1',employeeName:'Fictional',locationId:'loc',locationName:'North',weekStart:'2026-10-05',date:'2026-10-05',startTime:'08:00',endTime:'12:00'}}]);
 const html=renderToStaticMarkup(await ManagerShiftRequests({timeZone:'America/Puerto_Rico'}));expect(html).not.toContain('>Approve<');expect(html).toContain('Needs Owner rule review');
});

rs.mock('@/lib/data/shift-changes',()=>({readShiftChangeAvailability:rs.fn(async()=>({allowed:false,notice:'Needs Owner rule review'}))}));
const history=rs.hoisted(()=>({events:[] as unknown[]}));
rs.mock('@/lib/data/shift-change-views',()=>({readShiftChangeHistoryView:async()=>history.events}));

it('missing current revision never fabricates a mutation identity',async()=>{
 rs.mocked(listPendingCallouts).mockResolvedValue([{id:'missing-revision',shiftId:'s',employeeId:'e1',employeeName:'Fictional',locationId:'loc',locationName:'North',weekStart:'2026-10-05',date:'2026-10-05',startTime:'08:00',endTime:'12:00',reasonCode:'OTHER',status:'PENDING',createdAt:'2026-10-03T00:00:00Z'}]);
 const result=renderToStaticMarkup(await ManagerShiftRequests({timeZone:'America/Puerto_Rico'}));expect(result).not.toContain('name="expectedRevision" value="0"');expect(result).not.toContain('value="DECLINE_CALLOUT"');expect(result).toContain('This request changed. Reload to see the latest.');
});

it('H12 actionable manager exception explains its reason outside the action grid',async()=>{
 rs.mocked(listPendingCallouts).mockResolvedValue([]);
 rs.mocked(listManagerPendingExchanges).mockResolvedValue([{id:'reason',requestRevision:2,kind:'COVERAGE',status:'MANAGER_PENDING',requestedByEmployeeId:'e1',requestedByName:'Fictional Requester',requestedByRole:'EMPLOYEE',targetEmployeeId:'e2',createdAt:'2026-10-03T00:00:00Z',sourceShift:{id:'s',scheduleId:'sched',employeeId:'e1',employeeName:'Fictional',locationId:'loc',locationName:'North',weekStart:'2026-10-05',date:'2026-10-05',startTime:'08:00',endTime:'12:00'}}]);
 rs.mocked(readShiftChangeAvailability).mockResolvedValueOnce({allowed:true,notice:'Projected scheduled overtime needs manager review.'});
 const html=renderToStaticMarkup(await ManagerShiftRequests({timeZone:'America/Puerto_Rico'}));
 expect(html).toContain('>Approve<');expect(html).toContain('Projected scheduled overtime needs manager review.');
 // Phase 2 (C12): Direction B for real, so a waiting request carries no older-kit parts (Quiet, Wave, Signature).
 expect(html).not.toMatch(/class="[^"]*\b(?:q-(?!sheet|page q-sheet|sr")|wb-|wc-|wa-|sig-|nv-)/);
 expect(html.indexOf('Projected scheduled overtime')).toBeLessThan(html.indexOf('class="c-shreq__acts"'));
 expect(html).not.toMatch(/operationalProfile|weeklyMinutes|classification/);
});

it("names who decided a request and when, once the read includes it (Codex C1), and stays quiet without it", async () => {
  const base = { id: "r1", employeeId: "e1", employeeName: "Fictional Person", startDate: "2026-10-29", endDate: "2026-10-30", status: "APPROVED", createdAt: "2026-10-01T15:00:00.000Z" };
  rs.mocked(listWorkforceLeave).mockResolvedValueOnce({state:'ready',data:[{ ...base, reviewerName: "Fictional Manager", reviewedAt: "2026-10-02T15:00:00.000Z" }],coverage:{kind:'COMPANY',locationIds:[]},authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000} as never);
  const decided = renderToStaticMarkup(await ManagerTimeOff({ tab: "approved" })).replace(/\u00a0/g, " ");
  // Final polish (confirmations A #17): the line is the kit's facts line (BSegs), so its parts are separate elements.
  expect(decided.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).toContain("Approved by Fictional Manager · Oct 2");
  rs.mocked(listWorkforceLeave).mockResolvedValueOnce({state:'ready',data:[base],coverage:{kind:'COMPANY',locationIds:[]},authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000} as never);
  const older = renderToStaticMarkup(await ManagerTimeOff({ tab: "approved" }));
  expect(older).not.toContain("Approved by");
});

it("Back to Inbox keeps the Inbox's selected item, and ignores anything that isn't an item id (IS-P4-11)", async () => {
  const pending = { id: "req-1", employeeId: "e1", employeeName: "Fictional Person", startDate: "2026-10-29", endDate: "2026-10-30", status: "PENDING", createdAt: "2026-10-01T15:00:00.000Z" };
  rs.mocked(listWorkforceLeave).mockResolvedValueOnce({state:'ready',data:[pending],coverage:{kind:'COMPANY',locationIds:[]},authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000} as never);
  const kept = renderToStaticMarkup(await ManagerTimeOff({ tab: "pending", requestId: "req-1", filter: "requests", item: "TIME_OFF:req-1" }));
  expect(kept).toContain('href="/app/inbox?filter=requests&amp;item=TIME_OFF%3Areq-1"');
  rs.mocked(listWorkforceLeave).mockResolvedValueOnce({state:'ready',data:[pending],coverage:{kind:'COMPANY',locationIds:[]},authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000} as never);
  const hostile = renderToStaticMarkup(await ManagerTimeOff({ tab: "pending", requestId: "req-1", filter: "requests", item: "javascript:alert(1)" }));
  expect(hostile).toContain('href="/app/inbox?filter=requests"');
});
it('honors scoped leave denial and company-read denial on other management pages',async()=>{access.denied=true;for(const load of [()=>ManagerTimeOff({}),()=>ManagerAvailability({timeZone:'America/Puerto_Rico',currentWeek:'2026-10-12'}),()=>ManagerShiftRequests({timeZone:'America/Puerto_Rico'}),()=>CoverageSuggestionsPage({searchParams:Promise.resolve({week:'2026-10-12',date:'2026-10-12',locationId:'loc',start:'08:00',end:'16:00'})})]){const html=renderToStaticMarkup(await load());expect(html).toContain('Return to Home');}expect(listWorkforceLeave).toHaveBeenCalledOnce();expect(listAvailabilitySubmissionStatuses).not.toHaveBeenCalled();expect(listManagerPendingExchanges).not.toHaveBeenCalled();expect(getShiftValidationContext).not.toHaveBeenCalled();});

// This suite checks server-page composition. Mounted lifetime behavior has its own browser harness.
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));

describe("management sees every shift in full before deciding (Codex review, Oct 23)", () => {
  const shift = (over: Record<string, unknown>) => ({ id: "s", scheduleId: "sched", employeeId: "e1", employeeName: "Fictional Ana", locationId: "north", locationName: "North Office", weekStart: "2026-10-05", date: "2026-10-05", startTime: "08:00", endTime: "12:00", ...over });
  const plain = (html: string) => html.replace(/ /g, " ");
  /** The words on the page, without tags. */
  // Final polish (Nov 20, 2026): a time range carries a short form for phones (BWhen's .b-when-s, hidden from 768px) beside
  // the full one; these checks read the full facts, as a desktop shows them.
  const text = (html: string) => html.replace(/<span class="b-when-s">[^<]*<\/span>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  it("a swap shows both employees, full dates, start and end times and locations ahead of Approve", async () => {
    rs.mocked(listPendingCallouts).mockResolvedValue([]);
    rs.mocked(listManagerPendingExchanges).mockResolvedValue([{ id: "swap", requestRevision: 3, actionable: true, kind: "SWAP", status: "MANAGER_PENDING", requestedByEmployeeId: "e1", requestedByName: "Fictional Ana", requestedByRole: "EMPLOYEE", targetEmployeeId: "e2", targetEmployeeName: "Fictional Ben", createdAt: "2026-10-03T00:00:00Z",
      sourceShift: shift({}) as never, targetShift: shift({ id: "t", employeeId: "e2", employeeName: "Fictional Ben", locationId: "south", locationName: "South Office", date: "2026-10-08", startTime: "14:00", endTime: "18:00" }) as never }]);
    rs.mocked(readShiftChangeAvailability).mockResolvedValueOnce({ allowed: true } as never);
    const html = plain(renderToStaticMarkup(await ManagerShiftRequests({ timeZone: "America/Puerto_Rico" })));
    // Phase 3 (OW-029, OW-003): the shifts are a two-column list, one line each; the year shows only when it is not this one.
    const facts = text(html.slice(html.indexOf('class="b-req-facts"'), html.indexOf('class="q-acts"')));
    // Gaps G87 (Nov 23, 2026): the row says the request's day and hours, so the opened shift adds only where it is.
    expect(facts).toContain("Fictional Ana’s shift North Office");
    expect(facts).not.toContain("Mon, Oct 5");
    expect(facts).toContain("Fictional Ben’s shift Thu, Oct 8 · 2:00 PM – 6:00 PM · South Office");
    expect(facts).not.toContain("2026");
    expect(html).toContain(">Approve<");
    expect(html.indexOf("South Office")).toBeLessThan(html.indexOf(">Approve<"));
    // Still a revision-bound decision on the same request.
    expect(html).toContain('name="expectedRevision" value="3"');
  });
  it("coverage shows the affected shift and who picked it up, or that no one has", async () => {
    rs.mocked(listPendingCallouts).mockResolvedValue([]);
    const cover = { id: "cover", requestRevision: 2, actionable: true, kind: "COVERAGE" as const, status: "MANAGER_PENDING" as const, requestedByEmployeeId: "e1", requestedByName: "Fictional Ana", requestedByRole: "EMPLOYEE" as const, createdAt: "2026-10-03T00:00:00Z", sourceShift: shift({ endTime: "02:00", startTime: "18:00" }) as never };
    rs.mocked(listManagerPendingExchanges).mockResolvedValue([{ ...cover, targetEmployeeId: "e2", targetEmployeeName: "Fictional Ben" }]);
    const named = plain(renderToStaticMarkup(await ManagerShiftRequests({ timeZone: "America/Puerto_Rico" })));
    const namedFacts = text(named.slice(named.indexOf('class="b-req-facts"'), named.indexOf('class="q-acts"')));
    expect(namedFacts).toContain("Fictional Ana’s shift Ends Tue, Oct 6 · North Office");
    expect(namedFacts).not.toContain("6:00 PM");
    expect(namedFacts).not.toContain("Picked up by Fictional Ben");
    expect(text(named)).toContain("Picked up by Fictional Ben");
    // OW-011: a request over a day old carries its age under the dates (phones and tablets show that line).
    expect(named).toContain('<span class="c-shreq__age">11 d ago</span>');
    rs.mocked(listManagerPendingExchanges).mockResolvedValue([cover]);
    expect(text(plain(renderToStaticMarkup(await ManagerShiftRequests({ timeZone: "America/Puerto_Rico" }))))).toContain("Nobody has picked it up yet");
  });
  it("an “Unable to work” report shows the affected shift with its reason and note", async () => {
    rs.mocked(listManagerPendingExchanges).mockResolvedValue([]);
    rs.mocked(listPendingCallouts).mockResolvedValue([{ id: "callout", requestRevision: 4, shiftId: "s", employeeId: "e1", employeeName: "Fictional Ana", locationId: "north", locationName: "North Office", weekStart: "2026-10-05", date: "2026-10-05", startTime: "08:00", endTime: "12:00", reasonCode: "TRANSPORTATION", reasonNote: "Fictional bus strike", status: "PENDING", createdAt: "2026-10-03T00:00:00Z" }]);
    const html = plain(renderToStaticMarkup(await ManagerShiftRequests({ timeZone: "America/Puerto_Rico" })));
    const facts = text(html.slice(html.indexOf('class="b-req-facts"'), html.indexOf('class="q-acts"')));
    expect(facts).toContain("Fictional Ana’s shift North Office");
    expect(facts).not.toContain("8:00 AM");
    expect(facts).toContain("Reason Transportation issue"); expect(facts).toContain("Note Fictional bus strike");
    // The collapsed line is the shift only (OW-011); the reason shows once the row opens.
    const summary = html.slice(html.indexOf("<summary"), html.indexOf("</summary>"));
    // Jose (Nov 23): the kind is a label beside the name, and the day and hours are their own line.
    expect(summary).toContain('<span class="b-chip b-chip--amber">Can’t work</span>');
    expect(text(summary)).toContain("Can’t work Mon, Oct 5 · 8:00 AM – 12:00 PM");
    expect(summary.slice(summary.indexOf(">"))).not.toContain("Fictional bus strike");
  });
  it("a shift in another year carries its year, in the row and in the opened list", async () => {
    rs.mocked(listManagerPendingExchanges).mockResolvedValue([]);
    rs.mocked(listPendingCallouts).mockResolvedValue([{ id: "callout", requestRevision: 4, shiftId: "s", employeeId: "e1", employeeName: "Fictional Ana", locationId: "north", locationName: "North Office", weekStart: "2027-01-04", date: "2027-01-04", startTime: "22:00", endTime: "24:00", reasonCode: "OTHER", status: "PENDING", createdAt: "2026-10-03T00:00:00Z" }]);
    const words = text(plain(renderToStaticMarkup(await ManagerShiftRequests({ timeZone: "America/Puerto_Rico" }))));
    expect(words).toContain("Can’t work Mon, Jan 4, 2027 · 10:00 PM – 12:00 AM");
    expect(words).toContain("Fictional Ana’s shift North Office");
    expect(words.split("Mon, Jan 4, 2027").length).toBe(2);
  });
  it("a deep-linked request opens with its shifts showing", async () => {
    rs.mocked(listPendingCallouts).mockResolvedValue([]);
    rs.mocked(listManagerPendingExchanges).mockResolvedValue([{ id: "linked", requestRevision: 1, kind: "COVERAGE", status: "MANAGER_PENDING", requestedByEmployeeId: "e1", requestedByName: "Fictional Ana", requestedByRole: "EMPLOYEE", createdAt: "2026-10-03T00:00:00Z", sourceShift: shift({}) as never }]);
    expect(renderToStaticMarkup(await ManagerShiftRequests({ timeZone: "America/Puerto_Rico", requestId: "linked" }))).toMatch(/<details class="c-shreq__details" open="">/);
  });
});

it("Phase 2 (C12): a decided request's history reads in plain words, each shift once", async () => {
  rs.mocked(listTeamExchangeActivity).mockResolvedValueOnce([]);
  const { listTeamCalloutHistory } = await import("@/lib/data/callouts");
  rs.mocked(listTeamCalloutHistory).mockResolvedValueOnce([{ id: "done-1", shiftId: "s", employeeId: "e1", employeeName: "Fictional Blair", locationId: "loc", locationName: "North", weekStart: "2026-12-07", date: "2026-12-09", startTime: "08:00", endTime: "16:00", reasonCode: "ILLNESS", status: "APPROVED", releaseApplies: true, createdAt: "2026-11-23T11:42:37.000Z", coverage: [] }] as never);
  history.events = [
    { revision: 1, event: "created", at: "2026-11-23T11:42:37.000Z", source: "2026-12-09 · 08:00 – 16:00 · Location loc-2 · Position qa-pos2 · No shift lead", target: null, mode: null },
    { revision: 2, event: "completed", at: "2026-11-23T12:28:16.000Z", source: "2026-12-10 · 09:00 – 17:00 · Location loc-2 · Position qa-pos2 · Shift lead", target: null, mode: "MANAGER" },
  ];
  const html = renderToStaticMarkup(await ManagerShiftRequests({ timeZone: "America/Puerto_Rico", tab: "activity" })).replace(/\u00a0/g, " ");
  history.events = [];
  expect(html).toContain("Created · Nov 23, 7:42 AM");
  expect(html).toContain("Completed by a manager · Nov 23, 8:28 AM");
  // The first step's shift is the row's own line, so it isn't repeated; the changed one is said in full.
  expect(html).toContain("Thu, Dec 10 · 9:00 AM – 5:00 PM · Shift lead");
  expect(html).not.toMatch(/revision \d|loc-2|qa-pos2|2026-11-23T|16:00/);
});
