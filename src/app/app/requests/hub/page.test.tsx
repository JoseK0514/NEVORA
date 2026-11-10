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

import RequestsHubPage from "./page";
import { onlyB, withoutB } from "@/components/owner-b/test-support";

beforeEach(() => {
  auth.proof.mockReset();
  // A complete proof: the hub binds its view to the employee id and session token hash.
  auth.proof.mockImplementation(async () => ({ employee: { id: 'fictional', firstName: 'Fictional', lastName: 'Employee', role: auth.role, primaryLocationId: 'loc-1' }, sessionTokenHash: 'a'.repeat(64) }));
});

it.each(["EMPLOYEE", "LEAD"])("retains the request destinations for %s", async (role) => {
  auth.role = role;
  const full = renderToStaticMarkup(await RequestsHubPage()), html = withoutB(full);
  // Direction B (phones): before the private read, the Requests hero and a checking card, with no request rows.
  expect(onlyB(full)).toContain(">Requests</h1>"); expect(onlyB(full)).toContain("Checking your current requests…"); expect(onlyB(full)).not.toContain("requestId=");
  // Upscale S7: Request time off starts time off; decided time off is a See all away; shift requests keep their row.
  expect(html).toContain('href="/app/requests?tab=new"');
  expect(html).toContain('>Request time off<');expect(html).not.toContain('>New request<');
  expect(html).toContain('Time off and shift changes you’ve sent');
  expect(html).toContain('href="/app/exchange"');
  expect(auth.proof).toHaveBeenCalledOnce();
});

// Review B2 (NV-136): no silent redirect; a manager is told whose page it is and gets a way to Things to do.
it.each(["MANAGER", "OWNER"])("explains to %s that the page is for employees, before rendering employee request content", async (role) => {
  auth.role = role;
  const html = renderToStaticMarkup(await RequestsHubPage());
  expect(html).toContain("This Requests page is for employees");
  expect(html).toContain('href="/app/inbox"');
  expect(html).not.toContain("Time off and shift changes you’ve sent");
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
  const html = withoutB(renderToStaticMarkup(await RequestsHubPage()));
  // Upscale S4: the state is said once, by the card ("Waiting for your manager"); decided rows say theirs in grey text.
  expect(html).toContain("requestId=w"); expect(html).toContain("requestId=a");
  expect(html.indexOf("requestId=w")).toBeLessThan(html.indexOf("requestId=a"));
  expect(html).toContain(">Waiting for your manager<"); expect(html).not.toContain(">Waiting<"); expect(html).toContain('c-meta">Approved<');
  expect(html).not.toContain("waiting for approval"); expect(html).not.toContain("c-pill");
  expect(html).toContain("2 days");
  data.requests = new Error("read failed");
  const failed = withoutB(renderToStaticMarkup(await RequestsHubPage()));
  expect(failed).toContain("Couldn’t load your requests");
  expect(failed).not.toContain("No time-off requests yet");
  data.requests = [];
});
