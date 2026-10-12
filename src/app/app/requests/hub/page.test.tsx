import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ role: "EMPLOYEE", proof: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  requireSessionMutationProof: auth.proof,
}));
vi.mock("next/navigation", () => ({
  redirect: (destination: string) => { throw new Error(`redirect:${destination}`); },
}));

import RequestsHubPage from "./page";

beforeEach(() => {
  auth.proof.mockReset();
  auth.proof.mockImplementation(async () => ({ employee: { role: auth.role } }));
});

it.each(["EMPLOYEE", "LEAD"])("retains both request destinations for %s", async (role) => {
  auth.role = role;
  const html = renderToStaticMarkup(await RequestsHubPage());
  expect(html).toContain('href="/app/requests?tab=my"');
  expect(html).toContain('href="/app/exchange?tab=requests"');
  expect(html).toContain('href="/app/requests?tab=new"');
  expect(html).toContain('href="/app/schedule"');
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
