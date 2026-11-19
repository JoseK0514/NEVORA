import { describe, expect, it } from "vitest";
import {
  BUSINESS_ERROR_CODES, BUSINESS_FINDING_CODES, BUSINESS_QUALIFIER_CODES, BUSINESS_SCENARIO_UNAVAILABLE_CODES, BUSINESS_UNAVAILABLE_CODES, BUSINESS_VALIDATION_CODES, BUSINESS_VALIDATION_FIELDS,
} from "@/lib/owner-advisor/business/contracts";
import { CONSTANT_FIELDS, RECORD_FIELDS, RECORD_KINDS } from "./business-client";
import { BUSINESS_COPY, type BusinessLang } from "./copy";

const langs: BusinessLang[] = ["en", "es"];
/** Every string the module can produce, with its path (functions are called with sample values). */
function strings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value === "function") return strings((value as (...args: unknown[]) => unknown)(path.endsWith("notConfirmedLine") ? "publish" : path.endsWith("problemAt") ? 4 : path.endsWith("age") ? 1440 : 2, 5), path);
  if (Array.isArray(value)) return value.flatMap((item, index) => strings(item, `${path}[${index}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => strings(item, path ? `${path}.${key}` : key));
  return [];
}

describe("business records copy", () => {
  it.each([
    ["finding", BUSINESS_FINDING_CODES], ["qualifier", BUSINESS_QUALIFIER_CODES], ["unavailable", BUSINESS_UNAVAILABLE_CODES], ["scenarioUnavailable", BUSINESS_SCENARIO_UNAVAILABLE_CODES],
    ["validation", BUSINESS_VALIDATION_CODES], ["validationField", BUSINESS_VALIDATION_FIELDS], ["transport", BUSINESS_ERROR_CODES],
  ] as const)("has reviewed English and Spanish for every code of the closed %s list, and no others", (key, codes) => {
    for (const lang of langs) {
      const table = BUSINESS_COPY[lang][key] as Record<string, string>;
      expect(Object.keys(table).sort(), `${lang}.${key}`).toEqual([...codes].sort());
      for (const code of codes) expect(table[code]?.trim().length, `${lang}.${key}.${code}`).toBeGreaterThan(2);
    }
  });
  it("names every importable field and row type in both languages", () => {
    for (const lang of langs) {
      const t = BUSINESS_COPY[lang];
      for (const field of new Set([...RECORD_FIELDS.FINANCE, ...RECORD_FIELDS.SALES, ...CONSTANT_FIELDS.FINANCE, ...CONSTANT_FIELDS.SALES])) expect(t.field[field], `${lang} ${field}`).toBeTruthy();
      for (const kind of [...RECORD_KINDS.FINANCE, ...RECORD_KINDS.SALES]) expect(t.kind[kind], `${lang} ${kind}`).toBeTruthy();
    }
  });
  it("has the same keys in English and Spanish, with no empty string", () => {
    const en = strings(BUSINESS_COPY.en), es = strings(BUSINESS_COPY.es);
    expect(es.map(([path]) => path)).toEqual(en.map(([path]) => path));
    for (const [path, text] of [...en, ...es]) expect(text.trim(), path).not.toBe("");
  });
  it("keeps the house rules: no system words, filler, exclamation marks or em dashes", () => {
    const banned = /payload|operation id|entity|resource|request id|simply|\bjust\b|seamless|successfully|oops|simplemente|exitosamente|[!¡—]|[A-Z]{3,}_[A-Z_]+/i;
    for (const lang of langs) for (const [path, text] of strings(BUSINESS_COPY[lang])) expect(banned.test(text), `${lang}.${path}: ${text}`).toBe(false);
  });
  it("does not leave an English sentence in the Spanish entries", () => {
    const same = strings(BUSINESS_COPY.es).filter(([path, text], index) => text === strings(BUSINESS_COPY.en)[index][1] && /[a-z]{4,}/i.test(text) && !/^(Rondo|Rondo AI|OK|Euros \(EUR\))$/.test(text) && !path.startsWith("currencyName"));
    expect(same).toEqual([]);
  });
});
