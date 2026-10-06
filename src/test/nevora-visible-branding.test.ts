import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe("NEVORA visible branding regression", () => {
  it("keeps normal Availability states neutral instead of using the warning-brown treatment", () => {
    const css = readFileSync("src/app/globals.css", "utf8");

    expect(css).not.toMatch(
      /\.employee-shell \.employee-availability-view \.availability-deadline-banner:not\(\.locked\)[^{]*\{[^}]*color:\s*var\(--color-state-warning\)/s,
    );
    expect(css).not.toMatch(
      /\.employee-shell \.employee-availability-view \.availability-submission-status\.pending strong\s*\{[^}]*color:\s*var\(--color-state-warning\)/s,
    );
  });

  it("does not hard-code Fuel-era product branding in user-facing TSX", () => {
    const files = ["src/app", "src/components"]
      .flatMap(walk)
      .filter((path) => path.endsWith(".tsx") && !path.includes(".test."));

    const prohibited = /\b(?:Fuel Scheduler|Fuel Coffee|Coffee Scheduler)\b/i;
    const violations = files.flatMap((path) => {
      const lines = readFileSync(path, "utf8").split("\n");
      return lines
        .map((line, index) => ({ path: relative(".", path), line: index + 1, text: line.trim() }))
        .filter((item) => prohibited.test(item.text));
    });

    expect(violations).toEqual([]);
  });
});
