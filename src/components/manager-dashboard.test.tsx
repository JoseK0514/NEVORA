import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from '@rstest/core';
import { withoutB } from "./owner-b/test-support";
import { ManagerDashboard, homeDateLabel } from "./manager-dashboard";
rs.mock("next/link", () => ({ default: ({href,children,...props}: ComponentProps<"a">) => createElement("a",{href,...props},children) }));



const dashboardProps: ComponentProps<typeof ManagerDashboard> = {
    workspaceName:"Northside Services",timeZone:"America/Puerto_Rico",firstName:"Alex",weekStart:"2026-09-28",weekLabel:"Sep 28 – Oct 4",previousWeek:"2026-09-21",nextWeek:"2026-10-05",view:"overview",readyLocationCount:0,totalLocations:2,availabilitySubmitted:2,availabilityEligible:3,activeEmployees:10,unavailableAllWeek:0,coverageIssueCount:0,coverageConfigured:true,pendingRequestCount:7,managerActions:[],locations:[],days:[],hours:[],latestRevision:null,
};

it("shows the full Spanish Owner Home date in the workplace time zone", () => {
  const timeZone = "America/Puerto_Rico";
  const evening = new Date("2026-11-25T02:00:00Z");
  expect(homeDateLabel(timeZone, "es", evening)).toBe("Martes, 24 Noviembre");
  expect(homeDateLabel(timeZone, "en", evening)).toBe("Tuesday, November 24");
  expect(homeDateLabel(timeZone, "es", new Date("2026-11-25T04:00:00Z"))).toBe("Miércoles, 25 Noviembre");
});

it("loads the current Action Center without exposing unverified server-provided request names or counts", () => {
  const props: ComponentProps<typeof ManagerDashboard> = {
    workspaceName: "Northside Services", timeZone: "America/Puerto_Rico", firstName:"Alex",weekStart:"2026-09-28",weekLabel:"Sep 28 – Oct 4",previousWeek:"2026-09-21",nextWeek:"2026-10-05",view:"overview",readyLocationCount:0,totalLocations:2,availabilitySubmitted:2,availabilityEligible:3,activeEmployees:10,unavailableAllWeek:0,coverageIssueCount:0,coverageConfigured:true,pendingRequestCount:7,
    managerActions:[...Array.from({length:7},(_,i)=>({id:`request-${i}`,type:"TIME_OFF" as const,priority:"REVIEW" as const,title:"Time Off Request",detail:"Sam Cruz is waiting for review.",href:"/app/requests?tab=team"})),{id:"missing",type:"AVAILABILITY_MISSING",priority:"MISSING_INPUT",title:"Availability not submitted",detail:"Jamie has not submitted.",href:"/app/availability?week=2026-09-28"}],
    locations:[],days:[],hours:[],latestRevision:null,
  };
  // The corporate layout (the Direction B phone screen draws its own hero, shown on phones only).
  const html = withoutB(renderToStaticMarkup(<ManagerDashboard {...props}/>));
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




it("offers Home's own views only; Schedule and Requests live in one place each (R1)", () => {
  // The views' pills are on the display-only composition (Hours this week and Activity are kit pages when live).
  const html = renderToStaticMarkup(<ManagerDashboard {...dashboardProps} view="team" overviewSlots={{ actions: null, activity: null }}/>);
  const tabs = html.split('aria-label="Home views"')[1]?.split('</nav>')[0] ?? '';
  expect(tabs).toContain('>Hours this week<');
  expect(tabs).not.toContain('view=schedule');
  expect(tabs).not.toContain('view=requests');
});

it("shows Hours this week on the kit with each person's hours against their target", () => {
  const html = renderToStaticMarkup(<ManagerDashboard {...dashboardProps} view="team"/>).replace(/\u00a0/g, ' ');
  expect(html).toContain('class="c-page c-teamweek c-page--narrow"');
  // The variance is plain detail text; no status pill on every row (visual-craft I).
  expect(html).not.toContain('c-pill');
  expect(html).toContain('Hours this week');
  expect(html).toContain('href="/app/schedule/settings"');
  expect(html).not.toContain('class="nv-avatar');
});
