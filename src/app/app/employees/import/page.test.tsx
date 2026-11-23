// The Owner roster import page: who may open it, what it says where the import is off, and what it hands the screen.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, rs } from '@rstest/core';

const m = rs.hoisted(() => ({ role: "OWNER", routed: true, denied: false, commerce: false }));
beforeEach(() => { m.role = "OWNER"; m.routed = true; m.denied = false; m.commerce = false; });

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => undefined }) }));
rs.mock("@/lib/auth/session", () => ({
  requireSession: async () => ({ id: "actor", role: m.role }),
  requireSessionMutationProof: async () => ({ employee: { id: "actor", role: m.role }, sessionTokenHash: "a".repeat(64) }),
}));
rs.mock("@/lib/auth/permissions", () => ({ isManagerRole: (role: string) => role === "OWNER" || role === "MANAGER" }));
rs.mock("@/lib/company-access/operational-scope.server", () => ({
  withOperationalCompany: async (_proof: unknown, load: () => Promise<unknown>) => m.denied ? { state: "unavailable", reason: "access_denied" }
    : { state: "ready", data: await load(), coverage: { kind: "COMPANY", locationIds: [] }, authority: "fixture", observedAt: "2026-11-14T12:00:00Z", validForMs: 15000 },
}));
// The access frame checks the person's access in the browser before it shows a page; here it shows the page.
rs.mock("@/components/company-access/scoped-read-frame", () => ({ ScopedReadFrame: ({ children, unavailable }: { children?: React.ReactNode; unavailable?: React.ReactNode }) => children ?? unavailable ?? null }));
rs.mock("@/lib/workspace-routing/config.server", () => ({ readWorkspaceRoutingConfig: () => { if (!m.routed) throw Error("Workspace is unavailable"); return {}; } }));
rs.mock("@/lib/commerce/access", () => ({ commerceEnabled: () => m.commerce }));
rs.mock("@/lib/data/employees", () => ({
  listLocations: async () => [
    { id: "cafe", workspaceId: "w", clockerKey: "cafe", name: "Northside Café", shortName: "Café", active: true },
    { id: "old", workspaceId: "w", clockerKey: "old", name: "Closed Shop", shortName: "Closed", active: false },
  ],
  listEmployees: async () => [
    { id: "O-1", firstName: "Jose", lastName: "Natal", role: "OWNER", active: true }, { id: "M-1", firstName: "Mara", lastName: "Gerente", role: "MANAGER", active: true },
    { id: "E-1", firstName: "Ana", lastName: "Pérez", role: "EMPLOYEE", active: true }, { id: "E-2", firstName: "Ex", lastName: "Empleado", role: "EMPLOYEE", active: false },
  ],
}));

import RosterImportPage, { metadata } from "./page";

const render = async () => renderToStaticMarkup(await RosterImportPage());

describe("/app/employees/import", () => {
  it("opens the import for an Owner, with the active locations and the page title", async () => {
    const html = await render();
    expect(metadata.title).toBe("Import a staff list");
    expect(html).toContain('class="c-page c-addemp c-sheetpage c-rimp"');
    expect(html).toContain('aria-labelledby="roster-import-title"');
    expect(html).toContain("Step 1 of 3");
    expect(html).toContain('<option value="cafe" selected="">Café</option>');
    expect(html).not.toContain("Closed");
    expect(html).toContain(">Check list</button>");
  });
  it.each(["MANAGER", "LEAD", "EMPLOYEE"])("is closed to a %s, with the reason and who can help", async role => {
    m.role = role;
    const html = await render();
    expect(html).toContain("Importing a staff list is for Owners");
    expect(html).toContain("Jose Natal can import a staff list for you.");
    expect(html).not.toContain("rimp-list");
    expect(html.includes('href="/app/employees/new"')).toBe(role === "MANAGER");
    // Package X: the closed page sits under Team, so its band goes back to Team, not Home.
    expect(html).toContain('href="/app/employees"');
    expect(html).toMatch(/href="\/app\/employees"[^>]*>(?:<[^>]+>)*Team</);
  });
  it("says the import isn't available where the routes would answer unavailable, instead of a form", async () => {
    m.routed = false;
    const html = await render();
    expect(html).toContain("Staff list import isn’t available for this workplace yet.");
    expect(html).toContain("You can still add people one at a time.");
    expect(html).toContain('href="/app/employees"');
    expect(html).toContain('href="/app/employees/new"');
    expect(html).not.toContain("<form");
    expect(html).not.toContain("rimp-list");
  });
  it("shows the unavailable page when the company's information can't be read", async () => {
    m.denied = true;
    const html = await render();
    // Review 30 (D09): without company-wide access the page is the closed state under its own name.
    expect(html).toContain("<h1>Staff list import</h1>");
    expect(html).toContain("Company-wide access needed");
    expect(html).not.toContain("rimp-list");
  });
});
