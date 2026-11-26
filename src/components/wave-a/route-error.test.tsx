import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "@rstest/core";
import { routeErrorLine, WaveARouteError } from "./route-error";

const count = (text: string, part: string) => text.split(part).length - 1;
/** The strings a sighted person reads: the markup without the screen-reader-only alert. */
const visible = (html: string) => html.replace(/<p class="b-sr"[^>]*>[^<]*<\/p>/g, "").replace(/<span class="b-busy__on" data-b-off=""[^>]*>(?:<span[^>]*><\/span>)?[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "\n").split("\n").map(s => s.trim()).filter(Boolean);

// G54 (Nov 23, 2026): each fact once, one way back, and the cause said honestly.
describe("the route error screen", () => {
  const html = renderToStaticMarkup(<WaveARouteError retry={() => {}} title="Copy week" back={{ href: "/app/schedule", label: "Schedule" }} />);
  it("says each fact once on screen", () => {
    const strings = visible(html);
    expect(strings).toEqual(["Schedule", "Copy week", "This page didn’t load", "Something went wrong on our side. Nothing was changed.", "Try again"]);
    expect(new Set(strings).size).toBe(strings.length);
    expect(count(html, "didn’t load")).toBe(2); // the card, and the one alert (read alone, so it names the page)
  });
  it("has one way back (the band's link) and one button", () => {
    expect(count(html, 'href="/app/schedule"')).toBe(1);
    expect(html).toContain('<a class="b-back" href="/app/schedule">');
    expect(html).not.toContain("Back to Schedule");
    expect(count(html, "<button")).toBe(1);
    expect(html).toContain('<span class="b-busy__idle">Try again</span>');
  });
  it("speaks the whole message once and blames the connection only when offline", () => {
    expect(count(html, 'role="alert"')).toBe(1);
    expect(html).toContain('<p class="b-sr" role="alert">Copy week didn’t load. Something went wrong on our side. Nothing was changed.</p>');
    expect(html).not.toContain("Check your connection");
    expect(routeErrorLine(true)).toBe("Something went wrong on our side. Nothing was changed.");
    expect(routeErrorLine(false)).toBe("You’re offline. Nothing was changed.");
  });
  it("draws no back link on a tab, which has no way back", () => {
    const team = renderToStaticMarkup(<WaveARouteError retry={() => {}} title="Team" />);
    expect(team).not.toContain("b-back");
    expect(visible(team)).toEqual(["Team", "This page didn’t load", "Something went wrong on our side. Nothing was changed.", "Try again"]);
  });
});
