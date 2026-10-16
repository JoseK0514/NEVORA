import { describe, expect, it } from "vitest";
import { DEFAULT_TOKENS } from "./derive";
import { inspectLogo, LOGO_MAX_BYTES } from "./logo";
import { DEFAULT_BRAND, brandSettings, mergeSettings, parseLogoCommand, parsePresentationCommand, presentationCommandHash, readSettings, storedBrand, storedModules } from "./model";
import { ALL_MODULES_ON, MODULES, blockerText, enabledModules, moduleForPath, pathEnabled } from "./modules";
import { WORD_PRESETS, lower, wordPreset } from "./words";

const op = "3f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const asset = "9b2f6c1e-2d3a-4b5c-9d6e-7f8091a2b3c4";

function png(width: number, height: number, extra = 0) {
  const b = new Uint8Array(33 + extra);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13], 0);
  b.set([..."IHDR"].map(c => c.charCodeAt(0)), 12);
  new DataView(b.buffer).setUint32(16, width); new DataView(b.buffer).setUint32(20, height);
  return b;
}
function webpX(width: number, height: number) {
  const b = new Uint8Array(40);
  const put = (at: number, s: string) => b.set([...s].map(c => c.charCodeAt(0)), at);
  put(0, "RIFF"); put(8, "WEBP"); put(12, "VP8X");
  const w = width - 1, h = height - 1;
  b.set([w & 255, (w >> 8) & 255, (w >> 16) & 255, h & 255, (h >> 8) & 255, (h >> 16) & 255], 24);
  return b;
}
function webpLossless(width: number, height: number) {
  const b = new Uint8Array(40);
  const put = (at: number, s: string) => b.set([...s].map(c => c.charCodeAt(0)), at);
  put(0, "RIFF"); put(8, "WEBP"); put(12, "VP8L"); b[20] = 0x2f;
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  b.set([bits & 255, (bits >>> 8) & 255, (bits >>> 16) & 255, (bits >>> 24) & 255], 21);
  return b;
}

describe("parsePresentationCommand", () => {
  const brand = (extra: Record<string, unknown> = {}) => ({ operationId: op, expectedRevision: 0, section: "brand", seed: null, logoAssetId: null, ...extra });
  it("accepts a brand seed or a reset and normalizes them", () => {
    expect(parsePresentationCommand(brand({ operationId: op.toUpperCase(), seed: "#2563eb" })))
      .toEqual({ operationId: op, expectedRevision: 0, section: "brand", seed: "#2563EB", logoAssetId: null });
    // Choosing NEVORA teal is the same as no brand.
    expect(parsePresentationCommand(brand({ expectedRevision: 3, seed: "#077572", logoAssetId: asset }))).toMatchObject({ seed: null });
  });

  it("accepts words and modules sections", () => {
    expect(parsePresentationCommand({ operationId: op, expectedRevision: 2, section: "words", preset: "retail" }))
      .toEqual({ operationId: op, expectedRevision: 2, section: "words", preset: "retail" });
    // Canonical order, so the same choice always hashes the same.
    expect(parsePresentationCommand({ operationId: op, expectedRevision: 2, section: "modules", disabled: ["breaks", "timeOff"] }))
      .toMatchObject({ section: "modules", disabled: ["timeOff", "breaks"] });
  });

  it("rejects anything else", () => {
    for (const bad of [
      null, [], "x", brand({ extra: 1 }), { operationId: op, expectedRevision: 0, seed: null, logoAssetId: null },
      brand({ operationId: "not-a-uuid" }), brand({ expectedRevision: -1 }), brand({ expectedRevision: 1.5 }),
      brand({ expectedRevision: 2147483647 }), brand({ seed: "blue" }), brand({ seed: "#12345" }),
      brand({ seed: "#000;}body{x:y" }), brand({ logoAssetId: "../etc" }), brand({ logoAssetId: 5 }),
      { operationId: op, expectedRevision: 0, section: "words", preset: "Custom words" },
      { operationId: op, expectedRevision: 0, section: "words", preset: "retail", seed: null },
      { operationId: op, expectedRevision: 0, section: "modules", disabled: ["payroll"] },
      { operationId: op, expectedRevision: 0, section: "modules", disabled: ["timeOff", "timeOff"] },
      { operationId: op, expectedRevision: 0, section: "modules", disabled: "timeOff" },
      { operationId: op, expectedRevision: 0, section: "layout" },
    ]) expect(() => parsePresentationCommand(bad), JSON.stringify(bad)).toThrow();
  });

  it("hashes the canonical command", () => {
    const a = parsePresentationCommand(brand({ expectedRevision: 1, seed: "#2563eb" }));
    const b = parsePresentationCommand(brand({ operationId: op.toUpperCase(), expectedRevision: 1, seed: "#2563EB" }));
    expect(presentationCommandHash(a)).toBe(presentationCommandHash(b));
    expect(presentationCommandHash(a)).toMatch(/^[a-f0-9]{64}$/);
    expect(presentationCommandHash({ ...a, expectedRevision: 2 })).not.toBe(presentationCommandHash(a));
  });
});

describe("mergeSettings", () => {
  const saved = { version: 1, brand: brandSettings("#7C3AED", asset), words: { preset: "retail" }, modules: { disabled: ["breaks"] } };
  it("derives and stores the colour snapshot on the server", () => {
    const settings = mergeSettings(null, { operationId: op, expectedRevision: 0, section: "brand", seed: "#FACC15", logoAssetId: asset });
    expect(settings.brand.seed).toBe("#FACC15");
    expect(settings.brand.tokens?.accent).not.toBe("#FACC15");
    expect(settings.brand.adjustments).toContain("darkened");
    expect(settings.brand.logoAssetId).toBe(asset);
  });

  it("changes only the section being saved", () => {
    const words = mergeSettings(saved, { operationId: op, expectedRevision: 1, section: "words", preset: "care" });
    expect(words).toEqual({ ...saved, words: { preset: "care" } });
    const modules = mergeSettings(saved, { operationId: op, expectedRevision: 1, section: "modules", disabled: ["timeOff"] });
    expect(modules).toEqual({ ...saved, modules: { disabled: ["timeOff"] } });
    const brand = mergeSettings(saved, { operationId: op, expectedRevision: 1, section: "brand", seed: null, logoAssetId: null });
    expect(brand.words).toEqual({ preset: "retail" });
    expect(brand.modules).toEqual({ disabled: ["breaks"] });
    expect(brand.brand.tokens).toBeNull();
  });

  it("stores a reset or a grey seed as the default", () => {
    expect(brandSettings(null, null).tokens).toBeNull();
    const grey = brandSettings("#808080", null);
    expect(grey.tokens).toBeNull();
    expect(grey.seed).toBeNull();
    expect(grey.adjustments).toEqual(["grey"]);
  });

  it("reads stored rows defensively", () => {
    expect(storedBrand(null)).toEqual({ tokens: null, logoAssetId: null, seed: null });
    expect(storedBrand({ version: 2, brand: {} }).tokens).toBeNull();
    expect(storedBrand({ version: 1, brand: { tokens: DEFAULT_TOKENS, logoAssetId: "nope", seed: "#077572" } }))
      .toEqual({ tokens: DEFAULT_TOKENS, logoAssetId: null, seed: "#077572" });
    expect(readSettings({ version: 1, brand: {}, words: { preset: "x" }, modules: { disabled: ["breaks", "nope"] } }))
      .toEqual({ version: 1, brand: DEFAULT_BRAND, modules: { disabled: ["breaks"] } });
    expect(storedModules({ version: 1, brand: {}, modules: { disabled: ["updates"] } })).toEqual({ ...ALL_MODULES_ON, updates: false });
    expect(storedModules(null)).toEqual(ALL_MODULES_ON);
  });
});

describe("modules", () => {
  it("maps portal paths to their module, keeping the Requests overview", () => {
    expect(moduleForPath("/app/requests")).toBe("timeOff");
    expect(moduleForPath("/app/requests?tab=pending")).toBe("timeOff");
    expect(moduleForPath("/app/requests/hub")).toBeNull();
    expect(moduleForPath("/app/exchange/swap")).toBe("marketplace");
    expect(moduleForPath("/app/updates/compose")).toBe("updates");
    expect(moduleForPath("/app/my-pay")).toBe("payStatements");
    expect(moduleForPath("/app/settings/breaks")).toBe("breaks");
    expect(moduleForPath("/app/updatesx")).toBeNull();
    expect(moduleForPath("/app/schedule")).toBeNull();
    expect(pathEnabled("/app/exchange", { ...ALL_MODULES_ON, marketplace: false })).toBe(false);
    expect(pathEnabled("/app/requests/hub", { ...ALL_MODULES_ON, timeOff: false })).toBe(true);
  });

  it("ignores unknown ids and explains blockers", () => {
    expect(enabledModules(["timeOff", "kudos", 7])).toEqual({ ...ALL_MODULES_ON, timeOff: false });
    expect(blockerText("timeOff", 1)).toBe("1 request for time off is waiting for a decision. Decide it first.");
    expect(blockerText("marketplace", 3)).toBe("3 shift swap or cover requests are still open. Let them finish first.");
    for (const m of MODULES) expect(m.offNote.length).toBeGreaterThan(20);
  });
});

describe("words", () => {
  it("has every slot in English and Spanish for each preset", () => {
    for (const preset of WORD_PRESETS) for (const lang of ["en", "es"] as const)
      for (const slot of ["person", "people", "location", "locations"] as const) expect(preset[lang][slot], `${preset.id} ${lang} ${slot}`).toMatch(/\S/);
    expect(wordPreset("unknown").id).toBe("standard");
    expect(lower("Team member")).toBe("team member");
  });
});

describe("logo files", () => {
  it("reads PNG and WebP dimensions from the bytes", () => {
    expect(inspectLogo(png(512, 128))).toMatchObject({ ok: true, image: { mediaType: "image/png", width: 512, height: 128 } });
    expect(inspectLogo(webpX(300, 300))).toMatchObject({ ok: true, image: { mediaType: "image/webp", width: 300, height: 300 } });
    expect(inspectLogo(webpLossless(200, 100))).toMatchObject({ ok: true, image: { mediaType: "image/webp", width: 200, height: 100 } });
    const result = inspectLogo(png(64, 64));
    expect(result.ok && result.image.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("refuses everything else", () => {
    const text = (s: string) => new TextEncoder().encode(s);
    expect(inspectLogo(new Uint8Array())).toEqual({ ok: false, problem: "empty" });
    expect(inspectLogo(text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toEqual({ ok: false, problem: "unsupported" });
    expect(inspectLogo(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(40).fill(0)]))).toEqual({ ok: false, problem: "unsupported" });
    expect(inspectLogo(png(512, 128).slice(0, 20))).toEqual({ ok: false, problem: "unsupported" });
    expect(inspectLogo(png(16, 16))).toEqual({ ok: false, problem: "too_small" });
    expect(inspectLogo(png(4096, 1024))).toEqual({ ok: false, problem: "too_big" });
    expect(inspectLogo(png(1000, 100))).toEqual({ ok: false, problem: "shape" });
    expect(inspectLogo(png(512, 512, LOGO_MAX_BYTES))).toEqual({ ok: false, problem: "too_large" });
  });

  it("parses the upload command strictly", () => {
    expect(parseLogoCommand({ operationId: op, dataBase64: "iVBORw0KGgo=" })).toEqual({ operationId: op, dataBase64: "iVBORw0KGgo=" });
    for (const bad of [{ operationId: op }, { operationId: op, dataBase64: "data:image/png;base64,AAAA" }, { operationId: op, dataBase64: "A".repeat(360_001) }, { operationId: "x", dataBase64: "AAAA" }])
      expect(() => parseLogoCommand(bad)).toThrow();
  });
});
