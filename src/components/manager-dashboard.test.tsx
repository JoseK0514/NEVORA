import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ManagerDashboard } from "./manager-dashboard";
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
  // One band, one h1, and no count until the live read confirms it (F1).
  expect(html.match(/<h1/g)).toHaveLength(1);
  expect(html).toContain('data-nv-band');
  expect(html).toContain('Checking what needs you…');
  expect(html).not.toContain('Sam Cruz is waiting');expect(html).not.toMatch(/\b7 things need you/);expect(html).not.toContain('All caught up');
  expect(html).not.toContain("at Fuel.");
  expect(html.replace(/\u00a0/g, ' ')).toContain('planned, drafts included');
  expect(html).toContain('Schedules published');
  // Team tools keep every former shortcut reachable.
  expect(html).toContain('href="/app/clocker-recovery"');expect(html).toContain('href="/app/account-recovery"');
  expect(html).toContain('view=attendance');expect(html).toContain('view=team');expect(html).toContain('view=activity');
});

vi.mock("@/lib/business-time",()=>import("../lib/business-time"));

it("summarizes the selected planning week and counts only explicitly published schedules", () => {
  const html = renderToStaticMarkup(<ManagerDashboard {...dashboardProps}
    readyLocationCount={3}
    days={[
      {date:"2026-09-28",weekday:"Mon",day:"28",shiftCount:3,gapCount:0},
      {date:"2026-09-29",weekday:"Tue",day:"29",shiftCount:4,gapCount:0},
    ]}
    locations={[
      {locationId:"published",locationName:"North",state:"PUBLISHED",scheduleStatus:"PUBLISHED",totalBlocks:1,coveredBlocks:1,uncoveredBlocks:0},
      {locationId:"draft",locationName:"South",state:"READY",scheduleStatus:"DRAFT",totalBlocks:1,coveredBlocks:1,uncoveredBlocks:0},
      {locationId:"unspecified",locationName:"West",state:"PUBLISHED",totalBlocks:1,coveredBlocks:1,uncoveredBlocks:0},
    ]}
  />);
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

it("offers Home's own views only; Schedule and Requests live in one place each (R1)", () => {
  const html = renderToStaticMarkup(<ManagerDashboard {...dashboardProps} view="team"/>);
  const tabs = html.split('aria-label="Home views"')[1]?.split('</nav>')[0] ?? '';
  expect(tabs).toContain('>Team overview<');
  expect(tabs).not.toContain('view=schedule');
  expect(tabs).not.toContain('view=requests');
});
