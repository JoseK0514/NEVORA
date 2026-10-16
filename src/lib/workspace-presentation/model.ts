import { createHash } from "node:crypto";
import { BRAND_ALGORITHM, DEFAULT_SEED, deriveBrand, normalizeSeed, type BrandTokens } from "./derive";

/** Stored brand settings (version 1). Colours are always server-derived from
 * the seed; a null seed means "NEVORA teal" and injects nothing. */
export type PresentationSettings = {
  version: 1;
  brand: {
    seed: string | null;
    algorithm: typeof BRAND_ALGORITHM;
    tokens: BrandTokens | null;
    adjustments: string[];
    logoAssetId: string | null;
  };
};
export type PresentationCommand = { operationId: string; expectedRevision: number; seed: string | null; logoAssetId: string | null };
export type LogoCommand = { operationId: string; dataBase64: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const plain = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
function exactKeys(value: Record<string, unknown>, allowed: string[]) {
  const keys = Object.keys(value);
  if (keys.length !== allowed.length || keys.some(k => !allowed.includes(k))) throw Error("Invalid presentation command");
}

export function parsePresentationCommand(value: unknown): PresentationCommand {
  if (!plain(value)) throw Error("Invalid presentation command");
  exactKeys(value, ["operationId", "expectedRevision", "seed", "logoAssetId"]);
  const { operationId, expectedRevision, seed, logoAssetId } = value;
  if (typeof operationId !== "string" || !UUID.test(operationId) ||
      !Number.isSafeInteger(expectedRevision) || Number(expectedRevision) < 0 || Number(expectedRevision) > 2147483646 ||
      !(seed === null || (typeof seed === "string" && normalizeSeed(seed))) ||
      !(logoAssetId === null || (typeof logoAssetId === "string" && UUID.test(logoAssetId))))
    throw Error("Invalid presentation command");
  const normalized = seed === null ? null : normalizeSeed(seed)!;
  return {
    operationId: operationId.toLowerCase(),
    expectedRevision: Number(expectedRevision),
    seed: normalized === DEFAULT_SEED ? null : normalized,
    logoAssetId: logoAssetId === null ? null : logoAssetId.toLowerCase(),
  };
}

export function parseLogoCommand(value: unknown): LogoCommand {
  if (!plain(value)) throw Error("Invalid logo command");
  exactKeys(value, ["operationId", "dataBase64"]);
  if (typeof value.operationId !== "string" || !UUID.test(value.operationId) ||
      typeof value.dataBase64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.dataBase64) || value.dataBase64.length > 360_000)
    throw Error("Invalid logo command");
  return { operationId: value.operationId.toLowerCase(), dataBase64: value.dataBase64 };
}

export function presentationSettings(command: PresentationCommand): PresentationSettings {
  const derived = command.seed ? deriveBrand(command.seed) : null;
  // A grey seed falls back to teal; store it as the default so nothing is injected.
  const usable = derived && !derived.adjustments.some(a => a.code === "grey");
  return {
    version: 1,
    brand: {
      seed: usable ? derived!.seed : null,
      algorithm: BRAND_ALGORITHM,
      tokens: usable ? derived!.tokens : null,
      adjustments: derived ? derived.adjustments.map(a => a.code) : [],
      logoAssetId: command.logoAssetId,
    },
  };
}

export function presentationCommandHash(command: PresentationCommand): string {
  return createHash("sha256").update("nevora:workspace-presentation:command:v1\0").update(JSON.stringify(command)).digest("hex");
}

/** Read stored settings defensively: anything unexpected renders the default. */
export function storedBrand(value: unknown): { tokens: BrandTokens | null; logoAssetId: string | null; seed: string | null } {
  if (!plain(value) || value.version !== 1 || !plain(value.brand)) return { tokens: null, logoAssetId: null, seed: null };
  const brand = value.brand;
  const tokens = plain(brand.tokens) ? (brand.tokens as BrandTokens) : null;
  const logo = typeof brand.logoAssetId === "string" && UUID.test(brand.logoAssetId) ? brand.logoAssetId : null;
  const seed = typeof brand.seed === "string" ? normalizeSeed(brand.seed) : null;
  return { tokens, logoAssetId: logo, seed };
}
