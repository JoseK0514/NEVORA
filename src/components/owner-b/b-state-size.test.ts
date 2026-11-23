import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@rstest/core";

const sheet = readFileSync(join(__dirname, "owner-b.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

// G67 (Nov 23, 2026): the kit's state line grows with the reader's text size.
describe("the kit's state line (.b-state)", () => {
  const rules = [...sheet.matchAll(/([^{}]*\.b-state(?![\w-])[^{}]*)\{([^}]*)\}/g)].map(m => ({ selector: m[1].trim(), body: m[2] }));
  it("is 0.875rem (14px at 100%), not a fixed px size", () => {
    const base = rules.find(rule => rule.selector.endsWith(".app-shell[data-nv-b] .b-state"));
    expect(base?.body).toContain("font-size: 0.875rem;");
  });
  it("has no px font size or px line height anywhere in the kit", () => {
    for (const rule of rules) expect(rule.body).not.toMatch(/(font-size|line-height):\s*[\d.]+px/);
  });
});
