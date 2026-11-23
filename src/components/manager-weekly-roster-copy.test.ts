import { describe, expect, it } from "@rstest/core";
import { ROSTER_COPY } from "./manager-weekly-roster-copy";

type Leaf = [path: string, kind: string, arity: number];
/** Every key path of a copy table with its kind and, for a function, its arity. */
function leaves(value: unknown, path = ""): Leaf[] {
  if (typeof value === "function") return [[path, "function", value.length]];
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => leaves(item, path ? `${path}.${key}` : key));
  return [[path, typeof value, 0]];
}
/** Each value as text, functions called with sample arguments. */
function texts(table: Record<string, unknown>) {
  return Object.entries(table).map(([key, value]) => [key, typeof value === "function"
    ? String((value as (...args: unknown[]) => unknown)(...(/Day$|dayLabel|Weekday|cardDay/.test(key) && !/^(fillOnDay|openShiftsOn)$/.test(key) ? ["2026-12-07"] : key === "clock" ? ["6:00 AM – 2:00 PM"] : ["Ana Colón", "lunes", "7 dic", "6:00 a. m.", "2:00 p. m.", "Condado"])))
    : String(value)] as const);
}

describe("Schedule week grid copy (Puerto Rico Spanish)", () => {
  it("has the same keys, kinds and function arities in English and Spanish", () => {
    expect(leaves(ROSTER_COPY.es)).toEqual(leaves(ROSTER_COPY.en));
  });
  it("writes tú-form Spanish with no opening exclamation mark, no usted and no English left over", () => {
    for (const [key, words] of texts(ROSTER_COPY.es)) {
      expect(words.trim().length, key).toBeGreaterThan(0);
      expect(words, key).not.toMatch(/[¡]|\busted(es)?\b|\bsu horario\b/i);
      expect(words, key).not.toMatch(/\b(shift|shifts|Open|Fill|Today|Draft|Published|Time off|cover)\b/);
    }
  });
  it("uses the glossary", () => {
    const es = ROSTER_COPY.es;
    expect([es.schedule, es.openShift, es.findCover, es.fill, es.draft, es.published, es.changed, es.timeOff, es.today, es.notFilled, es.noOneAssigned])
      .toEqual(["Horario", "Turno disponible", "Buscar cobertura", "Cubrir", "Borrador", "Publicado", "Cambiado", "Días libres", "Hoy", "Sin cubrir", "Sin asignar"]);
  });
  it("counts in the singular and the plural", () => {
    const { en, es } = ROSTER_COPY;
    expect([en.shifts(1), en.shifts(3), es.shifts(1), es.shifts(3)]).toEqual(["1 shift", "3 shifts", "1 turno", "3 turnos"]);
    expect([en.people(1), en.people(2), es.people(1), es.people(2)]).toEqual(["1 person", "2 people", "1 persona", "2 personas"]);
    expect([es.openShiftsCount(1), es.openShiftsCount(4), es.openChip(1), es.openChip(4)]).toEqual(["1 turno disponible", "4 turnos disponibles", "1 disponible", "4 disponibles"]);
    expect([es.someOver(1), es.someOver(2), es.allOver(1), es.allOver(2)]).toEqual([", 1 ya pasó", ", 2 ya pasaron", ", ya pasó, sin cubrir", ", ya pasaron, sin cubrir"]);
    expect([en.someOver(2), en.allOver(2)]).toEqual([", 2 already over", ", already over, not filled"]);
  });
  it("writes Spanish dates lower case and times as a. m. and p. m., and leaves English as it was", () => {
    const { en, es } = ROSTER_COPY;
    expect(es.dayLabel("2026-12-07")).toEqual({ weekday: "lun", day: "7 dic" });
    expect(es.longWeekday("2026-12-07")).toBe("lunes");
    expect(es.cardDay("2026-12-07")).toBe("lun, 7 dic");
    expect(es.clock("6:00 AM – 2:00 PM")).toBe("6:00 a. m. – 2:00 p. m.");
    expect(es.clock("All day")).toBe("Todo el día");
    expect(en.dayLabel("2026-12-07")).toEqual({ weekday: "Mon", day: "Dec 7" });
    expect(en.cardDay("2026-12-07")).toBe("Mon, Dec 7");
    expect(en.clock("6:00 AM – 2:00 PM")).toBe("6:00 AM – 2:00 PM");
  });
});
