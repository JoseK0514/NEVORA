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

beforeEach(() => {
  auth.proof.mockReset();
  auth.proof.mockImplementation(async () => ({ employee: { role: auth.role } }));
});

it.each(["EMPLOYEE", "LEAD"])("retains both request destinations for %s", async (role) => {
  auth.role = role;
  const html = renderToStaticMarkup(await RequestsHubPage());
  // v5 (mockup E06): Ask for Time off, Swap or cover a shift and Availability; Plus starts a time-off request.
  expect(html).toContain('href="/app/requests"');
  expect(html).toContain('href="/app/exchange"');
  expect(html).toContain('href="/app/availability"');
  expect(html).toContain('href="/app/requests?tab=new"');
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
