import { readFileSync } from "node:fs";
import { expect, it } from "@rstest/core";

// Z3 (A4-05, Nov 23, 2026): forced colours give chosen tabs, focus and status dots a system colour.
const css = readFileSync("src/app/app/b-foundation.css", "utf8");
const block = css.slice(css.indexOf("/* Z3 (A4-05"));

it("sits in the kit's layer", () => {
  expect(block).toMatch(/@layer nv-b \{\s*@media \(forced-colors: active\)/);
});

it("marks the chosen tab of every segmented control and keeps a focus outline", () => {
  expect(block).toMatch(/:is\(\.b-seg, \.c-seg, \.q-seg[^{]*\{ outline: 2px solid Highlight !important;/);
  expect(block).toContain(".c-tc-tabs, .c-tabs, [data-c-tabs]");
  expect(block).toMatch(/:focus-visible[^{]*\{ outline: 2px solid Highlight !important;/);
});

it("keeps status dots in the text colour", () => {
  expect(block).toContain(".b-week__legend > i)");
  expect(block).toMatch(/:is\(\.mb-dot, \.b-dot, \.eb-unread[^{]*\{ forced-color-adjust: none !important; background: CanvasText !important; \}/);
  expect(readFileSync("src/components/access-recovery/access-recovery.css", "utf8")).toMatch(/forced-colors: active\) \{\s*[^{]*\.ar-rule__dot \{ forced-color-adjust: none !important; background: CanvasText !important; \}/);
});

it("gives the top bar's and phone header's buttons a ButtonText edge (Search, bell, account menu, avatar, Add shift)", () => {
  const rule = 'html body .app-shell .mobile-header :is(.command-finder-trigger, .nevora-action-menu-trigger, .portal-notification-bell, .c-top-avatar, .cm-add-shift) { outline: 1px solid ButtonText !important; outline-offset: -1px !important; }';
  expect(css).toContain(rule);
  expect(block).toMatch(/\.portal-notification-bell svg[^{]*\{ forced-color-adjust: none !important; color: ButtonText !important;/);
  const at = css.indexOf(rule), media = css.lastIndexOf("@media (forced-colors: active) {", at);
  expect(media).toBeGreaterThan(-1);
  // The rule sits inside that forced-colours block: no block closes between the @media and the rule at the top level.
  expect(css.slice(media, at).split("\n").some(line => line === "}")).toBe(false);
});
