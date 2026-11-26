import { describe, expect, it } from "@rstest/core";
import { renderToStaticMarkup } from "react-dom/server";
import { ownerCoverageAction } from "@/test/fixtures/owner-coverage-action";
import { ownerCoveragePlan } from "@/test/fixtures/owner-coverage-plan";
import { COVERAGE_COPY } from "./coverage-copy";
import { CoverageActionPanel } from "./coverage-actions";
import { CoveragePlanResults } from "./coverage-plans";
import { AdvisorLangProvider } from "./lang";

// Values that read the same in both languages: "Plan 1 · …" (the same word in Spanish).
const SAME = new Set(["plans.planHeading"]);
const keys = (value: unknown): unknown => value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, keys((value as Record<string, unknown>)[key])])) : typeof value;
const leaves = (value: object, at = ""): [string, unknown][] => Object.entries(value).flatMap(([key, item]) =>
  item && typeof item === "object" ? leaves(item, `${at}${key}.`) : [[`${at}${key}`, item] as [string, unknown]]);
type Fn = (...args: unknown[]) => string;
const call = (key: string, fn: Fn, n: number) => key === "zone" ? fn("America/Puerto_Rico") : fn(...Array(fn.length).fill(n));
const actions = { acknowledge: () => {}, save: async () => {}, recover: async () => {}, check: async () => {}, dismiss: () => {} };

describe("the Rondo coverage copy table", () => {
  it("has the same keys in English and Spanish", () => {
    expect(keys(COVERAGE_COPY.es)).toEqual(keys(COVERAGE_COPY.en));
  });

  it("returns words from every function in both languages and says every Spanish value in Spanish", () => {
    const en = new Map(leaves(COVERAGE_COPY.en));
    for (const [key, value] of leaves(COVERAGE_COPY.es)) {
      if (typeof value === "function") {
        for (const n of [0, 1, 3]) {
          const es = call(key, value as Fn, n), english = call(key, en.get(key) as Fn, n);
          expect(es.trim().length, key).toBeGreaterThan(2); expect(english.trim().length, key).toBeGreaterThan(2);
          if (SAME.has(key)) expect(es, key).toBe(english); else expect(es, key).not.toBe(english);
          expect(es, key).not.toMatch(/¡|\busted\b/i);
        }
        continue;
      }
      if (SAME.has(key)) expect(value, key).toBe(en.get(key)); else expect(value, key).not.toBe(en.get(key));
      expect(String(value), key).not.toMatch(/¡|\busted\b/i);
    }
    expect(COVERAGE_COPY.es.zone("America/Puerto_Rico")).toBe("Hora de Puerto Rico");
    expect(COVERAGE_COPY.en.zone("America/Puerto_Rico")).toBe("Puerto Rico time");
    expect(COVERAGE_COPY.es.slots(1, true)).toBe("1 franja horaria aún necesitaría a alguien.");
    expect(COVERAGE_COPY.es.draft.save(2)).toBe("Guardar 2 borradores");
  });
});

describe("the coverage screens in Spanish", () => {
  const es = (node: React.ReactNode) => renderToStaticMarkup(<AdvisorLangProvider lang="es">{node}</AdvisorLangProvider>);

  it("says the reviewed draft in Spanish", () => {
    const html = es(<CoverageActionPanel view={{ stage: "review", result: ownerCoverageAction(), lastSavedAt: null, acknowledged: false, message: "" }} actions={actions} />);
    for (const text of ["Revisar cambios del borrador", "Cobertura · Solo borrador", "jue, 22 oct", "Hora de Puerto Rico", "8:00\u00a0a.\u00a0m. – 12:00\u00a0p.\u00a0m. · 4 h",
      "No quedaría ninguna franja horaria sin cubrir.", "Miembro del equipo", "Guardar 1 borrador", "Volver a la comparación", "Revisé estas asignaciones"]) expect(html).toContain(text);
    for (const text of ["Review draft changes", "Team member", "Back to comparison", "Puerto Rico time", " AM"]) expect(html).not.toContain(text);
  });

  it("says the saved draft, its progress and the controller's message in Spanish", () => {
    const html = es(<CoverageActionPanel view={{ stage: "saved", result: ownerCoverageAction("coverage_checked"), lastSavedAt: null, acknowledged: false, message: "Draft information is hidden until your access is refreshed.", messageCode: "paused" }} actions={actions} />);
    for (const text of ["Borrador guardado", "No se publicó ningún horario ni se notificó a nadie.", "0 de 1 publicadas", "Cubierto el jue, 22 oct: 4 h de las 4 h que necesitan a alguien.",
      "Verificar progreso", "Abrir este horario", "La información del borrador está oculta"]) expect(html).toContain(text);
    for (const text of ["Draft saved", "Check progress", "Draft information is hidden"]) expect(html).not.toContain(text);
  });

  it("says the day plan comparison in Spanish", () => {
    const plans = ownerCoveragePlan(); plans.alternatives[0].assignments[0].positionId = null;
    const html = es(<CoveragePlanResults plans={plans} review={() => {}} />);
    for (const text of ["Comparación de planes del día · jue, 22 oct", "Incluye turnos en borrador", "Hora de Puerto Rico", "Horario actual", "Añade 4 h en 1 asignación",
      "Cada plan es una opción aparte.", "Las horas añadidas no muestran costo laboral ni ahorros.", "Revisar cambios del borrador"]) expect(html).toContain(text);
    expect(html).toMatch(/8:00\u00a0a\.\u00a0m\.\s–\s12:00\u00a0p\.\u00a0m\./);
    for (const text of ["Day plan comparison", "Current schedule", "Adds 4 h", "labor cost", "Puerto Rico time"]) expect(html).not.toContain(text);
  });
});
