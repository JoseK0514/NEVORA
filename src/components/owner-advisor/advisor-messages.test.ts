import { describe, expect, it } from '@rstest/core';
import { ADVISOR_COPY, SAME_IN_BOTH } from "./advisor-messages";

type Tree = { [key: string]: unknown };
const shape = (value: unknown): unknown => typeof value === "function" ? "fn"
  : Array.isArray(value) ? value.map(shape)
    : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(k => [k, shape((value as Tree)[k])])) : typeof value;
/** Every [path, en, es] pair of plain strings in the two tables. */
function pairs(en: unknown, es: unknown, path = ""): [string, string, string][] {
  if (typeof en === "string") return [[path, en, es as string]];
  if (en && typeof en === "object") return Object.keys(en).flatMap(k => pairs((en as Tree)[k], (es as Tree)[k], path ? `${path}.${k}` : k));
  return [];
}
const { en, es } = ADVISOR_COPY;

describe("Rondo AI words", () => {
  it("have the same keys in English and Spanish, nested groups and lists included", () => {
    expect(shape(es)).toEqual(shape(en));
  });
  it("give non-empty text from every function in both languages", () => {
    for (const t of [en, es]) {
      for (const text of [t.screen.characters(12), t.attention.showing(3, 5), t.attention.reviewedCount(1), t.attention.reviewedCount(2), t.attention.deferred("9:27 PM"),
        t.workflows.eligible(12, 20), t.workflows.eligible(12, null), t.period.payrollState(true), t.period.payrollState(false),
        t.period.issue("no_records"), t.period.issue("SOMETHING_NEW"), t.period.state("FINALIZED"), t.period.state("NEW_CODE")]) expect(text.trim().length).toBeGreaterThan(0);
    }
    expect(es.workflows.eligible(12, null)).toContain("sin definir");
    expect(es.attention.reviewedCount(1)).toBe("1 revisado");
    expect(es.period.issue("LOCATION_COVERAGE_REQUIRED")).toBe("La cobertura de localidades está incompleta.");
    expect(es.period.state("FINALIZED")).toBe("Finalizado");
    expect(en.period.issue("no_records")).toBe("No recorded time; review the period population. This does not establish absence.");
    expect(en.period.state("IN_REVIEW")).toBe("In review");
  });
  it("never leaves a Spanish line equal to its English one, except proper nouns", () => {
    for (const [path, a, b] of pairs(en, es)) if (!(SAME_IN_BOTH as readonly string[]).includes(a)) expect(b, path).not.toBe(a);
  });
  it("speak tú and say localidad in Spanish", () => {
    const all = pairs(en, es).map(([, , b]) => b).join(" ") + Object.keys(en.period).length;
    for (const word of ["Revise ", "revise ", "Intente", "intente", "ubicación", "ubicaciones", "usted", "marcajes", "¡"]) expect(all, word).not.toContain(word);
  });
});
