import { contrast, hueDistance, mix, oklchToRgb, parseHex, rgbToOklch, toHex, type Oklch } from "./color";

/** Company brand colours (B1). One seed colour becomes the portal's teal
 * ladder. Every output keeps the accessibility floors the approved teal
 * meets, so a company can change the colour but never the readability.
 * The default NEVORA teal returns the hand-tuned values exactly. */
export const BRAND_ALGORITHM = 1 as const;
export const DEFAULT_SEED = "#077572";

export type BrandTokens = {
  accent: string; accentHover: string; accentStrong: string; accentWash: string;
  accentLine: string; accentTint: string; accentSelect: string; accentPressed: string;
  masthead: string; mastheadInk: string;
};

export const DEFAULT_TOKENS: BrandTokens = {
  accent: "#077572", accentHover: "#055C5A", accentStrong: "#07605F", accentWash: "#E7F3F2",
  accentLine: "#C9E0DE", accentTint: "#F3F9F8", accentSelect: "#CDE7E5", accentPressed: "#D3EAE8",
  masthead: "#1C4A47", mastheadInk: "#CFE3E1",
};

/** The only custom properties a company brand may set. */
export const BRAND_CSS_VARS: Record<keyof BrandTokens, `--g-${string}`> = {
  accent: "--g-accent", accentHover: "--g-accent-hover", accentStrong: "--g-accent-strong", accentWash: "--g-accent-wash",
  accentLine: "--g-accent-line", accentTint: "--g-accent-tint", accentSelect: "--g-accent-select", accentPressed: "--g-accent-pressed",
  masthead: "--g-masthead", mastheadInk: "--g-masthead-ink",
};

export type BrandAdjustment = { code: "grey" | "status-hue" | "darkened" | "lightened"; message: string };
export type ContrastCheck = { id: string; label: string; ratio: number; minimum: number; pass: boolean };
export type DerivedBrand = { seed: string; algorithm: typeof BRAND_ALGORITHM; tokens: BrandTokens; adjustments: BrandAdjustment[] };

const WHITE = "#FFFFFF", INSET = "#F6F7F8";
/** Status hues (OKLCH) the brand must stay visibly apart from: danger, the
 * urgent bar, warning and success. */
const STATUS = [
  { hue: 29.5, name: "the error red" }, { hue: 31.4, name: "the urgent red" },
  { hue: 55.8, name: "the warning amber" }, { hue: 154.6, name: "the success green" },
];
const STATUS_BAND = 10, GREY_CHROMA = 0.03, TINT_MIX = 0.12;

const hex = (color: Oklch) => toHex(oklchToRgb(color));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Darken (or lighten) in small steps until `ok` holds, keeping hue and chroma. */
function solve(color: Oklch, ok: (value: string) => boolean, step = -0.005): Oklch {
  let current = { ...color };
  for (let i = 0; i < 200 && !ok(hex(current)); i++) current = { ...current, l: clamp(current.l + step, 0.05, 0.99) };
  return current;
}

export function normalizeSeed(value: string): string | null {
  const rgb = parseHex(value);
  return rgb ? toHex(rgb) : null;
}

export function deriveBrand(seedInput: string): DerivedBrand {
  const seed = normalizeSeed(seedInput) ?? DEFAULT_SEED;
  if (seed === DEFAULT_SEED) return { seed, algorithm: BRAND_ALGORITHM, tokens: { ...DEFAULT_TOKENS }, adjustments: [] };
  const adjustments: BrandAdjustment[] = [];
  let base = rgbToOklch(parseHex(seed)!);

  if (base.c < GREY_CHROMA) {
    adjustments.push({ code: "grey", message: "This colour is too close to grey to mark buttons and links, so NEVORA teal is used instead." });
    return { seed, algorithm: BRAND_ALGORITHM, tokens: { ...DEFAULT_TOKENS }, adjustments };
  }

  const clash = STATUS.map(s => ({ ...s, distance: hueDistance(base.h, s.hue) })).filter(s => s.distance < STATUS_BAND)
    .sort((a, b) => a.distance - b.distance)[0];
  if (clash) {
    // Move to the nearer edge that is clear of every status band.
    const candidates = STATUS.flatMap(s => [s.hue - STATUS_BAND, s.hue + STATUS_BAND]).map(h => (h + 360) % 360)
      .filter(h => STATUS.every(s => hueDistance(h, s.hue) >= STATUS_BAND - 1e-9))
      .sort((a, b) => hueDistance(a, base.h) - hueDistance(b, base.h));
    base = { ...base, h: candidates[0] };
    adjustments.push({ code: "status-hue", message: `The hue was shifted slightly so it can't be mistaken for ${clash.name} used for alerts.` });
  }

  // Accent: white button text at 5:1 or better; never so dark it merges with the masthead.
  let accent = { ...base };
  if (contrast(hex(accent), WHITE) < 4.5) {
    accent = solve(accent, v => contrast(v, WHITE) >= 5);
    adjustments.push({ code: "darkened", message: "Darkened so white text on buttons stays readable (at least 5:1)." });
  } else if (accent.l < 0.36) {
    accent = { ...accent, l: 0.36 };
    adjustments.push({ code: "lightened", message: "Lightened a little so buttons stay distinct from the dark header." });
  }

  const c = accent.c, h = accent.h;
  const wash = { l: 0.955, c: Math.min(c * 0.15, 0.03), h };
  const washHex = hex(wash);
  // Links and counts also sit on tints of the accent (its wash, and CSS mixes of
  // up to 12% over white). NEVORA teal clears 4.5:1 there, so every brand must.
  const onTints = (v: string) => contrast(v, washHex) >= 4.5 && contrast(v, mix(v, TINT_MIX)) >= 4.5;
  if (!onTints(hex(accent))) {
    accent = solve(accent, onTints);
    if (!adjustments.some(a => a.code === "darkened"))
      adjustments.push({ code: "darkened", message: "Darkened slightly so links stay readable on tinted backgrounds." });
  }
  const hover = solve({ l: accent.l - 0.08, c: c * 0.84, h }, v => contrast(v, WHITE) >= 4.5);
  const strong = solve({ l: accent.l - 0.065, c: c * 0.86, h }, v => contrast(v, washHex) >= 4.5);
  const masthead = solve({ l: Math.min(0.376, accent.l - 0.13), c: Math.min(c * 0.58, 0.08), h }, v => contrast(v, WHITE) >= 7);
  const mastheadHex = hex(masthead);
  const mastheadInk = solve({ l: 0.9, c: Math.min(c * 0.25, 0.045), h }, v => contrast(v, mastheadHex) >= 4.5, 0.005);

  return {
    seed, algorithm: BRAND_ALGORITHM, adjustments,
    tokens: {
      accent: hex(accent), accentHover: hex(hover), accentStrong: hex(strong), accentWash: washHex,
      accentLine: hex({ l: 0.889, c: Math.min(c * 0.29, 0.05), h }),
      accentTint: hex({ l: 0.977, c: Math.min(c * 0.08, 0.012), h }),
      accentSelect: hex({ l: 0.908, c: Math.min(c * 0.32, 0.055), h }),
      accentPressed: hex({ l: 0.92, c: Math.min(c * 0.28, 0.05), h }),
      masthead: mastheadHex, mastheadInk: hex(mastheadInk),
    },
  };
}

/** The pairs the portal relies on, with the floor each must meet. */
export function contrastReport(tokens: BrandTokens): ContrastCheck[] {
  const rows: [string, string, string, string, number][] = [
    ["button", "White text on buttons", WHITE, tokens.accent, 4.5],
    ["button-hover", "White text on pressed buttons", WHITE, tokens.accentHover, 4.5],
    ["link", "Links on white", tokens.accent, WHITE, 4.5],
    ["link-tint", "Links on tinted backgrounds", tokens.accent, mix(tokens.accent, TINT_MIX), 4.5],
    ["link-wash", "Links on the selected tint", tokens.accent, tokens.accentWash, 4.5],
    ["selected", "Selected text on its tint", tokens.accentStrong, tokens.accentWash, 4.5],
    ["masthead", "White text on the header", WHITE, tokens.masthead, 7],
    ["masthead-secondary", "Secondary text on the header", tokens.mastheadInk, tokens.masthead, 4.5],
    ["focus", "Focus ring on white", tokens.accent, WHITE, 3],
    ["focus-inset", "Focus ring on grey panels", tokens.accent, INSET, 3],
  ];
  return rows.map(([id, label, fg, bg, minimum]) => {
    const ratio = Math.floor(contrast(fg, bg) * 100) / 100;
    return { id, label, ratio, minimum, pass: ratio >= minimum };
  });
}

/** Inline custom properties for `.app-shell`. Only known keys and strict hex
 * values pass, so stored data can never inject other CSS. */
export function brandStyle(tokens: Partial<Record<keyof BrandTokens, unknown>> | null | undefined): Record<string, string> | undefined {
  if (!tokens) return undefined;
  const style: Record<string, string> = {};
  for (const key of Object.keys(BRAND_CSS_VARS) as (keyof BrandTokens)[]) {
    const value = tokens[key];
    if (typeof value === "string" && /^#[0-9A-F]{6}$/i.test(value)) style[BRAND_CSS_VARS[key]] = value.toUpperCase();
  }
  return Object.keys(style).length === Object.keys(BRAND_CSS_VARS).length ? style : undefined;
}

/** The kiosk keeps its own teal variables (U9); a brand maps onto them. */
export function clockerBrandStyle(tokens: BrandTokens | null | undefined): Record<string, string> | undefined {
  const portal = brandStyle(tokens);
  if (!portal || !tokens) return undefined;
  return { "--clocker-accent": portal["--g-accent"], "--clocker-accent-hover": portal["--g-accent-hover"], "--clocker-focus": portal["--g-accent-strong"], "--clocker-soft": portal["--g-accent-wash"] };
}

export const isDefaultBrand = (tokens: BrandTokens) =>
  (Object.keys(DEFAULT_TOKENS) as (keyof BrandTokens)[]).every(k => tokens[k].toUpperCase() === DEFAULT_TOKENS[k]);
