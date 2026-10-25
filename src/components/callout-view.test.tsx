import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { ExchangeShift } from "../lib/data/exchanges";

vi.mock("next/link", () => ({ default: ({ children, ...props }: ComponentProps<"a">) => createElement("a", props, children) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/app/exchange/actions", () => ({ shiftChangeAction: vi.fn(), reconcileShiftChangeAction: vi.fn() }));

import { CalloutView } from "./callout-view";

const shift: ExchangeShift = {
  id: "fixture-shift", scheduleId: "fixture-schedule", employeeId: "fixture-employee",
  employeeName: "Fictional Employee", locationId: "fixture-location", locationName: "Harbor",
  weekStart: "2035-10-01", date: "2035-10-03", startTime: "23:00", endTime: "07:00",
  timeZone: "America/Puerto_Rico", positionId: "service", positionName: "Service coordinator",
  isDesignatedLead: true,
};
const fields = { kind: "SUBMIT_CALLOUT", sourceShiftId: shift.id, sourceEpisodeId: "fixture-episode", sourceTermsFingerprint: "v1:reviewed" };

it("retains the six canonical reasons and submits the reviewed assignment identifiers", () => {
  const html = renderToStaticMarkup(<CalloutView shift={shift} fields={fields} />);
  for (const reason of ["ILLNESS", "FAMILY_EMERGENCY", "TRANSPORTATION", "SCHOOL", "PERSONAL_EMERGENCY", "OTHER"]) {
    expect(html).toContain(`value="${reason}"`);
  }
  for (const [name, value] of Object.entries(fields)) expect(html).toContain(`name="${name}" value="${value}"`);
  expect(html).toContain('maxLength="300"');
  expect(html).toContain('dateTime="2035-10-03"');
  // UX-E-18: Cancel on the full page goes back to Schedule, where the person started.
  expect(html).toContain('href="/app/schedule"');
  expect(html).toContain('href="/app/exchange?tab=requests"');
});

it("withholds submission when reviewed terms are absent and retains the recovery action", () => {
  const html = renderToStaticMarkup(<CalloutView shift={shift} fields={null} />);
  expect(html).toMatch(/type="submit" disabled=""/);
  expect(html).not.toContain('name="sourceTermsFingerprint"');
  expect(html).toContain('type="button"');
  expect(html).toContain('role="alert"');
});
