import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

// Phase 1 (inspection Oct 24): 14 gsap page entrances painted content, moved it back and animated it in after every
// navigation, which read as lag and cost main-thread time exactly when a page arrived. Pages now appear in place.
// Motion that explains a change (a sheet, a toast) stays in CSS with a reduced-motion fallback.
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "test" ? [] : sources(path);
    return /\.(tsx?|mts)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}
it("no application component imports gsap", () => {
  const root = new URL("..", import.meta.url).pathname;
  const offenders = sources(root).filter(file => /from\s+["'](gsap|@gsap\/react)(\/[^"']*)?["']/.test(readFileSync(file, "utf8")));
  expect(offenders).toEqual([]);
});
