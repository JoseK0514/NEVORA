import { describe, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";

const session = rs.hoisted(() => ({ role: "OWNER" as string, proof: true, scope: null as null | { mode: "COMPANY" } | { mode: "LOCATIONS"; locationIds: string[] }, path: "/app/settings" }));
rs.mock("@/lib/auth/session", () => ({
  requireSession: async () => ({ id: "X", role: session.role }),
  readSessionMutationProof: async () => session.proof ? { employee: { id: "X", role: session.role } } : null,
}));
const team = rs.hoisted(() => ({ list: [] as { firstName: string; lastName: string; role: string; active: boolean }[] }));
rs.mock("@/lib/data/employees", () => ({ listEmployees: async () => team.list }));
// What the shell already reads for this person: their operational scope and the workspace's words and features.
rs.mock("@/lib/company-access/operational-scope.server", () => ({
  readOperationalAuthority: async () => session.scope ? { state: "ready", role: "MANAGER", scope: session.scope } : { state: "unavailable", reason: "access_denied" },
}));
rs.mock("@/lib/workspace-presentation/current.server", () => ({ currentBrand: async () => ({ words: "retail", modules: undefined }) }));
rs.mock("next/navigation", () => ({ usePathname: () => session.path }));
import SettingsLayout from "./layout";
import { closedSettingsSubject } from "./closed-line";

const render = async () => renderToStaticMarkup(await SettingsLayout({ children: <p>PRIVATE settings page</p> }));

describe("Settings for someone who isn't an Owner (PD9, UX10)", () => {
  it.each(["MANAGER", "LEAD", "EMPLOYEE"])("says why it is closed and never renders the page for a %s", async role => {
    session.role = role; session.scope = null; session.path = "/app/settings";
    const html = await render();
    // Review B2 (NV-137): the reason is the title; with no Owner names read, the help line stays.
    expect(html).toContain("Settings are for Owners");
    expect(html).toContain("Ask an Owner if you need a change here.");
    expect(html).toContain('href="/app"');
    expect(html).not.toContain("PRIVATE settings page");
  });
  // Review B2 (NV-137): the notice names the workspace's active Owners as the people who can help.
  it("names the Owners who can change a setting", async () => {
    session.role = "MANAGER"; session.scope = null; session.path = "/app/settings";
    team.list = [{ firstName: "Jose", lastName: "Natal", role: "OWNER", active: true }, { firstName: "Old", lastName: "Owner", role: "OWNER", active: false }, { firstName: "Elena", lastName: "Ruiz", role: "MANAGER", active: true }];
    const html = await render();
    expect(html).toContain("Jose\u00A0Natal can change a setting for you.");
    expect(html).not.toContain("Old Owner");
    // Without Scheduling rules in their navigation, no button offers it.
    expect(html).not.toContain("/app/schedule/settings");
    team.list = [];
  });
  // Review Nov 11 (MG-002): a Manager who has Scheduling rules is told so and given the way there, as a tinted pill.
  it("points a Manager with company-wide access to Scheduling rules, and never renders the page", async () => {
    session.role = "MANAGER"; session.scope = { mode: "COMPANY" }; session.path = "/app/settings";
    team.list = [{ firstName: "Jose", lastName: "Natal", role: "OWNER", active: true }];
    const html = await render();
    expect(html).toMatch(/<h1 id="owner-only-title"[^>]*>Settings<\/h1>/);
    expect(html).toContain("Settings are for Owners");
    // Phase 8 (B #22): the Owner's name is kept on one line.
    expect(html).toContain("You can change scheduling rules. For anything else, ask Jose\u00A0Natal.");
    expect(html).toContain('<a class="b-btn b-btn--ghost" href="/app/schedule/settings">Open Scheduling rules</a>');
    expect(html).not.toContain("b-btn--teal");
    expect(html).not.toContain("PRIVATE settings page");
    team.list = [];
  });
  it("offers a Manager kept to some locations no Scheduling rules button, and one without a readable session none either", async () => {
    session.role = "MANAGER"; session.scope = { mode: "LOCATIONS", locationIds: ["loc-1"] }; session.path = "/app/settings";
    expect(await render()).not.toContain("/app/schedule/settings");
    session.scope = { mode: "COMPANY" }; session.proof = false;
    const html = await render();
    expect(html).not.toContain("/app/schedule/settings");
    expect(html).not.toContain("PRIVATE settings page");
    session.proof = true;
  });
  // Review Nov 11 (MG-009): a page under Settings names the section the Manager asked for, in the workspace's own words.
  it("names the section on a closed page under Settings", async () => {
    session.role = "MANAGER"; session.scope = { mode: "COMPANY" };
    team.list = [{ firstName: "Jose", lastName: "Natal", role: "OWNER", active: true }];
    session.path = "/app/settings/locations/loc-1";
    let html = await render();
    expect(html).toContain("Stores are part of Settings, which only Owners can change. Ask Jose\u00A0Natal.");
    expect(html).toMatch(/<h1 id="owner-only-title"[^>]*>Settings<\/h1>/);
    expect(html).not.toContain("PRIVATE settings page");
    session.path = "/app/settings/workspace";
    html = await render();
    expect(html).toContain("Company profile is part of Settings, which only Owners can change. Ask Jose\u00A0Natal.");
    team.list = [];
    session.path = "/app/settings/features";
    expect(await render()).toContain("Features and team terms are part of Settings, which only Owners can change. Ask an Owner.");
    session.path = "/app/settings";
  });
  it("matches the longest Settings address, and says nothing special for one it does not know", () => {
    expect(closedSettingsSubject("/app/settings/clocker/pins")).toBe("Clocker PINs are");
    expect(closedSettingsSubject("/app/settings/clocker/")).toBe("Clocker tablets are");
    expect(closedSettingsSubject("/app/settings/locations/new", "Stores")).toBe("Stores are");
    expect(closedSettingsSubject("/app/settings/payroll", undefined, "es")).toBe("La configuración de nómina forma");
    expect(closedSettingsSubject("/app/settings")).toBeNull();
    expect(closedSettingsSubject("/app/settings/unknown")).toBeNull();
    expect(closedSettingsSubject(null)).toBeNull();
  });
  it("shows Owners the page", async () => {
    session.role = "OWNER";
    expect(await render()).toBe("<p>PRIVATE settings page</p>");
  });
});
