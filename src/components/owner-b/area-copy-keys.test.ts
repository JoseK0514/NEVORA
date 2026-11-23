// Signed-in Spanish (Nov 23, 2026): every copy table of the owner package (owner-b, payroll import and paid-time export,
// staff list import, restrictions, time off admin, wages and labor cost, review details, reminders, the Copy receipt and
// workforce) has a Spanish entry for every English key, with the same shape (a function stays a function).
import { expect, it, rs } from "@rstest/core";
rs.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }) }));
import { OWNER_B_COPY } from "./owner-b-copy";
import { MOMENTS_COPY } from "./moments-copy";
import { payrollImportCopy } from "@/components/payroll-import/copy";
import { rosterImportCopy } from "@/components/roster-import/copy";
import { restrictionsCopy } from "@/components/restrictions/copy";
import { ptoCopy } from "@/components/time-off-admin/copy";
import { wagesCopy } from "@/components/wages/copy";
import { costCopy } from "@/components/wages/cost-copy";
import { reviewCopy } from "@/components/review-details/copy";
import { reminderCopy } from "@/components/reminders/copy";
import { RECEIPT_WORDS } from "@/components/copy-receipt-copy";
import { permissionCopy } from "@/components/workforce/permission-copy";
import { WEEKDAYS } from "@/components/workforce/weekdays";
const { PLANNING_WEEK_WORDS } = await import("@/components/workforce/planning-week");
const { PLANNING_WINDOW_WORDS } = await import("@/components/workforce/planning-window-card");

/** Every key path with its kind; arrays count by length, so a list of steps has as many steps in both languages. */
const shape = (value: unknown, prefix = ""): string[] => {
  if (Array.isArray(value)) return [`${prefix}[${value.length}]`, ...value.flatMap((inner, index) => typeof inner === "object" && inner ? shape(inner, `${prefix}[${index}]`) : [])];
  if (value && typeof value === "object" && !(value instanceof RegExp)) return Object.entries(value).flatMap(([key, inner]) => shape(inner, prefix ? `${prefix}.${key}` : key));
  return [`${prefix}:${typeof value}`];
};
const tables: [string, unknown, unknown][] = [
  ["owner-b", OWNER_B_COPY.en, OWNER_B_COPY.es], ["moments", MOMENTS_COPY.en, MOMENTS_COPY.es],
  ["payroll-import", payrollImportCopy.en, payrollImportCopy.es], ["roster-import", rosterImportCopy.en, rosterImportCopy.es],
  ["restrictions", restrictionsCopy("en"), restrictionsCopy("es")], ["time-off-admin", ptoCopy("en"), ptoCopy("es")],
  ["wages", wagesCopy("en"), wagesCopy("es")], ["labor cost", costCopy("en"), costCopy("es")],
  ["review-details", reviewCopy("en"), reviewCopy("es")], ["reminders", reminderCopy.en, reminderCopy.es],
  ["copy receipt", RECEIPT_WORDS.en, RECEIPT_WORDS.es], ["workforce permissions", permissionCopy("en"), permissionCopy("es")],
  ["planning week", PLANNING_WEEK_WORDS.en, PLANNING_WEEK_WORDS.es], ["planning window", PLANNING_WINDOW_WORDS.en, PLANNING_WINDOW_WORDS.es],
  ["weekdays", WEEKDAYS.en, WEEKDAYS.es],
];

it.each(tables)("%s: the Spanish table has the same keys and shape as the English one", (_name, en, es) => {
  expect(shape(es).sort()).toEqual(shape(en).sort());
});
