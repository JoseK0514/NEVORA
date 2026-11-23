import { readFileSync } from "node:fs";
import { expect, it } from "@rstest/core";

// Z3 (A4-05, Nov 23, 2026): forced colours give buttons, chosen tabs, focus and status dots a system-colour edge.
const css = readFileSync("src/app/app/b-foundation.css", "utf8");
const block = css.slice(css.indexOf("/* Z3 (A4-05"));

it("gives fill-only buttons a ButtonText border in forced colours, in the kit's layer", () => {
  expect(block).toMatch(/@layer nv-b \{\s*@media \(forced-colors: active\)/);
  expect(block).toMatch(/:is\(\.b-btn, \.c-btn, \.q-bs, \.q-btn, \.b-rowact[^{]*\{ border: 1px solid ButtonText !important; \}/);
});

it("marks the chosen tab of every segmented control and keeps a focus outline", () => {
  expect(block).toMatch(/:is\(\.b-seg, \.c-seg, \.q-seg[^{]*\{ outline: 2px solid Highlight !important;/);
  expect(block).toMatch(/:focus-visible[^{]*\{ outline: 2px solid Highlight !important;/);
});

it("keeps status dots in the text colour", () => {
  expect(block).toMatch(/:is\(\.mb-dot, \.b-dot, \.eb-unread[^{]*\{ forced-color-adjust: none !important; background: CanvasText !important; \}/);
  expect(readFileSync("src/components/access-recovery/access-recovery.css", "utf8")).toMatch(/forced-colors: active\) \{\s*[^{]*\.ar-rule__dot \{ forced-color-adjust: none !important; background: CanvasText !important; \}/);
});
