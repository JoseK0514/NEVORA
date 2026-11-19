import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, rs } from '@rstest/core';

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
const fixture = rs.hoisted(() => ({ role: "EMPLOYEE" }));
rs.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); }, usePathname: () => "/app/restricted", useRouter: () => ({ refresh: () => undefined }) }));
rs.mock("@/lib/auth/session", () => ({ requireSession: async () => ({ id: "fictional", role: fixture.role, firstName: "Sam", lastName: "Cruz", primaryLocationId: "loc-1" }) }));


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
  // Phase 4 (EM-019): an Employee or Lead sees the one state screen too (a single title that can take focus).
  expect(out).toMatch(/<h1 id="owner-only-title"[^>]*>That page is for Owners and Managers<\/h1>/);
  expect(out.match(/<h1/g)).toHaveLength(1);
  expect(out).toContain("Ask your Owner if you need access.");
  // One way on at every width, as the tinted pill, with the lock in the kit's round holder.
  expect(out).toContain('<a href="/app" class="b-btn b-btn--ghost">Go to Home</a>');
  expect(out.match(/Go to Home/g)).toHaveLength(1);expect(out).toContain('data-kind="locked"');
  expect(out).not.toContain("Back to Home");
  expect(await generateMetadata()).toEqual({ title: "That page is for Owners and Managers" });
});
it("never tells a Manager that an Owner's page is theirs", async () => {
  fixture.role = "MANAGER";
  const out = renderToStaticMarkup(await RestrictedPage());
  // Phase 3 (MG-015): a Manager's notice is the one state screen, whose title can take focus (tabindex); the words are the same.
  expect(out).toMatch(/<h1 id="owner-only-title"[^>]*>That page is for Owners<\/h1>/);
  expect(out.match(/<h1/g)).toHaveLength(1);
  expect(out).not.toContain("Owners and Managers");
  // One way on, as the tinted pill (never a second filled button), and the lock in the kit's round holder.
  expect(out).toContain('<a href="/app" class="b-btn b-btn--ghost">Go to Home</a>');
  expect(out).toContain('data-kind="locked"');
  expect(out).toContain("Ask your Owner if you need access.");
  expect(await generateMetadata()).toEqual({ title: "That page is for Owners" });
});
