import { expect, it } from 'vitest';
import { nativeEmployeePresentation } from './document-mapping';
import { renderNativeEmployeePaystub } from './paystub-document';
import { buildNativeRunCandidate } from './preparation';
import { approvedHistory } from './provisional-history.test-support';

it('preserves the frozen base-approved cash/YTD presentation and deterministic PDF bytes', async () => {
  const before = structuredClone(approvedHistory);
  const p = nativeEmployeePresentation(approvedHistory.run, approvedHistory.snapshot, 'E1');
  expect(p).toEqual(approvedHistory.presentation);
  expect((await renderNativeEmployeePaystub(p)).sha256).toBe(approvedHistory.pdfSha256);
  expect(approvedHistory).toEqual(before);
});
it('makes an old pending review stale on recapture while leaving stored approved money intact', () => {
  const before = structuredClone(approvedHistory);
  const next = buildNativeRunCandidate(approvedHistory.run, approvedHistory.snapshot.native.facts);
  expect(next.status).toBe('REVIEW_REQUIRED'); expect(next.rows).toEqual(approvedHistory.run.rows); expect(next.totals).toEqual(approvedHistory.run.totals);
  expect(next.reviewToken).not.toBe(approvedHistory.run.reviewToken);
  expect(next.nativeCalculation!.employees[0].provenance.rulesSha256).not.toBe(approvedHistory.run.nativeCalculation.employees[0].provenance.rulesSha256);
  expect(approvedHistory).toEqual(before);
});
