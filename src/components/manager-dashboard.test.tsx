import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ManagerDashboard } from "./manager-dashboard";
vi.mock("next/link", () => ({ default: ({href,children,...props}: ComponentProps<"a">) => createElement("a",{href,...props},children) }));
vi.mock("@/components/nav-icon", () => import("./nav-icon"));
vi.mock("@/components/status-pill", () => import("./status-pill"));
vi.mock("@/lib/date-utils", () => import("../lib/date-utils"));
it("shows full pending totals beyond the six-row preview and links missing availability to the selected week", () => {
  const props: ComponentProps<typeof ManagerDashboard> = {
    firstName:"Alex",weekStart:"2026-09-28",weekLabel:"Sep 28 – Oct 4",previousWeek:"2026-09-21",nextWeek:"2026-10-05",view:"overview",readyLocationCount:0,totalLocations:2,availabilitySubmitted:2,activeEmployees:3,unavailableAllWeek:0,coverageIssueCount:0,coverageConfigured:true,pendingRequestCount:7,
    managerActions:[...Array.from({length:7},(_,i)=>({id:`request-${i}`,type:"TIME_OFF" as const,priority:"REVIEW" as const,title:"Time Off Request",detail:"Sam Cruz is waiting for review.",href:"/app/requests?tab=team"})),{id:"missing",type:"AVAILABILITY_MISSING",priority:"MISSING_INPUT",title:"Availability not submitted",detail:"Jamie has not submitted.",href:"/app/availability?week=2026-09-28"}],
    scheduleRoster:[],onFloor:[],locations:[],days:[],hours:[],requestCounts:{timeOff:7,exchange:0,callout:0},latestRevision:null,
  };
  const html = renderToStaticMarkup(<ManagerDashboard {...props}/>);
  expect(html).toContain('class="manager-home-count">7</span>');
  expect(html).toContain('href="/app/availability?week=2026-09-28"><span>Availability</span><strong>1 missing');
  expect(html).toContain('href="/app/requests?tab=pending"'); expect(html).toContain('href="/app/exchange?tab=pending"');
  expect(html.match(/class="manager-home-action"/g)).toHaveLength(6);
});
