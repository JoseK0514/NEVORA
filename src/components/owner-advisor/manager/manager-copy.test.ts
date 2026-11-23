import { describe, expect, it } from "@rstest/core";
import { MANAGER_COPY } from "./manager-copy";

// Values that read the same in both languages: the product's name and the counts' own units.
const SAME = new Set(["title"]);
const keys = (value: unknown): unknown => value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, keys((value as Record<string, unknown>)[key])])) : typeof value;
const leaves = (value: object, at = ""): [string, unknown][] => Object.entries(value).flatMap(([key, item]) =>
  item && typeof item === "object" ? leaves(item, `${at}${key}.`) : [[`${at}${key}`, item] as [string, unknown]]);

describe("the Manager Rondo copy table", () => {
  it("has the same keys in English and Spanish", () => {
    expect(keys(MANAGER_COPY.es)).toEqual(keys(MANAGER_COPY.en));
  });

  it("returns words from every function in both languages", () => {
    for (const lang of ["en", "es"] as const) {
      const t = MANAGER_COPY[lang];
      for (const text of [t.asked("Q?"), t.checkedAt("3:04 PM"), t.weekOf("Nov 30 – Dec 6"), t.shifts("1", true), t.shifts("3", false),
        t.drafts("1", true), t.drafts("2", false), t.released("1", true), t.released("2", false)]) expect(text.trim().length).toBeGreaterThan(2);
    }
    expect(MANAGER_COPY.es.shifts("1", true)).toBe("1 turno");
    expect(MANAGER_COPY.es.drafts("2", false)).toBe("2 borradores");
    expect(MANAGER_COPY.es.released("1", true)).toBe("1 liberado");
  });

  it("says every Spanish value in Spanish", () => {
    const en = new Map(leaves(MANAGER_COPY.en));
    for (const [key, value] of leaves(MANAGER_COPY.es)) {
      if (typeof value === "function") {
        expect((value as (a: string, b: boolean) => string)("x", false), key).not.toBe((en.get(key) as (a: string, b: boolean) => string)("x", false));
        continue;
      }
      if (SAME.has(key)) expect(value, key).toBe(en.get(key));
      else expect(value, key).not.toBe(en.get(key));
      expect(String(value), key).not.toMatch(/¡|\busted\b/i);
    }
  });
});
