import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from "@rstest/core";

const route = rs.hoisted(() => ({ path: "/app/settings/clocker/matching" as string | null }));
rs.mock("next/navigation", () => ({ usePathname: () => route.path }));

import { ClosedSettingsTitle } from "./owner-only-title";

// Final verification F (F09): the closed Shift matching page names itself on the band; the rest of Settings keeps
// "Settings" until the Settings layout passes each page's name.
describe("the closed Settings page's band title", () => {
  it.each([
    ["/app/settings/clocker/matching", "Shift matching"],
    ["/app/settings/clocker/matching/", "Shift matching"],
    ["/app/settings/clocker/pins", "Settings"],
    ["/app/settings/locations/loc-1", "Settings"],
    ["/app/settings", "Settings"],
    [null, "Settings"],
  ])("%s reads %s", (path, title) => {
    route.path = path;
    expect(renderToStaticMarkup(<ClosedSettingsTitle />)).toBe(title);
  });
});
