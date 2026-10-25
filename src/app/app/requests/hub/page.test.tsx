import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ role: "EMPLOYEE", proof: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  requireSessionMutationProof: auth.proof,
}));
vi.mock("next/navigation", () => ({
  redirect: (destination: string) => { throw new Error(`redirect:${destination}`); },
}));

vi.mock("@/lib/workspace-presentation/current.server", () => ({ currentPresentation: async () => ({ modules: { timeOff: true, marketplace: true, payStatements: true } }) }));
const data = vi.hoisted(() => ({ requests: [] as unknown[] | Error }));
vi.mock("@/lib/data/requests", () => ({ listEmployeeTimeOffRequests: async () => { if (data.requests instanceof Error) throw data.requests; return data.requests; } }));
vi.mock("@/lib/data/workspaces", () => ({ getWorkspace: async () => ({ timeZone: "America/Puerto_Rico" }) }));
// F8: the person's own shift requests and corrections (fictional rows); Error means the read failed.
const own = vi.hoisted(() => ({ activity: [] as unknown[] | Error, callouts: [] as unknown[] | Error, corrections: { state: "ready", requests: [] } as unknown }));
vi.mock("@/lib/data/exchanges", () => ({ listEmployeeExchangeActivity: async () => { if (own.activity instanceof Error) throw own.activity; return own.activity; } }));
vi.mock("@/lib/data/callouts", () => ({ listEmployeeCallouts: async () => { if (own.callouts instanceof Error) throw own.callouts; return own.callouts; } }));
vi.mock("@/lib/data/time-corrections", () => ({ getEmployeeTimeCorrections: async () => own.corrections }));

import RequestsHubPage from "./page";

beforeEach(() => {
  auth.proof.mockReset();
  auth.proof.mockImplementation(async () => ({ employee: { role: auth.role } }));
});

it.each(["EMPLOYEE", "LEAD"])("retains both request destinations for %s", async (role) => {
  auth.role = role;
  const html = renderToStaticMarkup(await RequestsHubPage());
  // v5 (mockup E06): Ask for Time off, Swap or cover a shift and Availability; Plus asks what to start (UX-E-21),
  // time off among it. P1-11: Pick up a shift goes to Schedule › Open shifts.
  expect(html).toContain('href="/app/requests"');
  expect(html).toContain('href="/app/exchange"');
  expect(html).toContain('href="/app/availability"');
  expect(html).toContain('href="/app/requests?tab=new"');
  expect(html).toContain('href="/app/schedule?view=open"');
  expect(auth.proof).toHaveBeenCalledOnce();
});

it.each(["MANAGER", "OWNER"])("redirects %s before rendering employee request content", async (role) => {
  auth.role = role;
  await expect(RequestsHubPage()).rejects.toThrow("redirect:/app");
});

it("does not render the hub when session verification rejects access", async () => {
  auth.proof.mockRejectedValue(new Error("redirect:/login"));
  await expect(RequestsHubPage()).rejects.toThrow("redirect:/login");
});

it("lists the person's own time off, waiting first, and never turns a failed read into no requests", async () => {
  auth.role = "EMPLOYEE";
  data.requests = [
    { id: "w", status: "PENDING", startDate: "2030-10-29", endDate: "2030-10-30", createdAt: "2030-10-19T12:00:00Z" },
    { id: "a", status: "APPROVED", startDate: "2030-11-13", endDate: "2030-11-13", createdAt: "2030-10-17T12:00:00Z" },
  ];
  const html = renderToStaticMarkup(await RequestsHubPage());
  expect(html).toContain("1 waiting for approval");
  // v5: Requests lists what is waiting; decided requests are on Time off.
  expect(html).toContain("request-w"); expect(html).not.toContain("request-a");
  expect(html).toContain("2 full days");
  data.requests = new Error("read failed");
  const failed = renderToStaticMarkup(await RequestsHubPage());
  expect(failed).toContain("Couldn’t load your requests");
  expect(failed).not.toContain("No time-off requests yet");
  data.requests = [];
});

it("F8: Waiting counts and lists own pending swaps, cover offers, Unable to work reports and corrections, not others'", async () => {
  auth.role = "EMPLOYEE";
  auth.proof.mockImplementation(async () => ({ employee: { id: "self", role: "EMPLOYEE" } }));
  data.requests = [{ id: "w", status: "PENDING", startDate: "2030-10-29", endDate: "2030-10-29", createdAt: "2030-10-19T12:00:00Z" }];
  const shiftOf = (date: string) => ({ date, startTime: "08:00", endTime: "16:00" });
  own.activity = [
    { id: "cover-1", kind: "COVERAGE", status: "OPEN", requestedByEmployeeId: "self", sourceShift: shiftOf("2030-10-30"), createdAt: "2030-10-20T12:00:00Z" },
    { id: "swap-1", kind: "SWAP", status: "EMPLOYEE_PENDING", requestedByEmployeeId: "self", sourceShift: shiftOf("2030-10-31"), createdAt: "2030-10-20T12:00:00Z" },
    { id: "done-1", kind: "COVERAGE", status: "APPROVED", requestedByEmployeeId: "self", sourceShift: shiftOf("2030-10-28"), createdAt: "2030-10-20T12:00:00Z" },
    { id: "theirs", kind: "SWAP", status: "EMPLOYEE_PENDING", requestedByEmployeeId: "other", sourceShift: shiftOf("2030-10-31"), createdAt: "2030-10-20T12:00:00Z" },
  ];
  own.callouts = [{ id: "call-1", employeeId: "self", status: "PENDING", ...shiftOf("2030-11-01"), createdAt: "2030-10-21T12:00:00Z" }];
  own.corrections = { state: "ready", requests: [
    { id: "fix-1", kind: "MISSING_ENTRY", status: "PENDING", proposedStartAt: "2030-10-25T12:00:00Z", proposedEndAt: "2030-10-25T20:00:00Z", locationName: "Main Office" },
    { id: "fix-2", kind: "MISSING_ENTRY", status: "APPROVED", proposedStartAt: "2030-10-24T12:00:00Z", proposedEndAt: "2030-10-24T20:00:00Z", locationName: "Main Office" },
  ] };
  const html = renderToStaticMarkup(await RequestsHubPage()).replace(/[\u00a0\u202f]/g, " ");
  expect(html).toContain("5 waiting for approval");
  expect(html).toContain("request-cover-1"); expect(html).toContain("request-swap-1"); expect(html).toContain("request-call-1");
  expect(html).not.toContain("request-done-1"); expect(html).not.toContain("request-theirs");
  expect(html).toContain("Offered to your team"); expect(html).toContain("Unable to work · Fri, Nov 1");
  expect(html).toContain("Correction · Oct 25"); expect(html).toContain("8:00 AM – 4:00 PM · Main Office");
  own.activity = new Error("read failed");
  const failed = renderToStaticMarkup(await RequestsHubPage()).replace(/[\u00a0\u202f]/g, " ");
  expect(failed).toContain("2 waiting for approval");
  expect(failed).toContain("Some requests couldn’t be checked");
  own.activity = []; own.callouts = []; own.corrections = { state: "ready", requests: [] }; data.requests = [];
});
