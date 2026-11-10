import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const session = vi.hoisted(() => ({ role: "OWNER" as string }));
vi.mock("@/lib/auth/session", () => ({ requireSession: async () => ({ id: "X", role: session.role }) }));
const team = vi.hoisted(() => ({ list: [] as { firstName: string; lastName: string; role: string; active: boolean }[] }));
vi.mock("@/lib/data/employees", () => ({ listEmployees: async () => team.list }));
import SettingsLayout from "./layout";

describe("Settings for someone who isn't an Owner (PD9, UX10)", () => {
  it.each(["MANAGER", "LEAD", "EMPLOYEE"])("says why it is closed and never renders the page for a %s", async role => {
    session.role = role;
    const html = renderToStaticMarkup(await SettingsLayout({ children: <p>PRIVATE settings page</p> }));
    // Review B2 (NV-137): the reason is the title; with no Owner names read, the help line stays.
    expect(html).toContain("Settings are for Owners");
    expect(html).toContain("Ask an Owner if you need a change here.");
    expect(html).toContain('href="/app"');
    expect(html).not.toContain("PRIVATE settings page");
  });
  // Review B2 (NV-137): the notice names the workspace's active Owners as the people who can help.
  it("names the Owners who can change a setting", async () => {
    session.role = "MANAGER";
    team.list = [{ firstName: "Jose", lastName: "Natal", role: "OWNER", active: true }, { firstName: "Old", lastName: "Owner", role: "OWNER", active: false }, { firstName: "Elena", lastName: "Ruiz", role: "MANAGER", active: true }];
    const html = renderToStaticMarkup(await SettingsLayout({ children: <p>PRIVATE settings page</p> }));
    expect(html).toContain("Jose Natal can change a setting for you.");
    expect(html).not.toContain("Old Owner");
    team.list = [];
  });
  it("shows Owners the page", async () => {
    session.role = "OWNER";
    expect(renderToStaticMarkup(await SettingsLayout({ children: <p>PRIVATE settings page</p> }))).toBe("<p>PRIVATE settings page</p>");
  });
});
