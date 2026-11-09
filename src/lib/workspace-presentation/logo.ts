import { createHash } from "node:crypto";

/** Company logo files (B1). Only PNG and WebP, identified from their bytes
 * rather than a file name or declared type. SVG is refused because it can
 * carry script. */
export const LOGO_MAX_BYTES = 262_144;
export const LOGO_MIN_SIDE = 32;
export const LOGO_MAX_SIDE = 2048;

export type LogoImage = { mediaType: "image/png" | "image/webp"; width: number; height: number; byteSize: number; sha256: string };
export type LogoProblem = "empty" | "too_large" | "unsupported" | "too_small" | "too_big" | "shape";

const ascii = (b: Uint8Array, at: number, text: string) => [...text].every((ch, i) => b[at + i] === ch.charCodeAt(0));
const u32be = (b: Uint8Array, at: number) => ((b[at] << 24) >>> 0) + (b[at + 1] << 16) + (b[at + 2] << 8) + b[at + 3];
const u24le = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8) | (b[at + 2] << 16);

function dimensions(b: Uint8Array): { mediaType: LogoImage["mediaType"]; width: number; height: number } | null {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length >= 24 && png.every((v, i) => b[i] === v) && ascii(b, 12, "IHDR"))
    return { mediaType: "image/png", width: u32be(b, 16), height: u32be(b, 20) };
  if (b.length >= 30 && ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP")) {
    if (ascii(b, 12, "VP8 ") && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a)
      return { mediaType: "image/webp", width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
    if (ascii(b, 12, "VP8L") && b[20] === 0x2f) {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { mediaType: "image/webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (ascii(b, 12, "VP8X")) return { mediaType: "image/webp", width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
  }
  return null;
}

export function inspectLogo(bytes: Uint8Array): { ok: true; image: LogoImage } | { ok: false; problem: LogoProblem } {
  if (!bytes.length) return { ok: false, problem: "empty" };
  if (bytes.length > LOGO_MAX_BYTES) return { ok: false, problem: "too_large" };
  const found = dimensions(bytes);
  if (!found) return { ok: false, problem: "unsupported" };
  const { width, height } = found;
  if (Math.min(width, height) < LOGO_MIN_SIDE) return { ok: false, problem: "too_small" };
  if (Math.max(width, height) > LOGO_MAX_SIDE) return { ok: false, problem: "too_big" };
  if (width / height > 4 || height / width > 4) return { ok: false, problem: "shape" };
  return { ok: true, image: { ...found, byteSize: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") } };
}

export const LOGO_PROBLEM_TEXT: Record<LogoProblem, string> = {
  empty: "Choose an image file.",
  too_large: "Use an image under 256 KB.",
  unsupported: "Use a PNG or WebP image.",
  too_small: "Use an image at least 32 pixels on each side.",
  too_big: "Use an image no larger than 2048 pixels on each side.",
  shape: "Use a logo no more than four times wider than it is tall.",
};
