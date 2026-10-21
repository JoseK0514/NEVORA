import type { PayrollRun } from '../contracts';
import type { Snapshot } from '../service';
import { PayrollError } from '../model';
import { hash } from '../store';
import { add, hourlyRate, multiply, ratio, serialized } from './money';
import { NATIVE_PAYSTUB_PRESENTATION_VERSION, NATIVE_PAYSTUB_TEMPLATE_VERSION, type NativePaystubPresentation } from './paystub-document';
const TAX_CODES = new Set(['PR_INCOME_TAX', 'SOCIAL_SECURITY', 'MEDICARE', 'ADDITIONAL_MEDICARE', 'SINOT']);
const taxLabels = { es: { PR_INCOME_TAX: 'Contribución sobre ingresos de Puerto Rico', SOCIAL_SECURITY: 'Seguro Social', MEDICARE: 'Medicare', ADDITIONAL_MEDICARE: 'Medicare adicional', SINOT: 'Seguro por incapacidad (SINOT)' }, en: { PR_INCOME_TAX: 'Puerto Rico income tax', SOCIAL_SECURITY: 'Social Security', MEDICARE: 'Medicare', ADDITIONAL_MEDICARE: 'Additional Medicare', SINOT: 'Disability insurance (SINOT)' } };
const employerLabels: Record<'es' | 'en', Record<string, string>> = {
    es: { SOCIAL_SECURITY: 'Seguro Social', MEDICARE: 'Medicare', SINOT: 'Seguro por incapacidad (SINOT)', FUTA: 'Contribución federal de desempleo (FUTA)', PR_UI: 'Seguro de desempleo de Puerto Rico', CFSE: 'Seguro del Fondo del Seguro del Estado (CFSE)' },
    en: { SOCIAL_SECURITY: 'Social Security', MEDICARE: 'Medicare', SINOT: 'Disability insurance (SINOT)', FUTA: 'Federal unemployment tax (FUTA)', PR_UI: 'Puerto Rico unemployment insurance', CFSE: 'Workers compensation insurance (CFSE)' },
};
const builtinEmployerLabels: Record<string, string[]> = { SOCIAL_SECURITY: ['Employer Social Security'], MEDICARE: ['Employer Medicare'], SINOT: ['Employer SINOT'] };
function employerLabel(language: 'es' | 'en', code: string, actualLabel?: string) {
    const localized = employerLabels[language][code];
    const defaults = [code, code.replaceAll('_', ' '), employerLabels.en[code], employerLabels.es[code], ...(builtinEmployerLabels[code] ?? [])];
    return actualLabel && !defaults.includes(actualLabel) ? actualLabel : localized ?? actualLabel ?? code.replaceAll('_', ' ');
}
const sum = (values: string[]) => values.reduce((n, s) => n + BigInt(s), BigInt(0)).toString();
export function nativeEmployeePresentation(run: PayrollRun, snapshot: Snapshot, employeeId: string): NativePaystubPresentation {
    const native = snapshot.native, result = run.nativeCalculation?.employees.find(e => e.employeeId === employeeId), row = run.rows?.find(e => e.employeeId === employeeId);
    if (run.sourceAuthority !== 'NATIVE_RECORDED_TIME' || run.nativeCalculation?.state !== 'ready' || !native || !result || !row || !run.approvedAt || run.nativeCalculation.templateVersion !== NATIVE_PAYSTUB_TEMPLATE_VERSION || hash({ ...result.row, employeeName: row.employeeName }) !== hash(row))
        throw new PayrollError('NATIVE_DOCUMENT_SNAPSHOT_CONFLICT', 409);
    const coverage = native.employeeCoverage[employeeId];
    const required = [...new Set([...result.breakdown.locationIds, ...result.breakdown.ytdBefore.locationIds, ...result.breakdown.ytdAfter.locationIds, ...(native.facts.inputs.find(i => i.employeeId === employeeId)?.timecards.flatMap(c => c.entries.map(e => e.locationId)) ?? [])])];
    if (!coverage?.complete || required.some(id => !coverage.locationIds.includes(id)))
        throw new PayrollError('NATIVE_DOCUMENT_COVERAGE_REQUIRED', 409);
    const language = snapshot.exceptions.find(e => e.exception.employeeId === employeeId)?.exception.language ?? snapshot.settings.preferences.language;
    const after = result.breakdown.ytdAfter, labels = new Map(row.employeeDeductions.map(d => [d.code, d.label]));
    for (const d of native.facts.inputs.find(i => i.employeeId === employeeId)?.deductions ?? [])
        labels.set(d.code, d.label);
    for (const [code, label] of Object.entries(taxLabels[language]))
        labels.set(code, label);
    const codes = [...new Set([...Object.keys(after.deductions), ...row.employeeDeductions.map(d => d.code)])].sort();
    const lines = (taxes: boolean) => codes.filter(code => TAX_CODES.has(code) === taxes).map(code => ({ label: labels.get(code) ?? code.replaceAll('_', ' '), amount: { currentMinor: row.employeeDeductions.find(d => d.code === code)?.amountMinor ?? '0', ytdMinor: after.deductions[code] ?? '0' } }));
    const taxes = lines(true), authorizedDeductions = lines(false), employerCodes = [...new Set([...Object.keys(after.employerContributions), ...row.employerContributions.map(d => d.code)])].sort();
    const employer = employerCodes.map(code => ({ label: employerLabel(language, code, row.employerContributions.find(d => d.code === code)?.label), amount: { currentMinor: row.employerContributions.find(d => d.code === code)?.amountMinor ?? '0', ytdMinor: after.employerContributions[code] ?? '0' } }));
    const total = (rows: typeof taxes) => ({ currentMinor: sum(rows.map(d => d.amount.currentMinor)), ytdMinor: sum(rows.map(d => d.amount.ytdMinor)) });
    return { version: NATIVE_PAYSTUB_PRESENTATION_VERSION, templateVersion: NATIVE_PAYSTUB_TEMPLATE_VERSION, sourceAuthority: 'NATIVE_RECORDED_TIME', currency: 'USD', language, companyName: snapshot.settings.preferences.companyName, employeeName: row.employeeName, employeeReference: employeeId, period: run.period, payDate: run.payday, approvedAt: run.approvedAt, runReference: run.id, runRevision: run.revision, correction: run.correctionOf ? { kind: 'REPLACEMENT', originalRunReference: native.originalRunId, replacesRunReference: run.correctionOf } : { kind: 'ORIGINAL' }, ytdYear: after.year,
        earnings: result.breakdown.earnings.map(e => { if (e.kind === 'FLSA_TRUE_UP')
            return { label: language === 'es' ? 'Ajuste de prima semanal' : 'Weekly premium true-up', kind: e.kind, amountMinor: e.amountMinor }; const base = hourlyRate(e.rateMinorPerHour), basis = e.premiumBasisMinorPerHour ? ratio(BigInt(e.premiumBasisMinorPerHour.numerator), BigInt(e.premiumBasisMinorPerHour.denominator)) : ratio(BigInt(0)); const wage = native.facts.inputs.find(i => i.employeeId === employeeId)?.wages.find(w => w.id === e.wageProfileId && w.revision === e.wageRevision); if (!wage)
            throw new PayrollError('NATIVE_DOCUMENT_SNAPSHOT_CONFLICT', 409); const premium = e.kind === 'OVERTIME' ? multiply(basis, wage.overtime === 'DOUBLE_PRESERVED' ? ratio(BigInt(1)) : ratio(BigInt(1), BigInt(2))) : ratio(BigInt(0)); return { label: language === 'es' ? (e.kind === 'REGULAR' ? 'Horas regulares' : 'Horas extra') : (e.kind === 'REGULAR' ? 'Regular hours' : 'Overtime hours'), kind: e.kind, amountMinor: e.amountMinor, work: { nanoseconds: e.nanoseconds, baseRateMinorPerHour: serialized(base), premiumRateMinorPerHour: serialized(premium), paidRateMinorPerHour: serialized(add(base, premium)) } }; }),
        taxes, authorizedDeductions, totals: { gross: { currentMinor: row.grossMinor, ytdMinor: after.grossMinor }, taxes: total(taxes), authorizedDeductions: total(authorizedDeductions), net: { currentMinor: row.netMinor, ytdMinor: after.netMinor } }, employerContributions: { lines: employer, total: total(employer) }, sourceReferences: [{ label: language === 'es' ? 'Referencia de nómina aprobada' : 'Approved payroll reference', value: `${run.id} / ${run.revision}` }] };
}
