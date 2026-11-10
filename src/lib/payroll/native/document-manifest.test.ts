import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { generatePdfs } from '../documents';
import { hash } from '../store';
import { nativeEmployeePresentation } from './document-mapping';
import { nativeDocumentFixture } from './document-fixtures.test-support';
import { nativeDocumentManifestStatements } from './document-manifest.server';

it('retains the exact approved document metadata alongside bytes and stores that same value', async () => {
    const { run, snapshot } = nativeDocumentFixture();
    const documents = await generatePdfs(run, snapshot);
    const employee = documents.find(d => d.employeeId === 'E1')!;
    expect(employee.metadata).toEqual({
        period: { startDate: '2026-10-05', endDate: '2026-10-11' },
        payday: '2026-10-16',
        coverage: { complete: true, locationIds: ['L1'] },
        nativeDocument: {
            templateVersion: 'NEVORA_NATIVE_PAYSTUB_PDF_V3',
            runRevision: 2,
            inputSha256: run.nativeCalculation!.employees[0].provenance.inputSha256,
            rulesSha256: run.nativeCalculation!.employees[0].provenance.rulesSha256,
            presentationSha256: hash(nativeEmployeePresentation(run, snapshot, 'E1')),
            sourceFingerprint: 'c'.repeat(64),
        },
    });
    for (const document of documents)
        expect(document.statement.values).toContain(JSON.stringify(document.metadata));
});

it('builds the publication manifest without recovering metadata from insert parameter positions', async () => {
    const { run, snapshot } = nativeDocumentFixture();
    const documents = await generatePdfs(run, snapshot);
    const reordered = documents.map(d => ({ ...d, statement: { ...d.statement, values: ['unrelated insert parameter', ...d.statement.values] } }));
    const statements = nativeDocumentManifestStatements(run, reordered);
    const manifestJson = statements.flatMap(s => s.values).find(v => typeof v === 'string' && v.startsWith('{"version":"NATIVE_DOCUMENT_MANIFEST_V1"'));
    expect(manifestJson).toBeTypeOf('string');
    expect(JSON.parse(String(manifestJson))).toEqual({
        version: 'NATIVE_DOCUMENT_MANIFEST_V1',
        runRevision: 2,
        calculationSha256: hash(run.nativeCalculation),
        documents: documents.map(d => ({ id: d.id, employeeId: d.employeeId, kind: d.kind, sha256: d.sha256, metadata: d.metadata })).sort((a, b) => a.id.localeCompare(b.id)),
    });
});
