import { describe, expect, it } from "@rstest/core";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdvisorLangProvider } from "../lang";
import { answerText, dayFacts, minutesText } from "./manager-client";
import { Answer, ClosedCard, ManagerRondo, WeekCard } from "./manager-rondo";

// Fictional values (Northside QA Workforce).
const at = "2026-11-18T15:04:00.000Z";
const place = { id: "loc-1", name: "Northside Main Office" };
const days = ["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06"]
  .map((date, i) => ({ date, draftShifts: i === 1 ? 1 : 0, publishedShifts: i < 5 ? 3 : 0, releasedShifts: i === 2 ? 1 : 0, scheduledMinutes: i < 5 ? 1440 : 0 }));
const answer = (question: "scheduled_minutes" | "draft_shifts", value: number) =>
  ({ data: { weekStart: "2026-11-30", location: place, question, value, observedAt: at, validForMs: 14980 }, until: Date.now() + 14980 });
const es = (node: ReactElement) => renderToStaticMarkup(<AdvisorLangProvider lang="es">{node}</AdvisorLangProvider>).replace(/ /g, " ");

describe("Rondo AI for a Manager, in Spanish", () => {
  it("opens in Spanish", () => {
    const html = es(<ManagerRondo currentWeek="2026-11-30" timeZone="America/Puerto_Rico" read={async () => ({ kind: "aborted" })} />);
    expect(html).toContain("Rondo AI");
    expect(html).toContain("Pregunta sobre tu horario");
    expect(html).toContain("Abriendo Rondo AI");
    expect(html).toContain("Revisando tus localidades.");
    expect(html).toContain(">Más<");
    for (const word of ["Opening Rondo AI", "Ask about your schedule", ">More<"]) expect(html).not.toContain(word);
  });

  it("answers in Spanish, with Spanish dates and times", () => {
    const html = es(<Answer question="scheduled_minutes" answer={answer("scheduled_minutes", 450)} state="idle" timeZone="America/Puerto_Rico" hidden={false} onRetry={() => {}} />);
    expect(html).toContain("¿Cuántas horas hay programadas?");
    expect(html).toContain("7 h 30 min");
    expect(html).toContain("Tiempo planificado del horario.");
    expect(html).toContain("Preguntaste: ");
    expect(html).toContain("Revisado 11:04 a. m.");
    expect(html).toContain("30 nov–6 dic");
    for (const word of ["How many", "Checked", "You asked", "Planned time", "AM"]) expect(html).not.toContain(word);
  });

  it("says a failed answer in Spanish", () => {
    const html = es(<Answer question="draft_shifts" answer={null} state="unavailable" timeZone="UTC" hidden={false} onRetry={() => {}} />);
    expect(html).toContain("No pudimos obtener una respuesta");
    expect(html).toContain("Intentar de nuevo");
    expect(html).toContain("Revisa tu conexión y vuelve a intentarlo.");
    expect(html).not.toContain("Try again");
  });

  it("reads the week day by day in Spanish", () => {
    const html = es(<WeekCard summary={{ data: { weekStart: "2026-11-30", location: place, days, observedAt: at, validForMs: 14980 }, until: Date.now() + 14980 }}
      state="idle" hidden={false} now={Date.now()} onRetry={() => {}} onShow={() => {}} />);
    expect(html).toContain("lun, 30 nov");
    expect(html).toContain("3 turnos");
    expect(html).toContain("1 borrador");
    expect(html).toContain("1 liberado");
    expect(html).toContain("Sin turnos");
    expect(html).toContain("Semana del 30 nov–6 dic");
    for (const word of ["Mon, Nov 30", "shifts", "released", "No shifts", "Week of"]) expect(html).not.toContain(word);
  });

  it("gives every closed state its Spanish way on", () => {
    expect(es(<ClosedCard why="session" />)).toContain("Iniciar sesión");
    for (const why of ["disabled", "forbidden"] as const) {
      const html = es(<ClosedCard why={why} />);
      expect(html).toContain("Volver a Inicio");
      expect(html).not.toContain("Return to Home");
    }
  });

  it("keeps the client's words in Spanish when asked", () => {
    expect(answerText({ question: "published_shifts", value: 0 }, "es")).toEqual({ figure: "0 turnos", line: "No hay nada publicado para esta semana." });
    expect(answerText({ question: "released_shifts", value: 1 }, "es").figure).toBe("1 turno");
    expect(dayFacts({ date: "2026-11-30", draftShifts: 2, publishedShifts: 0, releasedShifts: 0, scheduledMinutes: 0 }, "es")).toEqual(["2 borradores"]);
    expect(minutesText(45, "es")).toBe("45 min");
  });
});
