import { readFileSync } from "node:fs";
import { expect, it } from "@rstest/core";

// C10 Not sent / Sent (Jose, Nov 23): the kit's segmented control inside the people card, not loose filter chips.
const css = readFileSync("src/app/app/schedule/schedule-tools.css", "utf8");
const at = css.indexOf("/* C10 Not sent / Sent");
const block = css.slice(at, css.indexOf("/* The kit's disclosure rules", at));

it("draws one grey track around both segments, each half the track, no scroll fade", () => {
  expect(at).toBeGreaterThan(-1);
  expect(css.lastIndexOf("@layer nv-b {", at)).toBeGreaterThan(-1);
  expect(block).toMatch(/\.c-avteam \.c-card > \.b-filters:not[^{]*\{[^}]*display: grid !important; grid-auto-flow: column !important; grid-auto-columns: minmax\(0, 1fr\) !important;[^}]*padding: 4px !important;[^}]*background: var\(--b-quiet, #F0F2F3\) !important;[^}]*mask-image: none !important;/);
});

it("keeps each segment a 44px target and the chosen one a white pill inside the track", () => {
  expect(block).toMatch(/\.b-filters > button:not[^{]*\{[^}]*min-height: 44px !important;[^}]*margin: 0 !important;[^}]*white-space: normal !important;/);
  expect(block).toMatch(/\.b-filters > button\[aria-pressed="true"\]:not[^{]*\{[^}]*background: #FFFFFF !important;/);
});

it("draws each count as the kit's count: a grey numeral", () => {
  expect(block).toMatch(/\.b-filters > button > b:not[^{]*\{[^}]*color: var\(--b-grey, #5E666B\) !important;[^}]*tabular-nums/);
});
