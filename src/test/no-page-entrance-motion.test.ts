import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from '@rstest/core';

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
// The one exception (Jose, Nov 25, 2026): the kiosk name picker's choreographed motion, which is component motion with a
// reduced-motion path for every animation, not a page entrance. Any other GSAP use is a new decision, so it is listed here.
const ALLOWED = ["components/clocker-motion.ts"];
const GSAP_IMPORT = /from\s+["'](gsap|@gsap\/react)(\/[^"']*)?["']/;
it("no application component imports gsap, apart from the Clocker name picker's motion", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const offenders = sources(root).filter(file => GSAP_IMPORT.test(readFileSync(file, "utf8")))
    .map(file => file.slice(root.length).replace(/\\/g, "/").replace(/^\//, ""))
    .filter(file => !ALLOWED.includes(file));
  expect(offenders).toEqual([]);
});
it("the allowed GSAP module still turns every animation off under reduced motion", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  for (const file of ALLOWED) {
    const source = readFileSync(join(root, file), "utf8");
    const exported = source.match(/export function \w+\([^)]*reduced: boolean[^)]*\)/g) ?? [];
    expect(exported.length, file).toBeGreaterThan(0);
    expect(source, file).not.toMatch(/ease:\s*'(back|elastic|bounce)/);
  }
});
