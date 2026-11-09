import { describe, expect, it } from "vitest";
import { contrast, hueDistance, luminance, parseHex, rgbToOklch } from "./color";
import { BRAND_CSS_VARS, DEFAULT_TOKENS, brandStyle, contrastReport, deriveBrand, isDefaultBrand, normalizeSeed } from "./derive";

/** Deterministic seeds so a failure always reproduces. */
function seeds(count: number) {
  let state = 0x2f6b9d;
  const next = () => (state = (Math.imul(state, 1103515245) + 12345) >>> 0);
  return Array.from({ length: count }, () => "#" + (next() & 0xffffff).toString(16).padStart(6, "0").toUpperCase());
}
const EDGES = ["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#00FFFF", "#FF00FF", "#7F7F7F", "#010101", "#FEFEFE", "#E1553F", "#1D6F42", "#A05200", "#B42318"];

describe("deriveBrand", () => {
  it("returns the hand-tuned NEVORA teal exactly for the default seed", () => {
    for (const seed of ["#077572", "#077572 ", "#077572".toLowerCase()]) {
      const brand = deriveBrand(seed);
      expect(brand.tokens).toEqual(DEFAULT_TOKENS);
      expect(brand.adjustments).toEqual([]);
      expect(isDefaultBrand(brand.tokens)).toBe(true);
    }
  });

  it("meets every contrast floor for 2,000 random seeds and the edge colours", () => {
    for (const seed of [...seeds(2000), ...EDGES]) {
      const brand = deriveBrand(seed);
      for (const value of Object.values(brand.tokens)) expect(value).toMatch(/^#[0-9A-F]{6}$/);
      const failing = contrastReport(brand.tokens).filter(check => !check.pass);
      expect(failing, `${seed} → ${JSON.stringify(brand.tokens)}`).toEqual([]);
      // Header stays darker than buttons, and the tints stay light.
      expect(luminance(parseHex(brand.tokens.masthead)!)).toBeLessThanOrEqual(luminance(parseHex(brand.tokens.accent)!) + 1e-9);
      for (const tint of [brand.tokens.accentWash, brand.tokens.accentTint]) expect(contrast(tint, "#FFFFFF")).toBeLessThan(1.25);
    }
  });

  it("keeps brand hues clear of the status colours", () => {
    const status = [29.5, 31.4, 55.8, 154.6];
    for (const seed of seeds(2000)) {
      const brand = deriveBrand(seed);
      if (brand.adjustments.some(a => a.code === "grey")) continue;
      // Muted accents can't pass for a saturated status colour, and 8-bit
      // rounding moves their measured hue by a degree or more.
      const { h: hue, c } = rgbToOklch(parseHex(brand.tokens.accent)!);
      if (c < 0.06) continue;
      for (const s of status) expect(hueDistance(hue, s), `${seed} accent ${brand.tokens.accent}`).toBeGreaterThanOrEqual(9);
    }
  });

  it("falls back to NEVORA teal with an explanation for greys", () => {
    for (const seed of ["#808080", "#111111", "#F5F5F5", "#6B6E70"]) {
      const brand = deriveBrand(seed);
      expect(brand.tokens).toEqual(DEFAULT_TOKENS);
      expect(brand.adjustments.map(a => a.code)).toEqual(["grey"]);
    }
  });

  it("explains each change it makes", () => {
    expect(deriveBrand("#FACC15").adjustments.map(a => a.code)).toContain("darkened");
    expect(deriveBrand("#16A34A").adjustments.map(a => a.code)).toContain("status-hue");
    expect(deriveBrand("#1D4ED8").adjustments).toEqual([]);
    expect(deriveBrand("#1D4ED8").tokens.accent).toBe("#1D4ED8");
    // Fine on white, but too light for links on its own tints.
    expect(deriveBrand("#2563EB").adjustments.map(a => a.message)).toEqual(["Darkened slightly so links stay readable on tinted backgrounds."]);
  });

  it("keeps every suggested colour exactly as offered", () => {
    for (const seed of ["#077572", "#1D4ED8", "#1E3A8A", "#4F46E5", "#7C3AED", "#86198F", "#BE185D", "#0F766E"]) {
      expect(deriveBrand(seed).adjustments, seed).toEqual([]);
      expect(deriveBrand(seed).tokens.accent).toBe(seed);
    }
  });

  it("treats malformed seeds as the default", () => {
    for (const seed of ["", "077572", "#07757", "#GGGGGG", "red", "#0775722"]) expect(deriveBrand(seed).tokens).toEqual(DEFAULT_TOKENS);
    expect(normalizeSeed("#abcdef")).toBe("#ABCDEF");
    expect(normalizeSeed("url(x)")).toBeNull();
  });
});

describe("brandStyle", () => {
  it("emits only the known custom properties", () => {
    const style = brandStyle(deriveBrand("#2563EB").tokens)!;
    expect(Object.keys(style).sort()).toEqual(Object.values(BRAND_CSS_VARS).sort());
  });

  it("rejects anything that is not a complete set of strict hex colours", () => {
    expect(brandStyle(null)).toBeUndefined();
    expect(brandStyle({ ...DEFAULT_TOKENS, accent: "red" })).toBeUndefined();
    expect(brandStyle({ ...DEFAULT_TOKENS, accent: "#000;background:url(x)" })).toBeUndefined();
    const { masthead: _masthead, ...partial } = DEFAULT_TOKENS;
    expect(brandStyle(partial)).toBeUndefined();
    const extra = { ...DEFAULT_TOKENS, ["--x" as string]: "#000000" } as Record<string, unknown>;
    expect(Object.keys(brandStyle(extra)!)).not.toContain("--x");
  });
});
