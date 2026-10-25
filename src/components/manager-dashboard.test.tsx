import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ManagerDashboard, homeWeek } from "./manager-dashboard";
import { WeekSummary } from "./clean/week-summary";
vi.mock("next/link", () => ({ default: ({href,children,...props}: ComponentProps<"a">) => createElement("a",{href,...props},children) }));
vi.mock("@/components/nav-icon", () => import("./nav-icon"));
vi.mock("@/components/status-pill", () => import("./status-pill"));
vi.mock("@/lib/date-utils", () => import("../lib/date-utils"));
const dashboardProps: ComponentProps<typeof ManagerDashboard> = {
    workspaceName:"Northside Services",timeZone:"America/Puerto_Rico",firstName:"Alex",weekStart:"2026-09-28",weekLabel:"Sep 28 – Oct 4",previousWeek:"2026-09-21",nextWeek:"2026-10-05",view:"overview",readyLocationCount:0,totalLocations:2,availabilitySubmitted:2,availabilityEligible:3,activeEmployees:10,unavailableAllWeek:0,coverageIssueCount:0,coverageConfigured:true,pendingRequestCount:7,managerActions:[],locations:[],days:[],hours:[],latestRevision:null,
};

it("loads the current Action Center without exposing unverified server-provided request names or counts", () => {
  const props: ComponentProps<typeof ManagerDashboard> = {
    workspaceName: "Northside Services", timeZone: "America/Puerto_Rico", firstName:"Alex",weekStart:"2026-09-28",weekLabel:"Sep 28 – Oct 4",previousWeek:"2026-09-21",nextWeek:"2026-10-05",view:"overview",readyLocationCount:0,totalLocations:2,availabilitySubmitted:2,availabilityEligible:3,activeEmployees:10,unavailableAllWeek:0,coverageIssueCount:0,coverageConfigured:true,pendingRequestCount:7,
    managerActions:[...Array.from({length:7},(_,i)=>({id:`request-${i}`,type:"TIME_OFF" as const,priority:"REVIEW" as const,title:"Time Off Request",detail:"Sam Cruz is waiting for review.",href:"/app/requests?tab=team"})),{id:"missing",type:"AVAILABILITY_MISSING",priority:"MISSING_INPUT",title:"Availability not submitted",detail:"Jamie has not submitted.",href:"/app/availability?week=2026-09-28"}],
    locations:[],days:[],hours:[],latestRevision:null,
  };
  const html = renderToStaticMarkup(<ManagerDashboard {...props}/>);
  // One h1 (Quiet v4: the page header, no band), and no count until the live read confirms it (F1).
  expect(html.match(/<h1/g)).toHaveLength(1);
  expect(html).toContain('class="q-hd"');
  expect(html).toContain('Checking what needs you…');
  expect(html).not.toContain('Sam Cruz is waiting');expect(html).not.toMatch(/\b7 things need you/);expect(html).not.toContain('All caught up');
  expect(html).not.toContain("at Fuel.");
  // Clean Manager (v3): Home is "Today": Needs you, Working now. The week's planning facts live on Schedule and the
  // team tools in More and the sidebar (app-shell.test.tsx proves they stay reachable).
  expect(html).toContain('>Today</h1>');
  expect(html).not.toContain('Schedules published');
  expect(html).not.toContain('href="/app/clocker-recovery"');
});

vi.mock("@/lib/business-time",()=>import("../lib/business-time"));

it("summarizes the selected planning week and counts only explicitly published schedules", () => {
  // The summary moved from Home to Schedule (clean Manager v3); it is built from the same dashboard read.
  const html = renderToStaticMarkup(<WeekSummary week={homeWeek({...dashboardProps,
    readyLocationCount: 3,
    days: [
      {date:"2026-09-28",weekday:"Mon",day:"28",shiftCount:3,gapCount:0},
      {date:"2026-09-29",weekday:"Tue",day:"29",shiftCount:4,gapCount:0},
    ],
    locations: [
      {locationId:"published",locationName:"North",state:"PUBLISHED",scheduleStatus:"PUBLISHED",totalBlocks:1,coveredBlocks:1,uncoveredBlocks:0},
      {locationId:"draft",locationName:"South",state:"READY",scheduleStatus:"DRAFT",totalBlocks:1,coveredBlocks:1,uncoveredBlocks:0},
      {locationId:"unspecified",locationName:"West",state:"PUBLISHED",totalBlocks:1,coveredBlocks:1,uncoveredBlocks:0},
    ],
  })} />);
  const week = (html.split('id="home-week"')[1] ?? '').replace(/\u00a0/g, ' ');
  expect(week).toContain('7 shifts planned, drafts included');
  // O2: the denominator is the people asked for availability, not every active role.
  expect(week).toContain('>2 of 3 people<');
  expect(week).toContain('Employees and leads only');
  expect(week).not.toContain('of 10');
  // Only an explicit PUBLISHED status counts; the others are named as drafts.
  expect(week).toContain('1 of 3 locations');
  expect(week).toContain('2 locations aren’t published yet.');
});

it("opens each of Home's own views as its own Quiet page with its own way back (T-1 to T-3)", () => {
  const team = renderToStaticMarkup(<ManagerDashboard {...dashboardProps} view="team" hours={[
    {employeeId:"a",employeeName:"Alexandra Rivera",scheduledHours:44,targetHours:40,status:"OVER"},
    {employeeId:"b",employeeName:"Dana Kim",scheduledHours:24,targetHours:32,status:"UNDER"},
    {employeeId:"o",employeeName:"Owner Person",scheduledHours:0,status:"TARGET_MISSING",role:"OWNER"},
    {employeeId:"c",employeeName:"Jordan Torres",scheduledHours:7.5,status:"TARGET_MISSING"},
  ]}/>);
  expect(team).not.toContain('aria-label="Home views"');
  expect(team).not.toContain('view=schedule');
  expect(team).not.toContain('view=requests');
  expect(team).toContain('>Hours</h1>');
  expect(team.replace(/\u00a0/g, ' ')).toContain('Sep 28 – Oct 4 · 2 of 3 sent availability');
  // Segments carry the counts; an Owner with no target and nothing scheduled isn't part of the team's hours.
  expect(team).toContain('>All · 3<'); expect(team).toContain('>Over target · 1<'); expect(team).toContain('>No target · 1<');
  expect(team).not.toContain('Owner Person');
  // The one red is an over-target value; numbers in sentence case.
  expect(team).toMatch(/<span class="q-rv q-rv--alert">44 h<\/span>/);
  expect(team).toContain('>7.5 h<'); expect(team).toContain('Target 32 h'); expect(team).toContain('No weekly target');
  expect(team).not.toMatch(/nv-stat|Showing 8 of/);
  expect(team).toContain('href="/app/schedule/settings#target-hours"');
  const over = renderToStaticMarkup(<ManagerDashboard {...dashboardProps} view="team" hoursFilter="over" hours={[{employeeId:"a",employeeName:"Alexandra Rivera",scheduledHours:44,targetHours:40,status:"OVER"},{employeeId:"b",employeeName:"Dana Kim",scheduledHours:24,targetHours:32,status:"UNDER"}]}/>);
  expect(over).toContain('Alexandra Rivera'); expect(over).not.toContain('Dana Kim');
  const activity = renderToStaticMarkup(<ManagerDashboard {...dashboardProps} view="activity" latestRevision={{revisionNumber:1,sourceType:"PUBLISH",createdAt:"2026-09-28T19:46:00Z"}} managerActions={[
    {id:"g1",type:"COVERAGE_GAP",priority:"URGENT",title:"Coverage gap at Main Office",detail:"Mon, Sep 28 · 12:00 AM–7:00 AM · Need 1 employee",href:"/app/schedule/coverage?x=1",dateTime:"2026-09-28T00:00"},
    {id:"g2",type:"COVERAGE_GAP",priority:"URGENT",title:"Coverage gap at Main Office",detail:"Mon, Sep 28 · 12:00 AM–7:00 AM · Need 1 employee",href:"/app/schedule/coverage?x=2",dateTime:"2026-09-28T00:00"},
  ]}/>);
  expect(activity).toContain('>Activity</h1>');
  expect(activity).toContain('<b>Schedule published</b>');
  expect(activity).toContain('Revision 1 ·');
  // Identical gaps on one day are one row with a count, and the row opens Find cover.
  expect(activity.match(/<b>Main Office needs 1 more<\/b>/g)).toHaveLength(1);
  expect(activity).toContain('<span class="q-rv">2</span>');
  expect(activity.replace(/\u00a0/g, ' ')).toContain('Mon, Sep 28 · midnight – 7:00 AM');
  expect(activity).toContain('href="/app/schedule/coverage?x=1"');
  expect(activity).not.toMatch(/nv-tile|data-tone/);
  expect(renderToStaticMarkup(<ManagerDashboard {...dashboardProps} view="activity"/>)).toContain('No activity this week.');
});
