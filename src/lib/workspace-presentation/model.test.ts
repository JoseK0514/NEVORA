import { describe, expect, it } from "vitest";
import { DEFAULT_TOKENS } from "./derive";
import { inspectLogo, LOGO_MAX_BYTES } from "./logo";
import { parseLogoCommand, parsePresentationCommand, presentationCommandHash, presentationSettings, storedBrand } from "./model";

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
  it("accepts a seed or a reset and normalizes them", () => {
    expect(parsePresentationCommand({ operationId: op.toUpperCase(), expectedRevision: 0, seed: "#2563eb", logoAssetId: null }))
      .toEqual({ operationId: op, expectedRevision: 0, seed: "#2563EB", logoAssetId: null });
    // Choosing NEVORA teal is the same as no brand.
    expect(parsePresentationCommand({ operationId: op, expectedRevision: 3, seed: "#077572", logoAssetId: asset }).seed).toBeNull();
  });

  it("rejects anything else", () => {
    const good = { operationId: op, expectedRevision: 0, seed: null, logoAssetId: null };
    for (const bad of [
      null, [], "x", { ...good, extra: 1 }, { operationId: op, expectedRevision: 0, seed: null },
      { ...good, operationId: "not-a-uuid" }, { ...good, expectedRevision: -1 }, { ...good, expectedRevision: 1.5 },
      { ...good, expectedRevision: 2147483647 }, { ...good, seed: "blue" }, { ...good, seed: "#12345" },
      { ...good, seed: "#000;}body{x:y" }, { ...good, logoAssetId: "../etc" }, { ...good, logoAssetId: 5 },
    ]) expect(() => parsePresentationCommand(bad), JSON.stringify(bad)).toThrow();
  });

  it("hashes the canonical command", () => {
    const a = parsePresentationCommand({ operationId: op, expectedRevision: 1, seed: "#2563eb", logoAssetId: null });
    const b = parsePresentationCommand({ operationId: op.toUpperCase(), expectedRevision: 1, seed: "#2563EB", logoAssetId: null });
    expect(presentationCommandHash(a)).toBe(presentationCommandHash(b));
    expect(presentationCommandHash(a)).toMatch(/^[a-f0-9]{64}$/);
    expect(presentationCommandHash({ ...a, expectedRevision: 2 })).not.toBe(presentationCommandHash(a));
  });
});

describe("presentationSettings", () => {
  it("derives and stores the colour snapshot on the server", () => {
    const settings = presentationSettings({ operationId: op, expectedRevision: 0, seed: "#FACC15", logoAssetId: asset });
    expect(settings.version).toBe(1);
    expect(settings.brand.seed).toBe("#FACC15");
    expect(settings.brand.tokens?.accent).not.toBe("#FACC15");
    expect(settings.brand.adjustments).toContain("darkened");
    expect(settings.brand.logoAssetId).toBe(asset);
  });

  it("stores a reset or a grey seed as the default", () => {
    expect(presentationSettings({ operationId: op, expectedRevision: 0, seed: null, logoAssetId: null }).brand.tokens).toBeNull();
    const grey = presentationSettings({ operationId: op, expectedRevision: 0, seed: "#808080", logoAssetId: null });
    expect(grey.brand.tokens).toBeNull();
    expect(grey.brand.seed).toBeNull();
    expect(grey.brand.adjustments).toEqual(["grey"]);
  });

  it("reads stored rows defensively", () => {
    expect(storedBrand(null)).toEqual({ tokens: null, logoAssetId: null, seed: null });
    expect(storedBrand({ version: 2, brand: {} }).tokens).toBeNull();
    expect(storedBrand({ version: 1, brand: { tokens: DEFAULT_TOKENS, logoAssetId: "nope", seed: "#077572" } }))
      .toEqual({ tokens: DEFAULT_TOKENS, logoAssetId: null, seed: "#077572" });
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
