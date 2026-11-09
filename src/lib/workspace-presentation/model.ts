import { createHash } from "node:crypto";
import { BRAND_ALGORITHM, DEFAULT_SEED, deriveBrand, normalizeSeed, type BrandTokens } from "./derive";
import { MODULE_IDS, enabledModules, type EnabledModules, type ModuleId } from "./modules";
import { WORD_PRESET_IDS, type WordPresetId } from "./words";

/** Stored presentation settings (version 1): brand (B1), words and modules
 * (B2). Colours are always server-derived; a null seed means NEVORA teal. */
export type BrandSettings = {
  seed: string | null;
  algorithm: typeof BRAND_ALGORITHM;
  tokens: BrandTokens | null;
  adjustments: string[];
  logoAssetId: string | null;
};
export type PresentationSettings = {
  version: 1;
  brand: BrandSettings;
  words?: { preset: WordPresetId };
  modules?: { disabled: ModuleId[] };
};

type Base = { operationId: string; expectedRevision: number };
/** One section per save, so editing words never touches the brand. */
export type PresentationCommand =
  | (Base & { section: "brand"; seed: string | null; logoAssetId: string | null })
  | (Base & { section: "words"; preset: WordPresetId })
  | (Base & { section: "modules"; disabled: ModuleId[] });
export type LogoCommand = { operationId: string; dataBase64: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const plain = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
function exactKeys(value: Record<string, unknown>, allowed: string[]) {
  const keys = Object.keys(value);
  if (keys.length !== allowed.length || keys.some(k => !allowed.includes(k))) throw Error("Invalid presentation command");
}

/**
 * Validates exactly one editable section and canonicalizes IDs, colour and
 * module ordering before command hashing. Call this before comparing/replaying
 * operation IDs; semantically identical submissions need the same hash.
 */
export function parsePresentationCommand(value: unknown): PresentationCommand {
  if (!plain(value)) throw Error("Invalid presentation command");
  const { operationId, expectedRevision, section } = value;
  if (typeof operationId !== "string" || !UUID.test(operationId) ||
      !Number.isSafeInteger(expectedRevision) || Number(expectedRevision) < 0 || Number(expectedRevision) > 2147483646)
    throw Error("Invalid presentation command");
  const base = { operationId: operationId.toLowerCase(), expectedRevision: Number(expectedRevision) };
  if (section === "brand") {
    exactKeys(value, ["operationId", "expectedRevision", "section", "seed", "logoAssetId"]);
    const { seed, logoAssetId } = value;
    if (!(seed === null || (typeof seed === "string" && normalizeSeed(seed))) ||
        !(logoAssetId === null || (typeof logoAssetId === "string" && UUID.test(logoAssetId)))) throw Error("Invalid presentation command");
    const normalized = seed === null ? null : normalizeSeed(seed)!;
    return { ...base, section, seed: normalized === DEFAULT_SEED ? null : normalized, logoAssetId: logoAssetId === null ? null : logoAssetId.toLowerCase() };
  }
  if (section === "words") {
    exactKeys(value, ["operationId", "expectedRevision", "section", "preset"]);
    if (!WORD_PRESET_IDS.includes(value.preset as WordPresetId)) throw Error("Invalid presentation command");
    return { ...base, section, preset: value.preset as WordPresetId };
  }
  if (section === "modules") {
    exactKeys(value, ["operationId", "expectedRevision", "section", "disabled"]);
    const disabled = value.disabled;
    if (!Array.isArray(disabled) || disabled.length > MODULE_IDS.length || disabled.some(id => !MODULE_IDS.includes(id as ModuleId)) || new Set(disabled).size !== disabled.length)
      throw Error("Invalid presentation command");
    // Canonical order, so the same choice always hashes the same.
    return { ...base, section, disabled: MODULE_IDS.filter(id => disabled.includes(id)) };
  }
  throw Error("Invalid presentation command");
}

export function parseLogoCommand(value: unknown): LogoCommand {
  if (!plain(value)) throw Error("Invalid logo command");
  exactKeys(value, ["operationId", "dataBase64"]);
  if (typeof value.operationId !== "string" || !UUID.test(value.operationId) ||
      typeof value.dataBase64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.dataBase64) || value.dataBase64.length > 360_000)
    throw Error("Invalid logo command");
  return { operationId: value.operationId.toLowerCase(), dataBase64: value.dataBase64 };
}

export const DEFAULT_BRAND: BrandSettings = { seed: null, algorithm: BRAND_ALGORITHM, tokens: null, adjustments: [], logoAssetId: null };

export function brandSettings(seed: string | null, logoAssetId: string | null): BrandSettings {
  const derived = seed ? deriveBrand(seed) : null;
  // A grey seed falls back to teal; store it as the default so nothing is injected.
  const usable = derived && !derived.adjustments.some(a => a.code === "grey");
  return {
    seed: usable ? derived!.seed : null,
    algorithm: BRAND_ALGORITHM,
    tokens: usable ? derived!.tokens : null,
    adjustments: derived ? derived.adjustments.map(a => a.code) : [],
    logoAssetId,
  };
}

/** The full settings after applying one section on top of the latest saved ones. */
export function mergeSettings(latest: unknown, command: PresentationCommand): PresentationSettings {
  const current = readSettings(latest);
  const next: PresentationSettings = { version: 1, brand: current.brand,
    ...(current.words ? { words: current.words } : {}), ...(current.modules ? { modules: current.modules } : {}) };
  if (command.section === "brand") next.brand = brandSettings(command.seed, command.logoAssetId);
  if (command.section === "words") next.words = { preset: command.preset };
  if (command.section === "modules") next.modules = { disabled: command.disabled };
  return next;
}

/** Hashes a parsed canonical command, including expectedRevision, for operation replay checks. */
export function presentationCommandHash(command: PresentationCommand): string {
  return createHash("sha256").update("nevora:workspace-presentation:command:v2\0").update(JSON.stringify(command)).digest("hex");
}

/** Read stored settings defensively; anything unexpected becomes the default. */
export function readSettings(value: unknown): PresentationSettings {
  if (!plain(value) || value.version !== 1) return { version: 1, brand: DEFAULT_BRAND };
  const brand = plain(value.brand) ? value.brand : {};
  const settings: PresentationSettings = {
    version: 1,
    brand: {
      seed: typeof brand.seed === "string" ? normalizeSeed(brand.seed) : null,
      algorithm: BRAND_ALGORITHM,
      tokens: plain(brand.tokens) ? (brand.tokens as BrandTokens) : null,
      adjustments: Array.isArray(brand.adjustments) ? brand.adjustments.filter((a): a is string => typeof a === "string") : [],
      logoAssetId: typeof brand.logoAssetId === "string" && UUID.test(brand.logoAssetId) ? brand.logoAssetId : null,
    },
  };
  if (plain(value.words) && WORD_PRESET_IDS.includes(value.words.preset as WordPresetId)) settings.words = { preset: value.words.preset as WordPresetId };
  if (plain(value.modules) && Array.isArray(value.modules.disabled)) settings.modules = { disabled: MODULE_IDS.filter(id => (value.modules as { disabled: unknown[] }).disabled.includes(id)) };
  return settings;
}

/** Kept for the B1 readers. */
export function storedBrand(value: unknown): { tokens: BrandTokens | null; logoAssetId: string | null; seed: string | null } {
  const { brand } = readSettings(value);
  return { tokens: brand.tokens, logoAssetId: brand.logoAssetId, seed: brand.seed };
}

export function storedModules(value: unknown): EnabledModules {
  return enabledModules(readSettings(value).modules?.disabled);
}
