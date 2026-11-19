/** Explicit fictional evaluation of the real service and canonical database tools.
 * Offline rehearsal is the default. Real model quality is reviewed from captures. */
import { beforeAll, afterAll, expect, it, rs } from '@rstest/core';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { companyAccessFixture } from './company-access-fixture';
import { prepareLeadershipFixture, LEADERSHIP_DATE } from './rondo-leadership-fixture';
import { resilienceBusinessSnapshot } from './owner-advisor-resilience-fixture';
import { AdvisorStore } from '../../lib/owner-advisor/store.server';
import { AdvisorTools } from '../../lib/owner-advisor/tools.server';
import { admitOwner } from '../../lib/owner-advisor/authority.server';
import { advisorService } from '../../lib/owner-advisor/service.server';
import { record, type AdvisorAnswer, type AdvisorCommand } from '../../lib/owner-advisor/contracts';
import type { CoverageActionResult } from '../../lib/owner-advisor/coverage-actions';
import type { CoveragePlans } from '../../lib/owner-advisor/coverage-plan-contracts';
import { MANAGEMENT_LEDGER_PATH, openManagementContinuation, openManagementRepair, type ManagementLedger } from '../../../scripts/rondo-management-ledger.mjs';
import { openManagementCapture } from '../../../scripts/rondo-management-capture.mjs';

const repair = process.env.RONDO_MANAGEMENT_EVALUATION === 'fictional-approved-diagnostic-repair' || process.env.RONDO_MANAGEMENT_EVALUATION === 'fictional-offline-diagnostic-repair';
const live = ['fictional-approved-continuation', 'fictional-approved-diagnostic-repair'].includes(process.env.RONDO_MANAGEMENT_EVALUATION ?? '');
const evidenceName = `rondo-management-anthropic-${repair ? 'diagnostic-repair-' : ''}${live ? 'live' : 'offline'}-20261115.json`;
const evidencePath = live ? resolve(dirname(MANAGEMENT_LEDGER_PATH), evidenceName) : resolve('.omo/evidence', evidenceName);
const model = 'claude-sonnet-5-5', cutoff = '2026-11-18T00:00:00Z';
const actualFetch = globalThis.fetch;
const sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const executedFiles = ['src/test/integration/rondo-management-anthropic.live.ts', 'src/lib/owner-advisor/coverage-plan.server.ts', 'scripts/rondo-management-ledger.mjs', 'scripts/rondo-management-capture.mjs', 'vitest.rondo-management-anthropic.config.mts'];
const executedFileHashes = Object.fromEntries(await Promise.all(executedFiles.map(async file => [file, createHash('sha256').update(await readFile(file)).digest('hex')])));
const rows: Record<string, unknown>[] = [];
let ledger: ManagementLedger | undefined;
let writer: Awaited<ReturnType<typeof openManagementCapture>> | undefined;
let offlineDispatches = 0;
const externalDenied = rs.fn(async () => { throw Error('Unowned external request denied'); });
const cases = repair ? ['rondo-diagnostic-scope-en', 'rondo-diagnostic-scope-es'] : ['rondo-evidence-reversal-and-restoration', 'rondo-one-worker-two-sites', 'rondo-missing-policy-is-not-policy', 'rondo-identical-facts-new-preference'];
const env = () => ({ NEVORA_OWNER_ADVISOR_ENABLED: 'true', NEVORA_OWNER_ADVISOR_DATA_APPROVED: 'true',
  NEVORA_OWNER_ADVISOR_PROVIDER: 'anthropic', NEVORA_OWNER_ADVISOR_API_STYLE: 'anthropic_messages',
  NEVORA_OWNER_ADVISOR_MODEL: model, NEVORA_OWNER_ADVISOR_DAILY_LIMIT: '100',
  NEVORA_OWNER_ADVISOR_ANTHROPIC_CREDIT_EXPIRES_AT: cutoff,
  ANTHROPIC_API_KEY: live ? process.env.ANTHROPIC_API_KEY! : 'fictional-never-sent' });
const report = () => ({ mode: live ? 'live-fictional-owned-db' : 'offline-scripted-readiness', sourceHead, executedFileHashes,
  scriptedDispatches: live ? null : offlineDispatches, semanticAssessment: 'manual-review-required', externalUnownedAttempts: externalDenied.mock.calls.length, results: rows });
const checkpoint = async () => { await writer?.checkpoint(report()); };

beforeAll(async () => {
  if (process.env.RONDO_MANAGEMENT_EVALUATION && !['fictional-offline', 'fictional-offline-diagnostic-repair', 'fictional-approved-continuation', 'fictional-approved-diagnostic-repair'].includes(process.env.RONDO_MANAGEMENT_EVALUATION)) throw Error('Unknown evaluation mode');
  rs.stubEnv('NEVORA_PAYROLL_ENABLED', 'false');
  rs.stubGlobal('fetch', externalDenied);
  if (!live) {
    rs.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-15T12:00:00Z'));
    await mkdir(dirname(evidencePath), { recursive: true });
    writer = await openManagementCapture(evidencePath, { exclusive: false });
  }
  if (live) {
    if (!process.env.ANTHROPIC_API_KEY || process.env.RONDO_COMPARE_BUDGET_USD !== '2.50') throw Error('Approved scoped key and original allowance required');
  }
});
afterAll(async () => {
  if (live && !writer && rows.length) await writeFile(evidencePath + '.not-admitted-' + randomUUID() + '.json', JSON.stringify(report()) + '\n', { flag: 'wx', mode: 0o600 });
  await checkpoint();
  rs.restoreAllMocks(); rs.unstubAllEnvs(); rs.unstubAllGlobals();
  expect(externalDenied).not.toHaveBeenCalled();
});

function scriptedDecision(plan: CoveragePlans) {
  return { language: 'en', summary: 'Fictional scripted decision; this is not evidence of model intelligence.',
    assumptions: [], changeCondition: 'Recheck if recorded availability or company objectives change.', metrics: [],
    observations: [{ statement: 'The canonical coverage source is available for this date.', evidenceIds: ['E2'] }],
    options: plan.alternatives.map((_alternative, index) => ({ id: `plan-${index}`, description: 'Review this exact canonical allocation.', tradeoff: 'Recorded planning availability still requires human confirmation.', evidenceIds: ['E2'], feasibility: 'canonical_coverage', coverage: { evidenceId: 'E2', alternativeIndex: index } })),
    recommendation: { optionId: plan.alternatives.length ? 'plan-0' : null, rationale: 'Use only the current reviewed alternative and keep unmet requirements visible.' },
    uncertainties: ['Employee acceptance and attendance are not established.'], nextStep: 'Wait for the Owner to review exact draft changes; if unavailable, review a feasible fallback.',
    outcomeCheck: 'Compare the original receipt to the current canonical schedule after the explicit Owner save.', acknowledgedPartialEvidence: ['E1', 'E2'] };
}

function diagnosticOracle(plan: CoveragePlans) {
  const selected = plan.alternatives.find(a => a.assignments.some(s => s.employeeId === 'target' && s.locationId === 'loc-2') && a.issues.items.some(i => i.code === 'LOCATION_NOT_ELIGIBLE'));
  expect(selected, 'Fixture must expose the observed diagnostic ambiguity').toBeDefined();
  expect(selected!.issues.items.find(i => i.code === 'LOCATION_NOT_ELIGIBLE')!.message).toMatch(/^Unidentified rejected candidate variant; do not attribute to listed workers:/);
}

async function approvalJourney(f: Awaited<ReturnType<typeof companyAccessFixture>>, plan: CoveragePlans, answer: AdvisorAnswer) {
  expect(answer.coveragePlans?.sourceVersion).toBe(plan.sourceVersion);
  const selected = plan.alternatives[0];
  expect(selected.status).toBe('COMPLETE');
  const call = (command: AdvisorCommand) => advisorService(f.owner, f.db.executor, env(), new AbortController().signal, command) as Promise<CoverageActionResult>;
  const prepare = () => call({ op: 'prepare_coverage_draft', requestId: randomUUID(), date: plan.date, sourceVersion: plan.sourceVersion!,
    assignments: selected.assignments.map(a => ({ employeeId: a.employeeId, locationId: a.locationId, startTime: a.startTime, endTime: a.endTime, positionId: a.positionId ?? null, isDesignatedLead: a.isDesignatedLead })) });
  const baseline = await resilienceBusinessSnapshot(f);
  const terms = () => f.q('SELECT s.employee_id AS "employeeId",p.location_id AS "locationId",s.date::text AS date,left(s.start_time::text,5) AS "startTime",left(s.end_time::text,5) AS "endTime",s.position_id AS "positionId",s.is_designated_lead AS "isDesignatedLead" FROM shifts s JOIN schedules p ON p.id=s.schedule_id ORDER BY s.id');
  const sort = (values: unknown[]) => values.map(value => JSON.stringify(value)).sort();
  const beforeTerms = await terms();
  const selectedTerms = selected.assignments.map(a => ({ employeeId: a.employeeId, locationId: a.locationId, date: a.date, startTime: a.startTime, endTime: a.endTime, positionId: a.positionId ?? null, isDesignatedLead: a.isDesignatedLead }));
  const declined = await prepare();
  expect(declined.state).toBe('coverage_review');
  expect(await resilienceBusinessSnapshot(f)).toEqual(baseline); // Decline: no apply command.
  const reviewed = await prepare();
  expect(sort(reviewed.review.assignments.map(a => ({ employeeId: a.employeeId, locationId: a.locationId, date: reviewed.review.date, startTime: a.startTime, endTime: a.endTime, positionId: a.positionId, isDesignatedLead: a.isDesignatedLead })))).toEqual(sort(selectedTerms));
  expect(await resilienceBusinessSnapshot(f)).toEqual(baseline);
  await expect(call({ op: 'apply_coverage_draft', requestId: randomUUID(), reviewId: reviewed.review.id, acknowledged: false } as unknown as AdvisorCommand)).rejects.toMatchObject({ code: 'invalid' });
  expect(await resilienceBusinessSnapshot(f)).toEqual(baseline);
  const command = { op: 'apply_coverage_draft' as const, requestId: randomUUID(), reviewId: reviewed.review.id, acknowledged: true as const };
  const saved = await call(command);
  expect(sort(await terms())).toEqual(sort([...beforeTerms, ...selectedTerms]));
  const savedSnapshot = await resilienceBusinessSnapshot(f);
  const replay = await call(command);
  expect(await resilienceBusinessSnapshot(f)).toEqual(savedSnapshot);
  expect(saved.state).toBe('coverage_saved'); expect(replay.receipt).toEqual(saved.receipt);
  const progress = await call({ op: 'check_coverage_draft', requestId: randomUUID(), reviewId: reviewed.review.id });
  expect(progress.progress).toMatchObject({ assignmentsPresent: selected.assignments.length, assignmentsTotal: selected.assignments.length, publishedAssignments: 0 });
  expect(await f.q('SELECT (SELECT count(*)::int FROM notifications) notices,(SELECT count(*)::int FROM schedule_publication_revisions) publications')).toEqual([{ notices: 0, publications: 0 }]);
  return { declinedReview: declined.review.id, declineBusinessUnchanged: true, approvalRequired: true, exactPreparedTerms: selectedTerms, exactPersistedTerms: await terms(), saved, replayedSameReceipt: true, replayBusinessUnchanged: true, progress, noPublicationOrNotices: true,
    selectionQualification: 'The fictional Owner explicitly selected canonical alternative 1; model preference and semantic agreement are reviewed separately.' };
}

it.each(cases)('qualifies canonical management decisions: %s', async id => {
  let f: Awaited<ReturnType<typeof companyAccessFixture>> | undefined;
  const row: Record<string, unknown> = { id, state: 'started', stage: 'fixture-setup', turns: [], semanticAssessment: 'not-assessed' };
  rows.push(row);
  try {
    f = await companyAccessFixture();
    const fixtureId = id === 'rondo-diagnostic-scope-en' ? 'rondo-one-worker-two-sites' : id === 'rondo-diagnostic-scope-es' ? 'rondo-identical-facts-new-preference' : id;
    const setup = await prepareLeadershipFixture(f, fixtureId);
    const turnIndexes = repair ? [fixtureId === 'rondo-identical-facts-new-preference' ? 1 : 0] : setup.turns.map((_turn, index) => index);
    for (const index of turnIndexes) {
      const turn = setup.turns[index]; await turn.before?.();
      const question = fixtureId === 'rondo-identical-facts-new-preference' && index === 1 ? turn.question + ' Responde completamente en español y conserva los hechos y las alternativas canónicas.' : turn.question;
      row.stage = 'canonical-source-read';
      const store = new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor);
      const source = await new AdvisorTools(store).run({ name: 'coverage_plan', args: { date: LEADERSHIP_DATE } });
      const plan = source.coveragePlans!;
      if (repair) {
        diagnosticOracle(plan);
        expect(await f.q("SELECT location_id FROM employee_location_eligibility WHERE employee_id='target' ORDER BY location_id")).toEqual([{ location_id: 'loc-1' }, { location_id: 'loc-2' }]);
      }
      const before = await resilienceBusinessSnapshot(f);
      const calls: Record<string, unknown>[] = [];
      const capture: Record<string, unknown> = { index, question, canonicalSource: source, providerCalls: calls, startedAt: new Date().toISOString() };
      (row.turns as Record<string, unknown>[]).push(capture);
      const started = performance.now();
      const transport = async (url: string, init: RequestInit) => {
        if (url !== 'https://api.anthropic.com/v1/messages') throw Error('Unreviewed route');
        const body = String(init.body);
        if (body.includes(env().ANTHROPIC_API_KEY)) throw Error('Credential entered model body');
        const request = JSON.parse(body);
        const requestEvidence = request.messages.flatMap((message: Record<string, unknown>) => Array.isArray(message.content) ? message.content.filter(record).filter(block => block.type === 'tool_result').map(block => ({ toolUseId: block.tool_use_id, content: typeof block.content === 'string' ? JSON.parse(block.content) : block.content })) : []);
        const requestDigest = createHash('sha256').update(body).digest('hex');
        if (repair) {
          const evidence = requestEvidence.find((item: { content: { evidenceId?: string } }) => item.content.evidenceId === 'E2');
          diagnosticOracle(evidence.content.currentTaskEvidence.coveragePlans);
          capture.actualDiagnosticEvidenceChecked = true;
        }
        if (live && !ledger) {
          ledger = await (repair ? openManagementRepair : openManagementContinuation)(MANAGEMENT_LEDGER_PATH, { approval: process.env.RONDO_COMPARE_APPROVAL_REFERENCE, sourceHead });
          writer = await openManagementCapture(evidencePath, { exclusive: true });
        }
        const attempt = live ? await ledger!.reserve(id, body) : null;
        await checkpoint();
        let response: Response;
          if (live) {
            try { ledger!.assertDispatch(attempt!); } catch {
              await ledger!.settle(attempt!, { outcome: 'dispatch_withheld' });
              throw Error('Grant expired after reservation; dispatch withheld');
            }
            try { response = await actualFetch(url, init); } catch {
              await ledger!.settle(attempt!, { outcome: 'uncertain_failure', requestDigest, requestEvidence });
              throw Error('Fictional native transport failed; reservation retained');
            }
          }
          else { offlineDispatches++; response = Response.json({ id: 'msg_fictional', type: 'message', role: 'assistant', model, stop_reason: 'tool_use', content: [{ type: 'tool_use', id: `review-${offlineDispatches}`, name: 'review_decision', input: scriptedDecision(plan) }] }); }
          const value: unknown = await response.clone().json().catch(() => null);
          const output = record(value) ? value : {};
          const content = Array.isArray(output.content) ? output.content.filter(record) : [];
          const safe = { requestDigest, requestEvidence, requestToolNames: request.tools.map((tool: { name: string }) => tool.name), outcome: response.ok ? 'http_success' : 'http_failure', httpStatus: response.status,
            stopReason: output.stop_reason ?? null, blockTypes: content.map(block => block.type),
            nativeTools: content.filter(block => block.type === 'tool_use').map(block => ({ name: block.name, input: block.input })),
            text: content.filter(block => block.type === 'text').map(block => String(block.text).slice(0, 12000)),
            providerUsage: record(output.usage) ? Object.fromEntries(['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'].filter(key => Number.isSafeInteger(output.usage && (output.usage as Record<string, unknown>)[key])).map(key => [key, (output.usage as Record<string, unknown>)[key]])) : null };
          if (JSON.stringify(safe).includes(env().ANTHROPIC_API_KEY)) throw Error('Credential found in provider output');
          calls.push(safe);
          if (live) await ledger!.settle(attempt!, safe);
          await checkpoint();
          return response;
      };
      try {
        row.stage = 'native-decision';
        const result = await advisorService(f.owner, f.db.executor, env(), new AbortController().signal,
          { op: 'ask_decision', requestId: randomUUID(), message: question, objective: 'Recommend a useful, evidence-based staffing decision for Owner approval.', focus: { kind: 'coverage', date: LEADERSHIP_DATE } }, transport);
        expect(result.state).toBe('answered');
        if (result.state !== 'answered') throw Error('Expected an answered decision');
        expect(result.answer.decision).toBeDefined();
        expect(await resilienceBusinessSnapshot(f)).toEqual(before);
        Object.assign(capture, { result, businessUnchanged: true, state: 'answered', latencyMs: Math.round(performance.now() - started) });
        await checkpoint();
        if (!repair && id === cases[0] && index === setup.turns.length - 1) { row.stage = 'exact-owner-approval'; row.approvalJourney = await approvalJourney(f, plan, result.answer); await checkpoint(); }
      } catch (error) {
        Object.assign(capture, { state: 'failed_or_stopped', safeErrorCode: record(error) && typeof error.code === 'string' ? error.code : 'fixture_or_transport_error', businessUnchanged: JSON.stringify(await resilienceBusinessSnapshot(f)) === JSON.stringify(before), latencyMs: Math.round(performance.now() - started) });
        row.state = 'incomplete';
        await checkpoint();
        throw error;
      }
    }
    row.state = 'technical-path-completed';
    row.stage = 'completed';
  } catch (error) {
    row.state = 'incomplete';
    row.safeErrorCode = record(error) && typeof error.code === 'string' ? error.code : 'fixture_or_transport_error';
    throw error;
  } finally {
    await checkpoint();
    if (live && ledger) await ledger.result(row);
    await f?.db.dispose();
  }
});
