import { expect, it } from "@rstest/core";
import { briefingDetail, briefingSource, briefingTitle } from "./briefing-text";
import { copy } from "./attention-copy";

it("localizes only application wording and keeps custom source names and new detail text", () => {
  expect(briefingSource("Today on the floor", "es")).toBe("Personal de hoy");
  expect(briefingSource("West Office", "es")).toBe("West Office");
  expect(briefingTitle("clock_in", copy.en.clockTitle, "es")).toBe("Revisar turnos sin entrada");
  expect(briefingTitle("clock_in", "A saved issue title", "es")).toBe("A saved issue title");
  expect(briefingDetail("A new finding", "coverage", "es")).toBe("A new finding");
});

it("uses the actual count, clock time, lead and position names from the briefing", () => {
  const source = "2 planning periods need review, starting 13:05. Maximum staffing shortfall: 3. A designated lead is missing. Unfilled positions: Front counter, Café. " + copy.en.draftNote;
  const result = briefingDetail(source, "coverage", "es");
  expect(result).toContain("Hay 2 períodos por revisar a partir de la 1:05\u00a0p.\u00a0m.");
  expect(result).toContain("faltan:\u00a03.");
  expect(result).toContain("Falta un líder designado. Puestos sin cubrir: Front counter, Café.");
  expect(result.endsWith(copy.es.draftNote)).toBe(true);
  expect(briefingDetail("1 planning periods need review, starting 08:15. Maximum staffing shortfall: 1.", "coverage", "es")).toContain("Hay 1 período por revisar a partir de las 8:15");
  expect(briefingDetail(copy.en.clockOne.replace("{n}", "1"), "clock_in", "es")).toBe(copy.es.clockOne.replace("{n}", "1"));
  expect(briefingDetail(copy.en.finishedOther.replace("{n}", "7"), "missing_punches", "es")).toBe(copy.es.finishedOther.replace("{n}", "7"));
  expect(briefingDetail(source, "coverage", "en")).toContain("Maximum staffing shortfall:");
});
