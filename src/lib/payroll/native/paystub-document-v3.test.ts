import { expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generatePdfs } from '../documents';
import { captureNativePayroll } from './source.server';
import { hash } from '../store';
import type { SqlExecutor } from '../../notifications/types';
import { nativeDocumentFixture } from './document-fixtures.test-support';
import { nativeEmployeePresentation } from './document-mapping';
import { NATIVE_PAYSTUB_TEMPLATE_V2, NATIVE_PAYSTUB_TEMPLATE_V3, renderNativeEmployeePaystub, preflightNativePaystubGlyphs } from './paystub-document';
import { NATIVE_COMPANY_SUMMARY_TEMPLATE_V2 } from './company-summary-document';
import { readPdf, expectCleanGeometry } from './pdf-text.test-support';

it('prepares v3 for new runs and stores Spanish Monto copy with exact approved money and the existing summary layout', async () => {
  const { run, snapshot } = nativeDocumentFixture();
  expect(run.nativeCalculation!.templateVersion).toBe('NEVORA_NATIVE_PAYSTUB_PDF_V3');
  const presentation = nativeEmployeePresentation(run, snapshot, 'E1');
  await preflightNativePaystubGlyphs(presentation);
  const documents = await generatePdfs(run, snapshot);
  const employee = documents.find(d => d.employeeId === 'E1')!;
  const pdf = await readPdf(employee.bytes);
  expect(pdf.text).toContain('Monto');
  expect(pdf.text).toContain('Tus horas y tu pago en este período. Montos de la nómina aprobada.');
  expect(pdf.text).not.toContain('Importe');
  for (const phrase of ['$1,000.00', '$820.85', '$179.15', '40', '$25.00', 'Este comprobante documenta la nómina aprobada. No confirma el pago.']) expect(pdf.text).toContain(phrase);
  expect(pdf.doc.getSubject()).toBe('NATIVE_RECORDED_TIME / NEVORA_NATIVE_PAYSTUB_PDF_V3');
  expect(employee.metadata!.nativeDocument!.templateVersion).toBe(NATIVE_PAYSTUB_TEMPLATE_V3);
  const summary = documents.find(d => d.employeeId === null)!;
  expect(summary.metadata!.nativeDocument!.templateVersion).toBe(NATIVE_COMPANY_SUMMARY_TEMPLATE_V2);
  expect((await PDFDocument.load(summary.bytes)).getSubject()).toContain(NATIVE_COMPANY_SUMMARY_TEMPLATE_V2);
  expect(Buffer.from((await renderNativeEmployeePaystub(presentation, { progress: async () => {} })).bytes)).toEqual(employee.bytes);
  await expectCleanGeometry(pdf.pages);
});

it('keeps English words, money and geometry while recording the explicit v3 template identity', async () => {
  const { run, snapshot } = nativeDocumentFixture();
  snapshot.settings.preferences.language = 'en';
  const input = nativeEmployeePresentation(run, snapshot, 'E1');
  const current = await readPdf((await renderNativeEmployeePaystub(input)).bytes);
  const previous = await readPdf((await renderNativeEmployeePaystub({ ...input, templateVersion: NATIVE_PAYSTUB_TEMPLATE_V2 })).bytes);
  expect(current.pages.map(page => page.map(line => ({ ...line, text: line.text.replace('Template v3', 'Template v2') })))).toEqual(previous.pages);
  expect(current.text).toContain('Amount');
  expect(current.text).toContain("This statement documents approved payroll. It doesn't confirm payment.");
  expect(current.doc.getSubject()).toBe('NATIVE_RECORDED_TIME / NEVORA_NATIVE_PAYSTUB_PDF_V3');
});

it('wraps the v3 Spanish helper and long approved rows across pages without clipping or dropping content', async () => {
  const { run, snapshot } = nativeDocumentFixture();
  const input = nativeEmployeePresentation(run, snapshot, 'E1');
  input.authorizedDeductions = Array.from({ length: 70 }, (_, i) => ({ label: `Deducción autorizada con descripción extensa para comprobar la lectura de la fila ${i} END-${i}`, amount: { currentMinor: '0', ytdMinor: '0' } }));
  const result = await renderNativeEmployeePaystub(input);
  const pdf = await readPdf(result.bytes);
  expect(result.pageCount).toBeGreaterThan(1);
  expect(pdf.text).toContain('Montos de la nómina aprobada.');
  for (let i = 0; i < 70; i++) expect(pdf.text).toContain(`END-${i}`);
  expect(pdf.text).toContain('continuación');
  await expectCleanGeometry(pdf.pages);
});

it('records v3 even when server capture blocks a new run before source population is approved', async () => {
  const { run, snapshot } = nativeDocumentFixture();
  const database = { timeZone: 'America/Puerto_Rico', profiles: [], openings: [], ledger: [], coverage: [] };
  const ex: SqlExecutor = {
    query: async () => { throw new Error('Unexpected SQL path'); },
    transaction: async statements => statements.map(statement => statement.text.includes(' AS profiles') ? [database] : []),
  };
  const result = await captureNativePayroll({ id: 'fictional-workspace', source: snapshot.source, observed: hash(snapshot.source) }, run, ex, []);
  expect(result.run.status).toBe('BLOCKED');
  expect(result.run.exceptions).toContain('POPULATION_REVIEW_REQUIRED');
  expect(result.run.nativeCalculation!.templateVersion).toBe('NEVORA_NATIVE_PAYSTUB_PDF_V3');
  expect(result.snapshot).toBeNull();
  expect(result.run.rows).toBeNull();
});
