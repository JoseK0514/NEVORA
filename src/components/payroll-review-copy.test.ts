import { expect, it } from '@rstest/core';
import { copy, payrollReviewIssues, payrollReviewState } from "./payroll-review-copy";

it("explains why an open period cannot be closed without exposing an engine code", () => {
  expect(payrollReviewIssues(["period_open"])).toBe("Period is still open");
  expect(payrollReviewState("NEEDS_REVIEW")).toBe("Timecard needs review");
});
it("preserves all projected blockers and their order without inventing completion", () => {
  expect(payrollReviewIssues(["open_entry", "open_break", "pending_correction", "overlapping_time"]))
    .toBe("Time entry is still open, Break is still open, Correction awaiting review, Overlapping recorded time");
  expect(payrollReviewIssues([])).toBe("");
  expect(["DRAFT", "APPROVED", "FINALIZED", "REOPENED"].map(value =>
    payrollReviewState(value as Parameters<typeof payrollReviewState>[0])))
    .toEqual(["Draft timecard", "Approved timecard", "Finalized timecard", "Reopened timecard"]);
});

it('matches both language tables and renders the approved Spanish issues in order', () => {
  expect(Object.keys(copy.es).sort()).toEqual(Object.keys(copy.en).sort());
  for (const key of Object.keys(copy.en) as (keyof typeof copy.en)[]) {
    expect(copy.es[key].match(/\{\w+\}/g)).toEqual(copy.en[key].match(/\{\w+\}/g));
  }
  expect(payrollReviewState('FINALIZED', 'es')).toBe('Tarjeta de tiempo finalizada');
  expect(payrollReviewIssues(['open_break', 'pending_correction'], 'es')).toBe('El descanso sigue abierto, Corrección por revisar');
});
