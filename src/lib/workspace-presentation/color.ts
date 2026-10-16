/** Colour maths for company branding: sRGB, OKLab/OKLCH (Björn Ottosson) and
 * WCAG 2 contrast. Pure and dependency-free so the editor preview and the
 * server derive the same tokens. */
export type Rgb = { r: number; g: number; b: number }; // 0..1, gamma encoded
export type Oklch = { l: number; c: number; h: number }; // h in degrees

export function parseHex(value: string): Rgb | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function toHex({ r, g, b }: Rgb): string {
  const byte = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}`.toUpperCase();
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function rgbToOklch(rgb: Rgb): Oklch {
  const r = toLinear(rgb.r), g = toLinear(rgb.g), b = toLinear(rgb.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h };
}

/** Unclamped linear sRGB for an OKLCH colour (may fall outside 0..1). */
function oklchToLinear({ l: L, c, h }: Oklch) {
  const A = c * Math.cos((h * Math.PI) / 180), B = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

const inGamut = (v: { r: number; g: number; b: number }) =>
  [v.r, v.g, v.b].every(x => x >= -1e-6 && x <= 1 + 1e-6);

/** Keep lightness and hue; reduce chroma until the colour fits sRGB. */
export function oklchToRgb(color: Oklch): Rgb {
  let lo = 0, hi = color.c, best = { ...color, c: 0 };
  if (inGamut(oklchToLinear(color))) best = color;
  else for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinear({ ...color, c: mid }))) { lo = mid; best = { ...color, c: mid }; } else hi = mid;
  }
  const lin = oklchToLinear(best);
  return { r: toGamma(Math.max(0, lin.r)), g: toGamma(Math.max(0, lin.g)), b: toGamma(Math.max(0, lin.b)) };
}

export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrast(a: Rgb | string, b: Rgb | string): number {
  const x = typeof a === "string" ? parseHex(a) : a, y = typeof b === "string" ? parseHex(b) : b;
  if (!x || !y) return 0;
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

/** Shortest distance between two hues, in degrees (0..180). */
export const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Mix `a` into `b` (default white) by `amount` in gamma-encoded sRGB, the
 * way CSS `color-mix(in srgb, a amount, b)` does. */
export function mix(a: string, amount: number, b = "#FFFFFF"): string {
  const x = parseHex(a), y = parseHex(b);
  if (!x || !y) return b;
  return toHex({ r: x.r * amount + y.r * (1 - amount), g: x.g * amount + y.g * (1 - amount), b: x.b * amount + y.b * (1 - amount) });
}
