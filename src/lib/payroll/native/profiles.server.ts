import "server-only";
import type { SqlExecutor, SqlStatement } from "../../notifications/types";
import type { SessionMutationProof } from "../../shift-changes/types";
import { neonNotificationExecutor } from "../../data/notification-transactions";
import { guarded, locks, authority, hash, statement as q, workspaceSql as ws } from "../store";
import { PayrollError } from "../model";
import { parseNativeProfileCommand } from "./model";
import { Temporal } from "@js-temporal/polyfill";
import { NATIVE_FULL_CONTRACT_FORM_VERSION, NATIVE_PLAIN_SETUP_FORM_VERSION } from "./contracts";
import type { NativeProfileReceipt, NativeProfilesResponse, NativeConfigurationRevision, NativeProfileCommand, NativePlainSetupCommand, NativeSetupRecord, NativeCompanyPayrollFacts, NativeYtd, NativeConfiguration } from "./contracts";
import { buildSetupRecord, isPlainSetupCommand, materializeConfiguration, materializeOpening, nextRateHistory, parsePlainSetupCommand, verifySetupRecord, type PlainPayFactsRecord, type SetupRecordInput } from "./setup";
const check = (condition: string, ...values: unknown[]): SqlStatement => q(`SELECT (CASE WHEN ${condition} THEN '1' ELSE 'NATIVE_PROFILE_CONFLICT' END)::integer`, ...values);
const member = (employeeId: string) => check(`EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE e.id=$1 AND l.workspace_id=${ws})`, employeeId);
const locations = (ids: string[]) => check(`(SELECT count(*) FROM locations WHERE workspace_id=${ws} AND active AND id=ANY($1::text[]))=cardinality($1::text[])`, ids);
const profileRevision = (employeeId: string, expected: number) => check(`COALESCE((SELECT max(revision) FROM native_payroll_profile_revisions WHERE workspace_id=${ws} AND employee_id=$1),0)=$2`, employeeId, expected);
const openingRevision = (employeeId: string, year: number, expected: number) => check(`COALESCE((SELECT max(revision) FROM native_payroll_opening_ytd_revisions WHERE workspace_id=${ws} AND employee_id=$1 AND tax_year=$2),0)=$3`, employeeId, year, expected);
const companyRevision = (expected: number) => check(`COALESCE((SELECT max(revision) FROM native_payroll_setup_records WHERE workspace_id=${ws} AND kind='COMPANY_DEFAULTS'),0)=$1`, expected);
const insertRecord = (r: NativeSetupRecord, actorId: string) => q(`INSERT INTO native_payroll_setup_records(workspace_id,kind,subject_id,tax_year,revision,operation_id,actor_employee_id,facts_sha256,payload) VALUES(${ws},$1,$2,$3,$4,$5::uuid,$6,$7,$8::jsonb)`, r.kind, r.subjectId, r.taxYear, r.revision, r.operationId, actorId, r.factsSha256, JSON.stringify(r));
const insertProfile = (employeeId: string, revision: number, payload: NativeConfigurationRevision) => q(`INSERT INTO native_payroll_profile_revisions VALUES(${ws},$1,$2,$3::jsonb)`, employeeId, revision, JSON.stringify(payload));
const insertOpening = (employeeId: string, ytd: NativeYtd) => q(`INSERT INTO native_payroll_opening_ytd_revisions VALUES(${ws},$1,$2,$3,$4::jsonb)`, employeeId, ytd.year, ytd.revision, JSON.stringify(ytd));
/** The Owner as the session knows them; the record keeps this name with the id. */
const actor = (proof: SessionMutationProof) => ({ employeeId: proof.employee.id, name: `${proof.employee.firstName ?? ""} ${proof.employee.lastName ?? ""}`.trim() || proof.employee.id });
const prYear = (instant: string) => Temporal.Instant.from(instant).toZonedDateTimeISO("America/Puerto_Rico").year;
async function saved(proof: SessionMutationProof, input: {
    operationId: string;
}, ex: SqlExecutor) {
    const [row] = await guarded<{
        payload: NativeProfileReceipt;
        command_hash: string;
    }>(proof, "OWNER", q(`SELECT payload,command_hash FROM payroll_command_receipts WHERE workspace_id=${ws} AND actor_id=$1 AND operation_id=$2::uuid`, proof.employee.id, input.operationId), ex);
    if (row && row.command_hash !== hash(input))
        throw new PayrollError("OPERATION_CONFLICT", 409);
    return row?.payload;
}
export async function nativeProfiles(proof: SessionMutationProof, ex: SqlExecutor = neonNotificationExecutor()): Promise<NativeProfilesResponse> {
    const [row] = await guarded<Omit<NativeProfilesResponse, "version" | "setup"> & { company: NativeSetupRecord | null; records: NativeSetupRecord[] }>(proof, "OWNER", q(`SELECT COALESCE((SELECT jsonb_agg(payload ORDER BY employee_id) FROM native_payroll_profiles_current WHERE workspace_id=${ws}),'[]') AS configurations,COALESCE((SELECT jsonb_agg(jsonb_build_object('employeeId',employee_id,'ytd',payload) ORDER BY employee_id,tax_year) FROM native_payroll_opening_ytd_current WHERE workspace_id=${ws}),'[]') AS "openingYtd",COALESCE((SELECT jsonb_agg(payload ORDER BY employee_id) FROM native_payroll_manager_scopes_current WHERE workspace_id=${ws}),'[]') AS "managerScopes",(SELECT payload FROM native_payroll_setup_records_current WHERE workspace_id=${ws} AND kind='COMPANY_DEFAULTS') AS company,COALESCE((SELECT jsonb_agg(payload ORDER BY kind,subject_id,tax_year) FROM native_payroll_setup_records_current WHERE workspace_id=${ws} AND kind<>'COMPANY_DEFAULTS'),'[]') AS records`), ex);
    const { company, records, ...rest } = row;
    // Each record is re-hashed on read so the audit view can show it still matches.
    const withIntegrity = (r: NativeSetupRecord) => ({ ...r, verified: verifySetupRecord(r) });
    return { ...rest, setup: { companyDefaults: company ? withIntegrity(company) : null, records: records.map(withIntegrity) }, version: "PAYROLL_NATIVE_PROFILES_V1" };
}
/** Owner-only append of plain setup, configuration, opening-YTD attestation or Manager scope.
 * Subject/location checks and expectedRevision run with actor-scoped receipt storage;
 * replay accepts the same operation only when the normalized command hash matches.
 * Every pay or opening revision also appends its immutable server setup record. */
export async function saveNativeProfile(proof: SessionMutationProof, value: unknown, ex: SqlExecutor = neonNotificationExecutor()): Promise<NativeProfileReceipt> {
    const c: NativeProfileCommand = isPlainSetupCommand(value) ? parsePlainSetupCommand(value) : parseNativeProfileCommand(value);
    const prior = await saved(proof, c, ex);
    if (prior)
        return prior;
    const plan = c.action === "SAVE_COMPANY_PAYROLL_DEFAULTS" || c.action === "SAVE_EMPLOYEE_PAY_SETUP" ? await plainPlan(proof, c, ex) : legacyPlan(proof, c);
    try {
        await ex.transaction([...locks(), ...authority(proof, "OWNER"), ...plan.mutations, q(`INSERT INTO payroll_command_receipts VALUES(${ws},$1,$2::uuid,$3,$4::jsonb)`, proof.employee.id, c.operationId, hash(c), JSON.stringify(plan.receipt)), ...authority(proof, "OWNER")]);
        return plan.receipt;
    }
    catch (error) {
        const retry = await saved(proof, c, ex);
        if (retry)
            return retry;
        throw error;
    }
}
type Plan = { receipt: NativeProfileReceipt; mutations: SqlStatement[] };
function legacyPlan(proof: SessionMutationProof, c: Exclude<NativeProfileCommand, NativePlainSetupCommand>): Plan {
    const employeeId = c.action === "SAVE_NATIVE_PROFILE" ? c.configuration.employeeId : c.employeeId, revision = c.expectedRevision + 1;
    const receipt: NativeProfileReceipt = { operationId: c.operationId, action: c.action, employeeId, revision };
    const mutations: SqlStatement[] = [member(employeeId)];
    const enteredAt = new Date().toISOString();
    // Detailed full-contract saves keep their supplied references and also get a server record.
    const record = (kind: "EMPLOYEE_PAY" | "OPENING_TOTALS", taxYear: number, facts: unknown) => buildSetupRecord({ kind, subjectId: employeeId, taxYear, revision, formVersion: NATIVE_FULL_CONTRACT_FORM_VERSION, operationId: c.operationId, enteredBy: actor(proof), enteredAt, cause: "OWNER_ENTRY", derivedFrom: { companyDefaults: null, opening: null, locationIds: [] }, facts });
    if (c.action === "SAVE_NATIVE_PROFILE") {
        const payload: NativeConfigurationRevision = { ...c.configuration, revision, actorId: proof.employee.id, reason: c.reason, createdAt: enteredAt };
        mutations.push(locations([...new Set(c.configuration.wages.flatMap(w => w.locationIds))]), profileRevision(employeeId, c.expectedRevision), insertProfile(employeeId, revision, payload), insertRecord(record("EMPLOYEE_PAY", 0, { reason: c.reason, configuration: c.configuration }), proof.employee.id));
    }
    else if (c.action === "ATTEST_OPENING_YTD") {
        mutations.push(locations(c.ytd.locationIds), openingRevision(employeeId, c.ytd.year, c.expectedRevision), insertOpening(employeeId, { ...c.ytd, revision }), insertRecord(record("OPENING_TOTALS", c.ytd.year, { reason: c.reason, ytd: { ...c.ytd, revision } }), proof.employee.id));
    }
    else {
        mutations.push(locations(c.locationIds), check(`EXISTS(SELECT 1 FROM employees WHERE id=$1 AND active AND role='MANAGER')`, employeeId), check(`COALESCE((SELECT max(revision) FROM native_payroll_manager_scope_revisions WHERE workspace_id=${ws} AND employee_id=$1),0)=$2`, employeeId, c.expectedRevision), q(`INSERT INTO native_payroll_manager_scope_revisions SELECT ${ws},e.id,$2,e.updated_at::text,$3::jsonb||jsonb_build_object('subjectEmployeeVersion',e.updated_at::text) FROM employees e WHERE e.id=$1`, employeeId, revision, JSON.stringify({ employeeId, revision, review: c.review, approve: c.approve, locationIds: c.locationIds, reason: c.reason, actorId: proof.employee.id, operationId: c.operationId })));
    }
    return { receipt, mutations };
}

type PlainEmployee = {
    employeeId: string;
    primaryLocationId: string | null;
    profile: (NativeConfigurationRevision & { setupFormVersion?: string }) | null;
    payRecord: NativeSetupRecord | null;
    opening: { revision: number; ytd: NativeYtd } | null;
    openingRecord: NativeSetupRecord | null;
    frozen: boolean;
};
type PlainState = { company: NativeSetupRecord | null; locations: string[]; breakTypes: { id: string }[]; employees: PlainEmployee[] };
/** Read everything a plain save combines, under the same Owner guard. The write
 * transaction re-checks each revision it relied on, so a concurrent save conflicts. */
async function plainState(proof: SessionMutationProof, ids: string[] | null, year: number, ex: SqlExecutor): Promise<PlainState> {
    const subjects = ids === null
        ? `SELECT r.subject_id AS id FROM native_payroll_setup_records_current r JOIN native_payroll_profiles_current p ON p.workspace_id=r.workspace_id AND p.employee_id=r.subject_id AND p.revision=r.revision WHERE r.workspace_id=${ws} AND r.kind='EMPLOYEE_PAY' AND r.payload->>'formVersion'='${NATIVE_PLAIN_SETUP_FORM_VERSION}' AND cardinality($1::text[])=0`
        : `SELECT unnest($1::text[]) AS id`;
    const employeeSql = `SELECT jsonb_build_object('employeeId',e.id,'primaryLocationId',e.primary_location_id,
 'profile',(SELECT payload FROM native_payroll_profiles_current p WHERE p.workspace_id=${ws} AND p.employee_id=e.id),
 'payRecord',(SELECT payload FROM native_payroll_setup_records_current r WHERE r.workspace_id=${ws} AND r.kind='EMPLOYEE_PAY' AND r.subject_id=e.id),
 'opening',(SELECT jsonb_build_object('revision',y.revision,'ytd',y.payload) FROM native_payroll_opening_ytd_current y WHERE y.workspace_id=${ws} AND y.employee_id=e.id AND y.tax_year=$2),
 'openingRecord',(SELECT payload FROM native_payroll_setup_records_current r WHERE r.workspace_id=${ws} AND r.kind='OPENING_TOTALS' AND r.subject_id=e.id AND r.tax_year=$2),
 'frozen',EXISTS(SELECT 1 FROM native_payroll_ledger l WHERE l.workspace_id=${ws} AND l.employee_id=e.id AND l.tax_year=$2)) AS value FROM employees e JOIN locations loc ON loc.id=e.primary_location_id WHERE loc.workspace_id=${ws} AND e.id IN(${subjects})`;
    const [row] = await guarded<PlainState>(proof, "OWNER", q(`SELECT (SELECT payload FROM native_payroll_setup_records_current WHERE workspace_id=${ws} AND kind='COMPANY_DEFAULTS') AS company,
 COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM locations WHERE workspace_id=${ws} AND active),'[]') AS locations,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id) ORDER BY id) FROM clocker_break_types WHERE workspace_id=${ws}),'[]') AS "breakTypes",
 COALESCE((SELECT jsonb_agg(value ORDER BY value->>'employeeId') FROM (${employeeSql}) selected),'[]') AS employees`, ids ?? [], year), ex);
    if (!row || row.employees.length > 300)
        throw new PayrollError("NATIVE_SOURCE_LIMIT", 409);
    return row;
}
/** Build one employee's next plain profile revision and its setup record. */
function employeeRevision(args: { proof: SessionMutationProof; operationId: string; enteredAt: string; employee: PlainEmployee; company: NativeSetupRecord; entered: PlainPayFactsRecord["entered"]; rates: PlainPayFactsRecord["rates"]; opening: { ytd: NativeYtd; record: NativeSetupRecord | null } | null; locationIds: string[]; cause: SetupRecordInput["cause"] }) {
    const { employee, company, opening } = args, revision = (employee.profile?.revision ?? 0) + 1;
    const facts: PlainPayFactsRecord = { entered: args.entered, rates: args.rates };
    const record = buildSetupRecord({ kind: "EMPLOYEE_PAY", subjectId: employee.employeeId, taxYear: 0, revision, formVersion: NATIVE_PLAIN_SETUP_FORM_VERSION, operationId: args.operationId, enteredBy: actor(args.proof), enteredAt: args.enteredAt, cause: args.cause, derivedFrom: { companyDefaults: { revision: company.revision, sha256: company.factsSha256 }, opening: opening ? { taxYear: opening.ytd.year, revision: opening.ytd.revision, sha256: opening.record?.factsSha256 ?? opening.ytd.ledgerFingerprint } : null, locationIds: [...args.locationIds].sort() }, facts });
    // Authorized deductions saved through the detailed interface stay as recorded.
    const configuration: NativeConfiguration = materializeConfiguration({ employeeId: employee.employeeId, revision, rates: args.rates, withholding: args.entered.withholding, pay: record, company, companyFacts: company.facts as NativeCompanyPayrollFacts, opening: opening?.ytd ?? null, locationIds: args.locationIds, deductions: employee.profile?.deductions ?? [] });
    const payload = { ...configuration, revision, actorId: args.proof.employee.id, reason: args.cause === "COMPANY_DEFAULTS_APPLIED" ? "Company payroll defaults applied" : "Pay setup saved", createdAt: args.enteredAt, setupFormVersion: NATIVE_PLAIN_SETUP_FORM_VERSION, setupReference: record.reference };
    return { revision, record, payload, mutations: [member(employee.employeeId), profileRevision(employee.employeeId, employee.profile?.revision ?? 0), insertProfile(employee.employeeId, revision, payload), insertRecord(record, args.proof.employee.id)] };
}
async function plainPlan(proof: SessionMutationProof, c: NativePlainSetupCommand, ex: SqlExecutor): Promise<Plan> {
    const enteredAt = new Date().toISOString();
    if (c.action === "SAVE_COMPANY_PAYROLL_DEFAULTS") {
        const year = prYear(enteredAt), state = await plainState(proof, null, year, ex);
        if ((state.company?.revision ?? 0) !== c.expectedRevision)
            throw new PayrollError("NATIVE_PROFILE_CONFLICT", 409);
        const known = new Set(state.breakTypes.map(b => b.id));
        if (c.defaults.breakPay.some(b => !known.has(b.typeId)))
            throw new PayrollError("NATIVE_PROFILE_CONFLICT", 409);
        if (!state.locations.length)
            throw new PayrollError("PAYROLL_LOCATION_REQUIRED", 409);
        const revision = c.expectedRevision + 1;
        const company = buildSetupRecord({ kind: "COMPANY_DEFAULTS", subjectId: "COMPANY", taxYear: 0, revision, formVersion: NATIVE_PLAIN_SETUP_FORM_VERSION, operationId: c.operationId, enteredBy: actor(proof), enteredAt, cause: "OWNER_ENTRY", derivedFrom: { companyDefaults: null, opening: null, locationIds: [] }, facts: c.defaults });
        const mutations: SqlStatement[] = [companyRevision(c.expectedRevision), check(`(SELECT count(*) FROM clocker_break_types WHERE workspace_id=${ws} AND id=ANY($1::text[]))=cardinality($1::text[])`, c.defaults.breakPay.map(b => b.typeId)), insertRecord(company, proof.employee.id), locations(state.locations)];
        // Employees inherit the defaults: append each plain-setup person's next revision in the same transaction.
        for (const employee of state.employees) {
            const facts = employee.payRecord?.facts as PlainPayFactsRecord | undefined;
            if (!facts || !employee.profile)
                continue;
            const opening = employee.opening ? { ytd: { ...employee.opening.ytd, revision: employee.opening.revision }, record: employee.openingRecord } : null;
            mutations.push(...employeeRevision({ proof, operationId: c.operationId, enteredAt, employee, company, entered: facts.entered, rates: facts.rates, opening, locationIds: state.locations, cause: "COMPANY_DEFAULTS_APPLIED" }).mutations);
            mutations.push(openingRevision(employee.employeeId, year, employee.opening?.revision ?? 0));
        }
        return { receipt: { operationId: c.operationId, action: c.action, employeeId: "COMPANY", revision }, mutations };
    }
    const year = c.opening?.taxYear ?? prYear(enteredAt), state = await plainState(proof, [c.employeeId], year, ex);
    const employee = state.employees[0];
    if (!employee || state.employees.length !== 1)
        throw new PayrollError("NATIVE_PROFILE_CONFLICT", 409);
    if (!state.company)
        throw new PayrollError("COMPANY_PAYROLL_DEFAULTS_REQUIRED", 409);
    if ((employee.profile?.revision ?? 0) !== c.expectedRevision)
        throw new PayrollError("NATIVE_PROFILE_CONFLICT", 409);
    if (!state.locations.length || !employee.primaryLocationId)
        throw new PayrollError("PAYROLL_LOCATION_REQUIRED", 409);
    const mutations: SqlStatement[] = [companyRevision(state.company.revision), locations(state.locations)];
    let opening: { ytd: NativeYtd; record: NativeSetupRecord | null } | null = employee.opening ? { ytd: { ...employee.opening.ytd, revision: employee.opening.revision }, record: employee.openingRecord } : null;
    if (c.opening) {
        if ((employee.opening?.revision ?? 0) !== c.opening.expectedRevision)
            throw new PayrollError("NATIVE_PROFILE_CONFLICT", 409);
        // Approved payroll freezes the year's opening; the database trigger enforces it too.
        if (employee.frozen)
            throw new PayrollError("OPENING_TOTALS_LOCKED", 409);
        const revision = c.opening.expectedRevision + 1;
        const record = buildSetupRecord({ kind: "OPENING_TOTALS", subjectId: c.employeeId, taxYear: c.opening.taxYear, revision, formVersion: NATIVE_PLAIN_SETUP_FORM_VERSION, operationId: c.operationId, enteredBy: actor(proof), enteredAt, cause: "OWNER_ENTRY", derivedFrom: { companyDefaults: null, opening: null, locationIds: c.opening.totals.kind === "MID_YEAR" && c.opening.totals.grossMinor !== "0" ? [employee.primaryLocationId] : [] }, facts: c.opening.totals });
        const ytd = materializeOpening({ taxYear: c.opening.taxYear, revision, totals: c.opening.totals, record, primaryLocationId: employee.primaryLocationId });
        mutations.push(member(c.employeeId), locations(ytd.locationIds), openingRevision(c.employeeId, c.opening.taxYear, c.opening.expectedRevision), insertOpening(c.employeeId, ytd), insertRecord(record, proof.employee.id));
        opening = { ytd, record };
    }
    else
        mutations.push(openingRevision(c.employeeId, year, employee.opening?.revision ?? 0));
    const previous = employee.payRecord?.formVersion === NATIVE_PLAIN_SETUP_FORM_VERSION && employee.profile?.revision === employee.payRecord.revision ? (employee.payRecord.facts as PlainPayFactsRecord).rates : null;
    const next = employeeRevision({ proof, operationId: c.operationId, enteredAt, employee, company: state.company, entered: c.pay, rates: nextRateHistory(previous, c.pay), opening, locationIds: state.locations, cause: "OWNER_ENTRY" });
    mutations.push(...next.mutations);
    return { receipt: { operationId: c.operationId, action: c.action, employeeId: c.employeeId, revision: next.revision }, mutations };
}
