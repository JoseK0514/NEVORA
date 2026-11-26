import { expect, it } from "@rstest/core";
import { OWNER_B_COPY } from "./owner-b-copy";

function copyEntries(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix + key;
    if (entry && typeof entry === "object" && !(entry instanceof RegExp)) {
      return copyEntries(entry as Record<string, unknown>, path + ".");
    }
    return [`${path}:${typeof entry === "function" ? entry.length : typeof entry}`];
  });
}

it("provides the same keys and formatter arguments in both languages", () => {
  expect(copyEntries(OWNER_B_COPY.es).sort()).toEqual(copyEntries(OWNER_B_COPY.en).sort());
});

it("keeps the Home employee action available to screen readers with the approved short label", () => {
  expect(OWNER_B_COPY.es.home.shortcut.employee).toBe("Empleado");
  expect(OWNER_B_COPY.es.home.employeeShortcutDescription).toBe("Añadir empleado");
  expect(OWNER_B_COPY.en.home.shortcut.employee).toBe("Add employee");
  expect(OWNER_B_COPY.en.home.employeeShortcutDescription).toBe("");
});

it("keeps the compact Spanish Home and Pendientes action in its accessible name", () => {
  const shift = "5:30 p. m. – 12:00 a. m.";
  for (const { findCover, findCoverFor } of [OWNER_B_COPY.es.home, OWNER_B_COPY.es.inbox]) {
    expect(findCover).toBe("Cubrir");
    expect(findCoverFor(shift)).toBe(`${findCover} turno: ${shift}`);
  }
});

it("keeps Home coverage actions short and preserves the shift count", () => {
  expect([OWNER_B_COPY.es.home.coverOne, OWNER_B_COPY.es.home.coverMany]).toEqual(["Cubrir turno", "Cubrir turnos"]);
  expect([OWNER_B_COPY.en.home.coverOne, OWNER_B_COPY.en.home.coverMany]).toEqual(["Cover an open shift", "Cover open shifts"]);
});

it("uses Jose’s short wording only for the Spanish attendance figure on Home", () => {
  expect(OWNER_B_COPY.es.home.notClockedInShort).toBe("Sin ponchar");
  expect(OWNER_B_COPY.en.home.notClockedInShort).toBe("Not clocked in");
});

it("keeps both Spanish labels for the open-shift count on Home", () => {
  expect(OWNER_B_COPY.es.home.openShiftsShort).toBe("Sin cubrir");
  expect(OWNER_B_COPY.es.home.openShifts).toBe("Turnos disponibles");
});

it("keeps the add-shift shortcut action in the compact Spanish wording", () => {
  expect(OWNER_B_COPY.es.home.shiftShortcutShort).toBe("Turno");
  expect(OWNER_B_COPY.es.home.shortcut.shift).toBe("Añadir turno");
  expect(OWNER_B_COPY.en.home.shiftShortcutShort).toBe(OWNER_B_COPY.en.home.shortcut.shift);
});


it("keeps the compact review actions and the complete link names for Manager Home", () => {
  const { home } = OWNER_B_COPY.es;
  expect([home.reviewTimecardsShort, home.reviewTimecards]).toEqual(["Revisar", "Revisar tarjetas de tiempo"]);
  expect([home.seeWeekHoursShort, home.seeWeekHours]).toEqual(["Ver horas", "Ver las horas de la semana"]);
  expect(OWNER_B_COPY.en.home.reviewTimecardsShort).toBe(OWNER_B_COPY.en.home.reviewTimecards);
  expect(OWNER_B_COPY.en.home.seeWeekHoursShort).toBe(OWNER_B_COPY.en.home.seeWeekHours);
});

it("describes the listed employee’s active shift on management Home", () => {
  expect(OWNER_B_COPY.es.home.stillClockedInSince("9:02 a. m.")).toBe("Turno activo desde las 9:02 a. m.");
  expect(OWNER_B_COPY.en.home.stillClockedInSince("9:02 AM")).toBe("Still clocked in since 9:02 AM");
});

it.each([
  ["1:00 a. m.", "la"],
  ["1:05\u00a0p.\u00a0m.", "la"],
  ["11:05 p. m.", "las"],
  ["12:00 a. m.", "las"],
])("uses the Spanish article for the clock-in hour in %s", (time, article) => {
  expect(OWNER_B_COPY.es.home.stillClockedInSince(time)).toBe(`Turno activo desde ${article} ${time}`);
  expect(OWNER_B_COPY.es.home.inSince(time)).toBe(`En turno desde ${article} ${time}`);
});
