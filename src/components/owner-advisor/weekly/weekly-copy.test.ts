import { describe, expect, it } from '@rstest/core';
import { LOCATION_STATE_TEXT, MODE_TEXT, PROGRESS_TEXT, PROVENANCE_TEXT, REASON_TEXT, STATUS_TEXT, coverageText, weekText } from "@/lib/owner-advisor/weekly-client";
import { WEEKLY_COPY } from "./weekly-copy";

/* The weekly plan's words: the same keys in both languages, nothing empty, nothing left in English. */
const measure = { requiredMinutes: 1440, coveredMinutes: 1200, requiredObligationMinutes: 1440, fulfilledObligationMinutes: 1200, remainingBlocks: 2 };
const say = (value: unknown, n = 2): string => typeof value === "function"
  ? (value as (...args: unknown[]) => string)(...(value.name === "coverageText" ? [measure] : value.name === "weekText" ? ["2026-11-16"] : [n, 3]))
  : String(value);
// Words the same in both languages (proper nouns).
const SAME = new Set(["rondoAi"]);

function shape(value: unknown): unknown {
  if (typeof value === "function") return "fn";
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, shape(v)]));
  return typeof value;
}
function leaves(value: unknown, path = ""): [string, unknown][] {
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [[path, value]];
}

describe("the weekly plan's copy", () => {
  it("has the same keys, nested ones too, in English and Spanish", () => {
    expect(shape(WEEKLY_COPY.es)).toEqual(shape(WEEKLY_COPY.en));
  });
  it("fills every Spanish entry, never with the English, and every function speaks both", () => {
    const es = new Map(leaves(WEEKLY_COPY.es));
    for (const [key, en] of leaves(WEEKLY_COPY.en)) {
      const spanish = es.get(key);
      for (const n of [1, 2]) {
        expect(say(en, n).trim(), key).not.toBe("");
        expect(say(spanish, n).trim(), key).not.toBe("");
        if (!SAME.has(key)) expect(say(spanish, n), key).not.toBe(say(en, n));
      }
    }
  });
  it("keeps the English the lib already says", () => {
    const en = WEEKLY_COPY.en;
    expect(en.mode).toBe(MODE_TEXT); expect(en.reason).toBe(REASON_TEXT); expect(en.status).toBe(STATUS_TEXT);
    expect(en.provenance).toBe(PROVENANCE_TEXT); expect(en.locationState).toBe(LOCATION_STATE_TEXT); expect(en.progress).toBe(PROGRESS_TEXT);
    expect(en.weekText("2026-11-16")).toBe(weekText("2026-11-16"));
    expect(en.coverageText(measure)).toBe(coverageText(measure));
    expect(en.couldnt.compare).toBe("Couldn’t compare the plan");
    expect(en.savesLine(2, 1)).toBe("Saves 2 shifts and replaces 1 as a draft. Not published, no one notified.");
  });
  it("says weeks, counts and coverage the Puerto Rico Spanish way", () => {
    const es = WEEKLY_COPY.es;
    expect(es.weekText("2026-11-16")).toBe("16–22 nov");
    expect(es.coverageText(measure)).toBe("20 de 24 h");
    expect(es.shifts(1)).toBe("1 turno"); expect(es.shifts(3)).toBe("3 turnos");
    expect(es.blocks(1)).toBe("1 bloque"); expect(es.reviewedLocations(2)).toBe("2 localidades revisadas");
    expect(es.savesLine(1, 0)).toBe("Guarda 1 turno como borrador. Sin publicar y sin avisar a nadie.");
  });
  it("follows the Spanish rules: tú, no ¡, no English words, the glossary", () => {
    for (const [key, value] of leaves(WEEKLY_COPY.es)) {
      const text = say(value);
      expect(text, key).not.toMatch(/¡|\busted\b|\b(local|shift|draft|Owner|schedule)\b/i);
    }
  });
});
