import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
const fixture = vi.hoisted(() => ({ role: "EMPLOYEE" }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); }, usePathname: () => "/app/restricted", useRouter: () => ({ refresh: () => undefined }) }));
vi.mock("@/lib/auth/session", () => ({ requireSession: async () => ({ id: "fictional", role: fixture.role, firstName: "Sam", lastName: "Cruz", primaryLocationId: "loc-1" }) }));
vi.mock("@/lib/auth/permissions", () => import("../../../lib/auth/permissions"));

import RestrictedPage, { generateMetadata } from "./page";
import { MANAGER_ROLES, RESTRICTED_PATH, requireRoles } from "@/lib/auth/permissions";

beforeEach(() => { fixture.role = "EMPLOYEE"; });

// Review Nov 14 (AR-18, RA-7): a wrong-role visit to a management page says who the page is for, instead of a silent move to Home.
it.each(["EMPLOYEE", "LEAD"])("sends a %s who opens a management page to the notice, not to Home", async role => {
  fixture.role = role;
  await expect(requireRoles(MANAGER_ROLES)).rejects.toThrow(/^redirect:\/app\/restricted$/);
  expect(RESTRICTED_PATH).toBe("/app/restricted");
});
it.each(["OWNER", "MANAGER"])("still admits a %s to a management page", async role => {
  fixture.role = role;
  await expect(requireRoles(MANAGER_ROLES)).resolves.toMatchObject({ role });
});
it("keeps an Owner's page closed to a Manager, with the same notice", async () => {
  fixture.role = "MANAGER";
  await expect(requireRoles(["OWNER"])).rejects.toThrow(/^redirect:\/app\/restricted$/);
});

it.each(["EMPLOYEE", "LEAD"])("tells a %s the page is for Owners and Managers, how to get access, and the way Home", async role => {
  fixture.role = role;
  const out = renderToStaticMarkup(await RestrictedPage());
  expect(out).toContain('<h1 id="owner-only-title">That page is for Owners and Managers</h1>');
  expect(out).toContain("Ask your Owner if you need access.");
  // One way forward at every width: the phone screen's teal pill and the kit's primary button.
  expect(out).toContain('<a href="/app" class="b-btn b-btn--teal">Go to Home</a>');
  expect(out).toContain('<a href="/app" class="c-btn">Go to Home</a>');
  expect(out).not.toContain("Back to Home");
  expect(await generateMetadata()).toEqual({ title: "That page is for Owners and Managers" });
});
it("never tells a Manager that an Owner's page is theirs", async () => {
  fixture.role = "MANAGER";
  const out = renderToStaticMarkup(await RestrictedPage());
  expect(out).toContain('<h1 id="owner-only-title">That page is for Owners</h1>');
  expect(out).not.toContain("Owners and Managers");
  expect(out).toContain("Ask your Owner if you need access.");
  expect(await generateMetadata()).toEqual({ title: "That page is for Owners" });
});
