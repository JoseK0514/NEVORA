import { it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generatePdfs } from '../documents';
import { nativeEmployeePresentation } from './document-mapping';
import { nativeDocumentFixture } from './document-fixtures.test-support';
import { NATIVE_PAYSTUB_TEMPLATE_V1, NATIVE_PAYSTUB_TEMPLATE_V2, NATIVE_PAYSTUB_TEMPLATE_VERSION, renderNativeEmployeePaystub } from './paystub-document';
it('maps frozen approved exact hourly money and current/YTD categories without inventing payment', () => { const { run, snapshot } = nativeDocumentFixture(); const p = nativeEmployeePresentation(run, snapshot, 'E1'); expect(p.totals).toEqual({ gross: { currentMinor: '100000', ytdMinor: '100000' }, taxes: { currentMinor: '17915', ytdMinor: '17915' }, authorizedDeductions: { currentMinor: '0', ytdMinor: '0' }, net: { currentMinor: '82085', ytdMinor: '82085' } }); expect(p.earnings[0].work).toMatchObject({ baseRateMinorPerHour: { numerator: '2500', denominator: '1' }, paidRateMinorPerHour: { numerator: '2500', denominator: '1' }, nanoseconds: '144000000000000' }); expect(p.templateVersion).toBe('NEVORA_NATIVE_PAYSTUB_PDF_V2'); });
it('rejects stale amount mapping or omitted disclosed statement coverage', () => { const { run, snapshot } = nativeDocumentFixture(); snapshot.native!.employeeCoverage.E1.locationIds = []; expect(() => nativeEmployeePresentation(run, snapshot, 'E1')).toThrow('NATIVE_DOCUMENT_COVERAGE_REQUIRED'); snapshot.native!.employeeCoverage.E1.locationIds = ['L1']; run.rows![0].grossMinor = '99999'; expect(() => nativeEmployeePresentation(run, snapshot, 'E1')).toThrow('NATIVE_DOCUMENT_SNAPSHOT_CONFLICT'); });
it('real writer freezes employee/full-context/YTD footprint and deterministic renderer template in actual storage metadata', async () => { const { run, snapshot } = nativeDocumentFixture(); const a = await generatePdfs(run, snapshot), b = await generatePdfs(run, snapshot); expect(a).toHaveLength(2); const employee = a.find(d => d.employeeId === 'E1')!; const metadata = JSON.parse(String(employee.statement.values[7])); expect(metadata.coverage).toEqual({ complete: true, locationIds: ['L1'] }); expect(metadata.nativeDocument).toMatchObject({ templateVersion: 'NEVORA_NATIVE_PAYSTUB_PDF_V2', runRevision: 2, inputSha256: run.nativeCalculation!.employees[0].provenance.inputSha256 }); expect(employee.sha256).toBe(b.find(d => d.employeeId === 'E1')!.sha256); expect((await PDFDocument.load(employee.bytes)).getPageCount()).toBeGreaterThanOrEqual(1); });
it('does not produce any completed batch when the lease callback fails midway', async () => { const { run, snapshot } = nativeDocumentFixture(); let n = 0; await expect(generatePdfs(run, snapshot, async () => { if (++n === 3)
    throw Error('PAYROLL_LEASE_LOST'); })).rejects.toThrow('PAYROLL_LEASE_LOST'); });

it('localizes standard employer contributions in the statement language while retaining the amounts', () => {
    const { run, snapshot } = nativeDocumentFixture();
    const es = nativeEmployeePresentation(run, snapshot, 'E1');
    expect(es.employerContributions!.lines.map(line => line.label)).toEqual(['Medicare', 'Seguro por incapacidad (SINOT)', 'Seguro Social']);
    snapshot.settings.preferences.language = 'en';
    const en = nativeEmployeePresentation(run, snapshot, 'E1');
    expect(en.employerContributions!.lines.map(line => line.label)).toEqual(['Medicare', 'Disability insurance (SINOT)', 'Social Security']);
    expect(en.employerContributions!.lines.map(line => line.amount)).toEqual(es.employerContributions!.lines.map(line => line.amount));
});
it('retains actual custom employer labels rather than replacing them with generic code text', () => {
    const { run, snapshot } = nativeDocumentFixture();
    for (const row of [run.rows![0], run.nativeCalculation!.employees[0].row]) {
        row.employerContributions.find(line => line.code === 'MEDICARE')!.label = 'Aportación patronal acordada';
    }
    expect(nativeEmployeePresentation(run, snapshot, 'E1').employerContributions!.lines.find(line => line.label === 'Aportación patronal acordada')).toBeTruthy();
});
it('provides a human approved-run reference while keeping full proof hashes in private document metadata', async () => {
    const { run, snapshot } = nativeDocumentFixture();
    const presentation = nativeEmployeePresentation(run, snapshot, 'E1');
    expect(presentation.sourceReferences).toEqual([{ label: 'Referencia de nómina aprobada', value: `${run.id} / ${run.revision}` }]);
    const document = (await generatePdfs(run, snapshot)).find(item => item.employeeId === 'E1')!;
    const metadata = JSON.parse(String(document.statement.values[7])).nativeDocument;
    expect(metadata.inputSha256).toBe(run.nativeCalculation!.employees[0].provenance.inputSha256);
    expect(metadata.rulesSha256).toBe(run.nativeCalculation!.employees[0].provenance.rulesSha256);
    expect(metadata.sourceFingerprint).toBe(snapshot.native!.facts.sourceFingerprint);
    expect(metadata.presentationSha256).toMatch(/^[a-f0-9]{64}$/);
    snapshot.settings.preferences.language = 'en';
    expect(nativeEmployeePresentation(run, snapshot, 'E1').sourceReferences).toEqual([{ label: 'Approved payroll reference', value: `${run.id} / ${run.revision}` }]);
});

it('renders a run with the template it recorded: new runs use v2, runs prepared under v1 keep v1 bytes', async () => {
    const { run, snapshot } = nativeDocumentFixture();
    expect(run.nativeCalculation!.templateVersion).toBe(NATIVE_PAYSTUB_TEMPLATE_VERSION);
    expect(NATIVE_PAYSTUB_TEMPLATE_VERSION).toBe(NATIVE_PAYSTUB_TEMPLATE_V2);
    const v1Run = { ...run, nativeCalculation: { ...run.nativeCalculation!, templateVersion: NATIVE_PAYSTUB_TEMPLATE_V1 } };
    const presentation = nativeEmployeePresentation(v1Run, snapshot, 'E1');
    expect(presentation.templateVersion).toBe(NATIVE_PAYSTUB_TEMPLATE_V1);
    const written = (await generatePdfs(v1Run, snapshot)).find(d => d.employeeId === 'E1')!;
    const direct = await renderNativeEmployeePaystub(presentation);
    expect(direct.templateVersion).toBe(NATIVE_PAYSTUB_TEMPLATE_V1);
    expect(written.sha256).toBe(direct.sha256);
    expect(JSON.parse(String(written.statement.values[7])).nativeDocument.templateVersion).toBe(NATIVE_PAYSTUB_TEMPLATE_V1);
    const v2 = (await generatePdfs(run, snapshot)).find(d => d.employeeId === 'E1')!;
    expect(JSON.parse(String(v2.statement.values[7])).nativeDocument.templateVersion).toBe(NATIVE_PAYSTUB_TEMPLATE_V2);
    expect(v2.sha256).not.toBe(written.sha256);
    expect(() => nativeEmployeePresentation({ ...run, nativeCalculation: { ...run.nativeCalculation!, templateVersion: 'NEVORA_NATIVE_PAYSTUB_PDF_V3' as never } }, snapshot, 'E1')).toThrow('NATIVE_DOCUMENT_SNAPSHOT_CONFLICT');
});
