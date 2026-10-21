import 'server-only';
import type { PayrollRun } from '../contracts';
import type { generatePdfs } from '../documents';
import { hash, statement as q, workspaceSql as ws } from '../store';
import { PayrollError } from '../model';
type Documents = Awaited<ReturnType<typeof generatePdfs>>;
const documentsSql = `SELECT jsonb_agg(jsonb_build_object('id',d.id::text,'employeeId',d.employee_id,'kind',d.kind,'sha256',d.sha256,'metadata',d.payload) ORDER BY d.id) FROM payroll_documents d WHERE d.workspace_id=${ws} AND d.run_id=$1::uuid AND d.kind IN('EMPLOYEE_STATEMENT','COMPANY_SUMMARY')`;
export function nativeDocumentManifestStatements(run: PayrollRun, documents: Documents) {
    if (run.nativeCalculation?.state !== 'ready' || run.sourceAuthority !== 'NATIVE_RECORDED_TIME' || run.status !== 'APPROVED')
        throw new PayrollError('NATIVE_APPROVAL_REQUIRED', 409);
    const expectedIds = run.nativeCalculation.employees.map(e => e.employeeId).sort(), actualIds = documents.filter(d => d.kind === 'EMPLOYEE_STATEMENT').map(d => d.employeeId).sort();
    if (hash(expectedIds) !== hash(actualIds) || documents.filter(d => d.kind === 'COMPANY_SUMMARY').length !== 1 || documents.length !== expectedIds.length + 1)
        throw new PayrollError('NATIVE_DOCUMENT_SET_CONFLICT', 409);
    const expected = documents.map(d => ({ id: d.id, employeeId: d.employeeId, kind: d.kind, sha256: d.sha256, metadata: d.metadata })).sort((a, b) => a.id.localeCompare(b.id));
    const payload = { version: 'NATIVE_DOCUMENT_MANIFEST_V1', runRevision: run.revision, calculationSha256: hash(run.nativeCalculation), documents: expected };
    return [
        ...documents.map(d => q(`SELECT (CASE WHEN EXISTS(SELECT 1 FROM payroll_documents WHERE workspace_id=${ws} AND id=$1::uuid AND content=decode($2,'hex')) THEN '1' ELSE 'NATIVE_DOCUMENT_BYTES_CONFLICT' END)::integer`, d.id, d.bytes.toString('hex'))),
        q(`SELECT (CASE WHEN (${documentsSql})=$2::jsonb THEN '1' ELSE 'NATIVE_DOCUMENT_SET_CONFLICT' END)::integer`, run.id, JSON.stringify(expected)),
        q(`INSERT INTO native_payroll_document_manifests VALUES(${ws},$1::uuid,$2::jsonb) ON CONFLICT DO NOTHING`, run.id, JSON.stringify(payload)),
        q(`SELECT (CASE WHEN (SELECT payload FROM native_payroll_document_manifests WHERE workspace_id=${ws} AND run_id=$1::uuid)=$2::jsonb THEN '1' ELSE 'NATIVE_DOCUMENT_MANIFEST_CONFLICT' END)::integer`, run.id, JSON.stringify(payload))
    ];
}
export function nativePublicationGuard(run: PayrollRun) {
    if (run.nativeCalculation?.state !== 'ready' || run.status !== 'APPROVED')
        throw new PayrollError('NATIVE_APPROVAL_REQUIRED', 409);
    return q(`SELECT (CASE WHEN EXISTS(SELECT 1 FROM native_payroll_document_manifests m WHERE m.workspace_id=${ws} AND m.run_id=$1::uuid AND m.payload->>'runRevision'=$2 AND m.payload->>'calculationSha256'=$3 AND m.payload->'documents'=(${documentsSql})) THEN '1' ELSE 'PDF_NOT_READY' END)::integer`, run.id, String(run.revision), hash(run.nativeCalculation));
}
