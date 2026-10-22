import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const session = vi.hoisted(() => ({ role: "OWNER" as string }));
vi.mock("@/lib/auth/session", () => ({ requireSession: async () => ({ id: "X", role: session.role }) }));
import SettingsLayout from "./layout";

describe("Settings for someone who isn't an Owner (PD9, UX10)", () => {
  it.each(["MANAGER", "LEAD", "EMPLOYEE"])("says why it is closed and never renders the page for a %s", async role => {
    session.role = role;
    const html = renderToStaticMarkup(await SettingsLayout({ children: <p>PRIVATE settings page</p> }));
    expect(html).toContain("Only Owners can open Settings.");
    expect(html).toContain("Ask an Owner if you need a change here.");
    expect(html).toContain('href="/app"');
    expect(html).not.toContain("PRIVATE settings page");
  });
  it("shows Owners the page", async () => {
    session.role = "OWNER";
    expect(renderToStaticMarkup(await SettingsLayout({ children: <p>PRIVATE settings page</p> }))).toBe("<p>PRIVATE settings page</p>");
  });
});
