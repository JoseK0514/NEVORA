import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ManagerDashboard } from "./manager-dashboard";
vi.mock("next/link", () => ({ default: ({href,children,...props}: ComponentProps<"a">) => createElement("a",{href,...props},children) }));
vi.mock("@/components/nav-icon", () => import("./nav-icon"));
vi.mock("@/components/status-pill", () => import("./status-pill"));
vi.mock("@/lib/date-utils", () => import("../lib/date-utils"));
it("loads the current Action Center without exposing unverified server-provided request names or counts", () => {
  const props: ComponentProps<typeof ManagerDashboard> = {
    workspaceName: "Northside Services", timeZone: "America/Puerto_Rico", firstName:"Alex",weekStart:"2026-09-28",weekLabel:"Sep 28 – Oct 4",previousWeek:"2026-09-21",nextWeek:"2026-10-05",view:"overview",readyLocationCount:0,totalLocations:2,availabilitySubmitted:2,activeEmployees:3,unavailableAllWeek:0,coverageIssueCount:0,coverageConfigured:true,pendingRequestCount:7,
    managerActions:[...Array.from({length:7},(_,i)=>({id:`request-${i}`,type:"TIME_OFF" as const,priority:"REVIEW" as const,title:"Time Off Request",detail:"Sam Cruz is waiting for review.",href:"/app/requests?tab=team"})),{id:"missing",type:"AVAILABILITY_MISSING",priority:"MISSING_INPUT",title:"Availability not submitted",detail:"Jamie has not submitted.",href:"/app/availability?week=2026-09-28"}],
    scheduleRoster:[{employeeId:"sam",employeeName:"Sam Cruz",role:"EMPLOYEE",shifts:[]}],locations:[],days:[],hours:[],requestCounts:{timeOff:7,exchange:0,callout:0},latestRevision:null,
  };
  const html = renderToStaticMarkup(<ManagerDashboard {...props}/>);
  expect(html).toContain("this week at Northside Services.");
  expect(html).not.toContain("at Fuel.");
  const rosterHtml = renderToStaticMarkup(<ManagerDashboard {...props} view="schedule"/>);
  expect(rosterHtml).toContain("Employee");
  expect(rosterHtml).not.toContain("Barista");
  expect(html).toContain('Loading actions');expect(html).not.toContain('All caught up');expect(html).not.toContain('Sam Cruz is waiting');expect(html).not.toContain('aria-label="Total actions"');
  expect(html).toContain('href="/app/clocker-recovery"');expect(html).toContain('href="/app/account-recovery"');
});

vi.mock("@/lib/business-time",()=>import("../lib/business-time"));
