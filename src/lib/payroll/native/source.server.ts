import { FEDERAL_EMPLOYEE_CENT_RULE_SOURCE } from './federal-employee-tax';
import 'server-only';
import { resolveNativeWorkweek } from './workweek-policy';
import type { SqlExecutor, SqlStatement } from '../../notifications/types';
import type { PayrollRun } from '../contracts';
import type { Source, Snapshot } from '../service';
import { resolveSettings, resolveExceptions } from '../service';
import { hash, locks, statement as q } from '../store';
import { PayrollError } from '../model';
import { parseConfiguration, parseYtd } from './model';
import type { NativePayrollInput, NativeConfigurationRevision, NativeYtd } from './contracts';
import { projectNativeYtd, type NativeLedgerEntry } from './ytd';
import { projectEmployerYtdCounters } from './obligations';
import { buildNativeRunCandidate, type NativePreparationFacts } from './preparation';
import { NATIVE_CALCULATOR_VERSION } from './calculate';
import { buildRecordedSourceCapture, projectRecordedSourceCapture, type RecordedSourceRequest, type RecordedSourceCapture } from './recorded-source.server';
export const EXACT_CENT_ASSESSMENT_SHA256 = 'c731b2e9afaa8771e14491b3a187edc49f4cc0539ec87ed53a1e9dd1020f075c';
export async function nativeSchemaAvailable(ex: SqlExecutor) {
    const rows = await ex.query<{
        available: boolean;
    }>(q("SELECT to_regclass('native_payroll_ledger') IS NOT NULL AS available"));
    if (rows.length !== 1)
        throw new PayrollError('NATIVE_SOURCE_UNAVAILABLE', 503);
    return rows[0].available === true;
}
export function exactReadFence(query: SqlStatement, rows: unknown[]): SqlStatement {
    const retained = rows.map(row => {
        const copy = structuredClone(row) as {
            capture?: {
                observedAt?: string;
            };
        };
        if (copy?.capture)
            delete copy.capture.observedAt;
        return copy;
    });
    // Observation time changes per read; every actual source value remains fenced.
    return q(`SELECT (CASE WHEN COALESCE((SELECT jsonb_agg(to_jsonb(captured)#-'{capture,observedAt}') FROM (${query.text}) captured),'[]'::jsonb)=$${query.values.length + 1}::jsonb THEN '1' ELSE 'NATIVE_SOURCE_CONFLICT' END)::integer`, ...query.values, JSON.stringify(retained));
}
type DatabaseFacts = {
    timeZone: string;
    profiles: NativeConfigurationRevision[];
    openings: {
        employeeId: string;
        revision: number;
        ytd: NativeYtd;
    }[];
    ledger: NativeLedgerEntry[];
    coverage: {
        employeeId: string;
        startDate: string;
        endDate: string;
    }[];
};
export function nativeDatabaseFactsQuery(workspaceId: string, run: PayrollRun, ids: string[]): SqlStatement {
    return q(`SELECT (SELECT time_zone FROM workspaces WHERE id=$1 AND active AND singleton) AS "timeZone",
 COALESCE((SELECT jsonb_agg(payload ORDER BY employee_id) FROM native_payroll_profiles_current WHERE workspace_id=$1 AND employee_id=ANY($2::text[])),'[]'::jsonb) AS profiles,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('employeeId',employee_id,'revision',revision,'ytd',payload) ORDER BY employee_id) FROM native_payroll_opening_ytd_current WHERE workspace_id=$1 AND employee_id=ANY($2::text[]) AND tax_year=EXTRACT(YEAR FROM $3::date)),'[]'::jsonb) AS openings,
 COALESCE((SELECT jsonb_agg(value ORDER BY sequence) FROM (SELECT sequence,jsonb_build_object('runId',run_id::text,'correctionOf',correction_of::text,'employeeId',employee_id,'period',jsonb_build_object('startDate',start_date::text,'endDate',end_date::text),'payday',payday::text,'sequence',sequence,'result',payload->'result','locationCoverage',(SELECT approved.snapshot#>ARRAY['native','employeeCoverage',native_payroll_ledger.employee_id] FROM payroll_runs_current approved WHERE approved.workspace_id=native_payroll_ledger.workspace_id AND approved.run_id=native_payroll_ledger.run_id),'deductionSources',COALESCE((SELECT item->'deductions' FROM payroll_runs_current approved CROSS JOIN LATERAL jsonb_array_elements(approved.snapshot#>'{native,facts,inputs}') item WHERE approved.workspace_id=native_payroll_ledger.workspace_id AND approved.run_id=native_payroll_ledger.run_id AND item->>'employeeId'=native_payroll_ledger.employee_id),'[]'::jsonb)) AS value FROM native_payroll_ledger WHERE workspace_id=$1 AND employee_id=ANY($2::text[]) AND tax_year=EXTRACT(YEAR FROM $3::date) ORDER BY sequence LIMIT 5001) selected),'[]'::jsonb) AS ledger,
 COALESCE((SELECT jsonb_agg(value ORDER BY employee_id,start_date,end_date) FROM (SELECT employee_id,start_date,end_date,jsonb_build_object('employeeId',employee_id,'startDate',start_date::text,'endDate',end_date::text) AS value FROM nevora_timecard_latest WHERE workspace_id=$1 AND employee_id=ANY($2::text[]) AND start_date<=$5::date+8 AND end_date>=$4::date-14 ORDER BY employee_id,start_date,end_date LIMIT 19201) selected),'[]'::jsonb) AS coverage`, workspaceId, ids, run.payday, run.period.startDate, run.period.endDate);
}
export function nativeSourceRequest(workspaceId: string, run: PayrollRun, employeeId: string, wages: NativePayrollInput['wages'], coverage: DatabaseFacts['coverage']): RecordedSourceRequest {
    if (!wages.length)
        throw new PayrollError('WAGE_PROFILE_REQUIRED', 409);
    const resolved = resolveNativeWorkweek(employeeId, wages, run.period);
    return { workspaceId, employeeId, timeZone: 'America/Puerto_Rico', period: run.period, contexts: [resolved.sourceWindow], coverage: coverage.filter(c => c.employeeId === employeeId && c.startDate <= resolved.coveragePeriod.endDate && c.endDate >= resolved.coveragePeriod.startDate).map(c => ({ startDate: c.startDate, endDate: c.endDate })) };
}
function deductionInputs(configuration: NativeConfigurationRevision | ReturnType<typeof parseConfiguration>, opening: NativeYtd, heads: NativeLedgerEntry[], run: PayrollRun) {
    return configuration.deductions.map(d => {
        if (d.capMinor === null || d.revoked || d.effectiveFrom > run.payday || (d.effectiveTo !== null && d.effectiveTo <= run.payday))
            return d;
        if (d.effectiveFrom < `${opening.year}-01-01` || BigInt(opening.deductions[d.code] ?? '0') !== BigInt(0))
            throw Error('DEDUCTION_CAP_HISTORY_REQUIRED');
        const relevant = heads.filter(h => h.employeeId === configuration.employeeId && h.runId !== run.correctionOf && h.payday >= d.effectiveFrom);
        const retained = relevant.map(h => ({ head: h, source: h.deductionSources?.find(s => s.id === d.id), amount: h.result.row.employeeDeductions.find(line => line.code === d.code)?.amountMinor ?? '0' }));
        if (retained.some(r => r.amount !== '0' && !r.head.deductionSources?.length))
            throw Error('DEDUCTION_CAP_HISTORY_REQUIRED');
        const matching = retained.filter(r => r.source).sort((a, b) => a.head.sequence - b.head.sequence);
        if (matching.some(r => r.source!.code !== d.code || r.source!.effectiveFrom !== d.effectiveFrom) || matching[0] && matching[0].source!.deductedBeforeMinor !== d.deductedBeforeMinor)
            throw Error('DEDUCTION_CAP_SOURCE_CONFLICT');
        return { ...d, deductedBeforeMinor: (BigInt(d.deductedBeforeMinor) + matching.reduce((total, r) => total + BigInt(r.amount), BigInt(0))).toString() };
    });
}
function blocked(run: PayrollRun, issues: string[]): PayrollRun { return { ...run, status: 'BLOCKED', sourceAuthority: 'NATIVE_RECORDED_TIME', rows: null, totals: null, coverage: { complete: false, locationIds: [] }, nativeCalculation: { version: 'NATIVE_RUN_V1', state: 'blocked', ruleRevision: 1, templateVersion: 'NEVORA_NATIVE_PAYSTUB_PDF_V1', employees: [] }, reviewToken: null, exceptions: [...new Set(issues)] }; }
export type NativeCapture = {
    run: PayrollRun;
    snapshot: Snapshot | null;
    guards: SqlStatement[];
};
/** All requests, profiles, sources and balances originate on the server. No client money. */
export async function captureNativePayroll(seed: {
    id: string;
    source: Source;
    observed: string;
}, run: PayrollRun, ex: SqlExecutor, permissionGuards: SqlStatement[], originalRunId = run.id, progress?: () => Promise<void>): Promise<NativeCapture> {
    const settings = resolveSettings(seed.source, run.payday), exceptions = resolveExceptions(seed.source, run.payday), population = seed.source.population;
    const ids = seed.source.roster.map(e => e.employeeId), query = nativeDatabaseFactsQuery(seed.id, run, ids);
    const prefix = [...locks(), ...permissionGuards], responses = await ex.transaction([...prefix, query, ...permissionGuards]);
    const rows = responses[prefix.length] as DatabaseFacts[];
    if (rows.length !== 1)
        throw new PayrollError('NATIVE_SOURCE_UNAVAILABLE', 503);
    const database = rows[0], guards = [exactReadFence(query, rows)], issues: string[] = [];
    if (database.ledger.some(e => !e.locationCoverage?.complete || !e.locationCoverage.locationIds.length))
        issues.push('YTD_LOCATION_COVERAGE_REQUIRED');
    if (database.timeZone !== 'America/Puerto_Rico')
        issues.push('UNSUPPORTED_NATIVE_TIME_ZONE');
    if (database.ledger.length > 5000 || database.coverage.length > 19200 || database.profiles.length > 300 || database.openings.length > 300)
        issues.push('NATIVE_SOURCE_LIMIT');
    if (!settings)
        issues.push('SETTINGS_REQUIRED');
    if (!population || population.members.length !== ids.length || new Set(population.members.map(e => e.employeeId)).size !== ids.length || !ids.every(id => population.members.some(e => e.employeeId === id)))
        issues.push('POPULATION_REVIEW_REQUIRED');
    if (population && population.sourceHash !== hash({ roster: seed.source.roster, timecards: seed.source.timecards }))
        issues.push('POPULATION_SOURCE_CONFLICT');
    if (settings?.preferences.rules.length || exceptions.some(e => e.exception.rules?.length))
        issues.push('NATIVE_RULE_MAPPING_REQUIRED');
    if (issues.length || !settings || !population)
        return { run: blocked(run, issues), snapshot: null, guards };
    const successors = new Set(database.ledger.map(e => e.correctionOf).filter(Boolean)), heads = database.ledger.filter(e => !successors.has(e.runId));
    if (run.correctionOf === null && heads.some(e => e.payday > run.payday))
        issues.push('BACKDATED_YTD_RECALCULATION_REQUIRED');
    const inputs: NativePayrollInput[] = [], captures: Extract<RecordedSourceCapture, {
        state: 'ready';
    }>[] = [], employeeLocations: Record<string, string[]> = {}, unknownCoverageEmployeeIds: string[] = [];
    for (const member of population.members) {
        await progress?.();
        const employee = seed.source.roster.find(e => e.employeeId === member.employeeId)!;
        employeeLocations[member.employeeId] = [employee.locationId];
        if (member.disposition === 'EXCLUDE')
            continue;
        try {
            const revision = database.profiles.find(e => e.employeeId === member.employeeId);
            if (!revision)
                throw Error('WAGE_PROFILE_REQUIRED');
            const configuration = parseConfiguration({ schema: revision.schema, employeeId: revision.employeeId, wages: revision.wages, tax: revision.tax, deductions: revision.deductions });
            // PR/wage modes remain UNVERIFIED; statutory employee federal collection is separately sourced.
            if (configuration.wages.some(w => w.wageCentRounding !== 'UNVERIFIED') || configuration.tax?.prCentRounding !== 'UNVERIFIED')
                issues.push(`ROUNDING_POLICY_ACCEPTANCE_REQUIRED:${member.employeeId}`);
            const opening = database.openings.find(e => e.employeeId === member.employeeId);
            if (!opening)
                throw Error('ATTESTED_YTD_REQUIRED');
            const ytd = projectNativeYtd(parseYtd({ ...opening.ytd, revision: opening.revision }), database.ledger.filter(e => e.employeeId === member.employeeId), run.correctionOf);
            employeeLocations[member.employeeId] = [...new Set([employee.locationId, ...ytd.locationIds])].sort();
            const request = nativeSourceRequest(seed.id, run, member.employeeId, configuration.wages, database.coverage), captureQuery = buildRecordedSourceCapture(request);
            const captureResponses = await ex.transaction([...prefix, captureQuery, ...permissionGuards]);
            const captureRows = captureResponses[prefix.length] as unknown[];
            if (captureRows.length !== 1)
                throw new PayrollError('NATIVE_SOURCE_UNAVAILABLE', 503);
            guards.push(exactReadFence(captureQuery, captureRows));
            const capture = projectRecordedSourceCapture(request, captureRows[0]);
            if (capture.state !== 'ready')
                throw Error(`RECORDED_SOURCE_${capture.reason.toUpperCase()}`);
            captures.push(capture);
            employeeLocations[member.employeeId] = [...new Set([...employeeLocations[member.employeeId], ...capture.locationIds])].sort();
            const entries = capture.entries.map(e => {
                if (e.endAt === null || e.breaks.some(b => b.endAt === null))
                    throw Error('OPEN_RECORDED_TIME');
                return { id: e.logicalId, locationId: e.locationId, startAt: e.startAt, endAt: e.endAt, sourceKind: e.sourceKind, recordedVersion: e.recordedVersion, adjustmentId: e.adjustmentId, breaks: e.breaks.map(b => ({ id: b.id, typeId: b.classification?.id ?? null, startAt: b.startAt, endAt: b.endAt, recordedVersion: b.recordedVersion, classification: b.classification })) };
            });
            const tax = configuration.tax ? projectEmployerYtdCounters(configuration.tax, opening.ytd, ytd) : null;
            inputs.push({ schema: 'NEVORA_NATIVE_PAYROLL_INPUT_V1', employeeId: member.employeeId, period: run.period, payday: run.payday, frequency: settings.preferences.schedule.frequency, timeZone: 'America/Puerto_Rico', wages: configuration.wages, tax, ytd, deductions: deductionInputs(configuration, opening.ytd, heads, run), timecards: capture.coverage.map(c => ({ employeeId: member.employeeId, period: { startDate: c.startDate, endDate: c.endDate }, revision: c.revision, state: 'FINALIZED', sourceHash: c.sourceHash, finalizedSourceHash: c.sourceHash, pendingCorrections: 0, entries, recordedSourceEvidence: { captureFence: capture.sourceFence, operationId: c.operationId, sourceHash: c.sourceHash, currentSourceHash: c.currentSourceHash } })) });
        }
        catch (error) {
            // A SQL/transport failure never becomes ready zero, nor is raw data exposed.
            if (error instanceof PayrollError && error.code === 'NATIVE_SOURCE_UNAVAILABLE')
                throw error;
            const code = error instanceof Error && /^[A-Z][A-Z_]+$/.test(error.message) ? error.message : 'NATIVE_SOURCE_UNAVAILABLE';
            issues.push(`${code}:${member.employeeId}`);
            unknownCoverageEmployeeIds.push(member.employeeId);
        }
    }
    if (captures.reduce((n, c) => n + c.entries.length, 0) > 10000)
        issues.push('NATIVE_SOURCE_LIMIT');
    const facts: NativePreparationFacts = { inputs, population: population.members.map(m => ({ employeeId: m.employeeId, name: seed.source.roster.find(e => e.employeeId === m.employeeId)!.name, disposition: m.disposition })), sourceFingerprint: hash({ source: seed.source, database, captures }), ruleRevision: 1, rulesVerified: true, employeeLocations, unknownCoverageEmployeeIds, blockingIssues: issues };
    const next = { ...buildNativeRunCandidate(run, facts), settingsRevision: settings.revision, populationRevision: population.revision, exceptionRevisions: exceptions.map(e => ({ employeeId: e.exception.employeeId, revision: e.revision })) };
    if (run.correctionOf && next.nativeCalculation?.state === 'ready' && hash(database.ledger.filter(e => e.runId === run.correctionOf).map(e => e.employeeId).sort()) !== hash(next.nativeCalculation.employees.map(e => e.employeeId).sort()))
        return { run: blocked(next, ['CORRECTION_POPULATION_CONFLICT']), snapshot: null, guards };
    if (next.nativeCalculation?.state !== 'ready')
        return { run: next, snapshot: null, guards };
    if (next.nativeCalculation.employees.some(e => e.provenance.rounding !== 'EXACT_CENT_NO_ROUNDING_REQUIRED' || e.provenance.taxRounding !== 'EXACT_CENT_NO_ROUNDING_REQUIRED'))
        throw new PayrollError('ROUNDING_POLICY_ACCEPTANCE_REQUIRED', 409);
    const snapshot: Snapshot = { source: seed.source, settings, exceptions, amounts: { schema: 'NEVORA_PAYROLL_IMPORT_V1', currency: 'USD', sourceName: next.sourceName!, sourceReference: next.sourceReference!, period: next.period, payday: next.payday, rows: next.rows!.map(({ employeeName: _name, ...r }) => r) }, native: { version: 'NATIVE_SNAPSHOT_V1', facts, openingRevisions: Object.fromEntries(database.openings.map(o => [o.employeeId, o.revision])), employeeCoverage: Object.fromEntries(Object.entries(employeeLocations).map(([id, locationIds]) => [id, { complete: !unknownCoverageEmployeeIds.includes(id), locationIds }])), recordedSources: captures, originalRunId, ...(run.nativeCorrection ? { correctionReason: run.nativeCorrection.reason } : {}), calculationVersion: NATIVE_CALCULATOR_VERSION, ruleEvidence: { status: 'FEDERAL_EMPLOYEE_STATUTORY_CENTS_OTHER_OPERATIONS_EXACT', otherOperationsExactnessAssessmentSha256: EXACT_CENT_ASSESSMENT_SHA256, federalEmployeeRuleId: FEDERAL_EMPLOYEE_CENT_RULE_SOURCE.id, federalEmployeeCollectionSourceSha256: FEDERAL_EMPLOYEE_CENT_RULE_SOURCE.sha256 } } };
    return { run: next, snapshot, guards };
}
