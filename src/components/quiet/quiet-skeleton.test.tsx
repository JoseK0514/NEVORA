import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { createElement, type ComponentProps } from "react";

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children) }));
import { QuietSkeleton } from "./quiet";
import { RouteSkeleton } from "../route-skeleton";

// Phase 1 (inspection Oct 24): a tab tap flashed an old-design shimmer placeholder (teal band, grid, cards), then the
// access frame's "Current view needs a fresh check" text panel, then the Quiet page. In the Quiet shell both waiting
// states are now the page's own static shape.
it("draws the Quiet page shape, static and hidden from assistive technology", () => {
  const html = renderToStaticMarkup(createElement(QuietSkeleton));
  expect(html).toMatch(/^<div class="q-page q-skel-page" aria-hidden="true">/);
  expect(html.match(/<li>/g)).toHaveLength(6);
});
it("every route placeholder carries it, and keeps its spoken status", () => {
  const html = renderToStaticMarkup(createElement(RouteSkeleton, { label: "schedule", shape: "grid", band: 244 }));
  expect(html).toContain('class="q-page q-skel-page"');
  expect(html).toContain("Loading schedule…");
});
it("shows the shape only in the Quiet shell, outranking the kit's own hide rule, and never animates it", () => {
  const css = readFileSync(new URL("./quiet.css", import.meta.url), "utf8");
  expect(css).toContain(":is(#q-root, html) .q-skel-page { display: none; }");
  expect(css).toContain(":is(#q-root, html) .app-shell[data-nv-quiet] .q-skel-page { display: block;");
  const skeleton = css.slice(css.indexOf("/* Loading (v4, Phase 1)"));
  expect(skeleton).not.toMatch(/animation|transition/);
});
