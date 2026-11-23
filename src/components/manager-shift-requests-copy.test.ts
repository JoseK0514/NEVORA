// Signed-in Spanish (Nov 23, 2026): the Shift requests table has the same keys and the same arguments in both languages,
// writes tú (no usted, no "¡") and counts and names its lines in Spanish.
import { expect, it } from "@rstest/core";
import { SHIFT_REQUESTS_COPY, shiftRequestsCopy } from "./manager-shift-requests-copy";

type Tree = Record<string, unknown>;
const shape = (value: unknown): unknown => typeof value === "function" ? `fn/${value.length}`
  : value && typeof value === "object" ? Object.fromEntries(Object.keys(value as Tree).sort().map(key => [key, shape((value as Tree)[key])])) : typeof value;

/** Every Spanish line, with sample arguments for each function. */
function lines(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (typeof value === "function") {
    const fn = value as (...args: unknown[]) => unknown;
    const samples: unknown[][] = fn.length === 2 ? [["Ana Rivera", "Ben Cruz"], [true, "Ana Rivera"], [false, "Ana Rivera"], ["2026-12-07", "2026"], ["06:00", "14:00"], ["2026-10-04T12:28:00Z", "America/Puerto_Rico"]]
      : [["Ana Rivera"], [1], [2], ["completed"], ["APPROVED"], ["2026-12-07"]];
    for (const args of samples) { try { const result = fn(...args); if (typeof result === "string") out.push(result); } catch { /* a sample this function does not take */ } }
  } else if (value && typeof value === "object") for (const item of Object.values(value as Tree)) lines(item, out);
  return out;
}

it("has the same keys and the same arguments in English and Spanish", () => {
  expect(shape(SHIFT_REQUESTS_COPY.es)).toEqual(shape(SHIFT_REQUESTS_COPY.en));
  expect(Object.keys(SHIFT_REQUESTS_COPY.es.errors).sort()).toEqual(Object.keys(SHIFT_REQUESTS_COPY.en.errors).sort());
  expect(Object.keys(SHIFT_REQUESTS_COPY.es.reasons).sort()).toEqual(Object.keys(SHIFT_REQUESTS_COPY.en.reasons).sort());
});

/** The review-details lines this page shows (the rest of that table belongs to other screens). */
const SHOWN = ["coverRequest", "outcome", "pickedUpBy", "pickedUp", "nobodyYet", "waitingFor", "waitingAnswer", "approved", "declined", "withdrawn", "expired", "outcomeUnknown",
  "coverHistory", "coverNotRequested", "coverPending", "coverCompleted", "coverClosed", "coverUnknown", "coverHistoryHelp", "swapApproved", "swapApprovedLine", "swapDeclined", "bothKeep",
  "coverApproved", "hasShiftNow", "scheduleShowsIt", "coverDeclined", "keepsShift", "calloutApproved", "calloutApprovedLine", "calloutDeclined", "requestClosed",
  "askDeclineSwap", "askDeclineCover", "askDeclineCallout", "askCloseCover", "staysOnShift", "keepRequest", "decline", "closeRequest"] as const;

it("writes tú, with no “¡” and no usted", () => {
  const table = SHIFT_REQUESTS_COPY.es;
  const es = lines({ ...table, review: Object.fromEntries(SHOWN.map(key => [key, table.review[key]])) });
  expect(es.length).toBeGreaterThan(80);
  for (const line of es) {
    expect(line).not.toContain("¡");
    expect(line).not.toMatch(/\busted\b|\bInténtelo\b|\bAbra\b|\ble toque\b|\bSu tarjeta\b/i);
    // A question opens and closes.
    if (line.endsWith("?")) expect(line.startsWith("¿")).toBe(true);
  }
});

const sp = (text: string) => text.replace(/\u00a0/g, " ");
it("counts, names, dates and times in Spanish", () => {
  const es = shiftRequestsCopy("es"), en = shiftRequestsCopy("en");
  expect(es.waitingCount(1)).toBe("En espera (1)");
  expect(es.waitingCount(3)).toBe("En espera (3)");
  expect(en.waitingCount(3)).toBe("Waiting (3)");
  expect(es.shiftOf("Luis")).toBe("Turno de Luis");
  expect(en.shiftOf("Luis")).toBe("Luis’ shift");
  expect(en.shiftOf("Ana")).toBe("Ana’s shift");
  expect(es.day("2026-12-07", "2026")).toBe("lun, 7 dic");
  expect(es.day("2027-01-06", "2026")).toBe("mié, 6 ene 2027");
  expect(en.day("2026-12-07", "2026")).toBe("Mon, Dec 7");
  expect(sp(es.hours("06:00", "14:00"))).toBe("6:00 a. m. – 2:00 p. m.");
  expect(es.hours("00:00", "24:00")).toBe("Todo el día");
  expect(en.hours("06:00", "14:00")).toBe("6:00 AM – 2:00 PM");
  expect(sp(es.at("2026-10-04T12:28:00Z", "America/Puerto_Rico"))).toBe("4 oct, 8:28 a. m.");
  expect(es.at("not a date", "America/Puerto_Rico")).toBe("not a date");
  expect(es.ago("Just now")).toBe("Ahora mismo");
  expect(es.ago("5 min ago")).toBe("hace 5 min");
  expect(es.ago("3 d ago")).toBe("hace 3 d");
  expect(es.status("DENIED")).toBe("Rechazada");
  expect(en.status("DENIED")).toBe("Declined");
  expect(es.step("completed")).toBe("Completada");
  expect(es.step("")).toBe("Cambió");
  expect(en.step("completed")).toBe("Completed");
  expect(es.review.pickedUpBy("Ben")).toBe("La tomó Ben");
  expect(en.review.pickedUpBy("Ben")).toBe("Picked up by Ben");
});
