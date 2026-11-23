import { describe, expect, it } from "@rstest/core";
import { renderToStaticMarkup } from "react-dom/server";
import type { OwnerNotebook } from "@/lib/owner-advisor/notebook";
import { NOTEBOOK_COPY } from "./notebook-copy";
import { NotebookPanel } from "./notebook-panel";
import { AdvisorLangProvider } from "./lang";

// Values that read the same in both languages: the "General" scope option.
const SAME = new Set(["scopeGeneral"]);
type Fn = (...args: unknown[]) => string;

describe("the Rondo notebook copy table", () => {
  it("has the same keys in English and Spanish", () => {
    expect(Object.keys(NOTEBOOK_COPY.es).sort()).toEqual(Object.keys(NOTEBOOK_COPY.en).sort());
    for (const key of Object.keys(NOTEBOOK_COPY.en)) expect(typeof NOTEBOOK_COPY.es[key as keyof typeof NOTEBOOK_COPY.es], key).toBe(typeof NOTEBOOK_COPY.en[key as keyof typeof NOTEBOOK_COPY.en]);
  });

  it("returns words from every function in both languages and says every Spanish value in Spanish", () => {
    for (const [key, value] of Object.entries(NOTEBOOK_COPY.es)) {
      const english = NOTEBOOK_COPY.en[key as keyof typeof NOTEBOOK_COPY.en];
      if (typeof value === "function") {
        for (const n of [0, 1, 3]) {
          const es = (value as Fn)(...Array(value.length).fill(n)), en = (english as Fn)(...Array(value.length).fill(n));
          expect(es.trim().length, key).toBeGreaterThan(2); expect(en.trim().length, key).toBeGreaterThan(2); expect(es, key).not.toBe(en);
        }
        continue;
      }
      if (SAME.has(key)) expect(value, key).toBe(english); else expect(value, key).not.toBe(english);
      expect(String(value), key).not.toMatch(/¡|\busted\b/i);
    }
    expect(NOTEBOOK_COPY.es.openCount(1)).toBe("1 abierta");
  });
});

describe("the saved goals and tasks in Spanish", () => {
  const notebook: OwnerNotebook = { revision: 1, goals: [{ id: "20000000-0000-0000-0000-000000000001", text: "Mi meta", updatedAt: "2026-10-30T12:00:00.000Z" }], tasks: [{ id: "30000000-0000-0000-0000-000000000001", objective: "Revisar", notes: "", state: "open", focus: { kind: "coverage", date: "2026-10-31" }, updatedAt: "2026-10-30T12:00:00.000Z" }] };
  it("says the lists and actions in Spanish", () => {
    const html = renderToStaticMarkup(<AdvisorLangProvider lang="es"><NotebookPanel notebook={notebook} date="2026-10-30" disabled={false} change={async () => false} selectTask={() => {}} inspect={() => {}} /></AdvisorLangProvider>);
    for (const text of ["Metas guardadas", "1 de 8", "Tus tareas", "1 abierta", "Abierta", "Cobertura", "sáb, 31 oct", "Seguir investigando", "Revisar cobertura actual",
      "Editar meta", "Quitar tarea", "Añadir tarea", "1 de 12 tareas guardadas, incluidas las cerradas.", "Guardado"]) expect(html).toContain(text);
    for (const text of ["Saved goals", "Your tasks", "Continue investigation", "Add task", "Sat, Oct 31"]) expect(html).not.toContain(text);
  });
});
