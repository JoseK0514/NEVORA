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
  // One h1 (Release 1 corporate: the page title, no band), and no count until the live read confirms it (F1).
  expect(html.match(/<h1/g)).toHaveLength(1);
  expect(html).toContain('class="c-title"');
  expect(html).toContain('Checking what needs you…');
  expect(html).not.toContain('Sam Cruz is waiting');expect(html).not.toMatch(/\b7 things need you/);expect(html).not.toContain('All caught up');
  expect(html).not.toContain("at Fuel.");
  // Release 1 (corporate board C-Owner): Home is the welcome line over Today and Things to do. The week's planning facts
  // live on Schedule and the team tools in More and the sidebar (app-shell.test.tsx proves they stay reachable).
  expect(html).toContain('>Welcome back, Alex</h1>');
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

it("offers Home's own views only; Schedule and Requests live in one place each (R1)", () => {
  const html = renderToStaticMarkup(<ManagerDashboard {...dashboardProps} view="activity"/>);
  const tabs = html.split('aria-label="Home views"')[1]?.split('</nav>')[0] ?? '';
  expect(tabs).toContain('>Team overview<');
  expect(tabs).not.toContain('view=schedule');
  expect(tabs).not.toContain('view=requests');
});

it("shows Team overview (Hours this week) on the kit with each person's hours against their target", () => {
  const html = renderToStaticMarkup(<ManagerDashboard {...dashboardProps} view="team"/>).replace(/\u00a0/g, ' ');
  expect(html).toContain('class="c-page c-teamweek"');
  expect(html).toContain('Hours this week');
  expect(html).toContain('href="/app/schedule/settings"');
  expect(html).not.toContain('class="nv-avatar');
});
