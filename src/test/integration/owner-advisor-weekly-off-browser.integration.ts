import { expect, it } from '@rstest/core';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createOwnedNextApp } from './owned-next-app';
import { seedOwnedApp, TEST_PASSWORD } from './owned-app-fixture';
import { fictionalProfile } from '../fixtures/shift-changes';
import { businessDate } from '../../lib/business-time';
import { addDays, weekStartFor } from '../../lib/date-utils';
import { weeklyService } from '../../lib/owner-advisor/weekly-service.server';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
it('keeps only historical receipt recovery available in the real weekly-off UI', async () => {
  if (!process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE) throw Error('External evidence path required');
  const evidence = resolve(process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE, 'weekly-off-real-ui'); await mkdir(evidence, { recursive: true });
  const app = await createOwnedNextApp(evidence, { ownerAdvisorEnabled: true, ownerAdvisorWeeklyEnabled: false });
  const runtime = createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright');
  const browser = await runtime.chromium.launch({ headless: true }), context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage(), origin = app.url.replace('127.0.0.1', 'localhost'), external: string[] = [], errors: string[] = [];
  let complete = false;
  try {
    await seedOwnedApp(app.database.executor); const ex = app.database.executor;
    const q = (text: string, values: readonly unknown[] = []) => ex.query({ text, values });
    await q(`DELETE FROM location_coverage_windows;
      INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('off-demand','loc-1',1,'08:00','12:00');
      INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('OFF-A','Fictional Private','Off Worker','555-0141','EMPLOYEE','loc-1');
      INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('OFF-A','loc-1');
      INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('off-av','OFF-A',1,'08:00','12:00');`);
    await q("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) VALUES('OFF-A',40,$1::jsonb)", [JSON.stringify(fictionalProfile())]);
    const [workspace] = await ex.query<{ time_zone: string }>({ text: 'SELECT time_zone FROM workspaces WHERE singleton=true', values: [] });
    const week = addDays(weekStartFor(businessDate(new Date(), workspace.time_zone)), 7);
    await q("INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) VALUES('OFF-A',$1,true)", [week]);
    await context.route('**/*', async (route: { request(): { url(): string }; abort(): Promise<void>; continue(): Promise<void> }) => {
      const url = new URL(route.request().url()); if (['http:','https:'].includes(url.protocol) && url.origin !== origin) { external.push(url.origin); await route.abort(); } else await route.continue();
    });
    page.on('pageerror', (e: Error) => errors.push(e.message)); page.setDefaultTimeout(20000);
    await page.goto(origin + '/login'); await page.getByLabel('Employee ID', { exact: true }).fill('QAOWNER'); await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.waitForURL(origin + '/app');
    const sessions = await ex.query<{ sessionTokenHash: string }>({ text: "SELECT token_hash AS \"sessionTokenHash\" FROM employee_sessions WHERE employee_id='QAOWNER' AND expires_at>clock_timestamp()", values: [] }); expect(sessions).toHaveLength(1);
    const [employee] = await ex.query<SessionMutationProof['employee']>({ text: "SELECT id,first_name AS \"firstName\",last_name AS \"lastName\",role,primary_location_id AS \"primaryLocationId\" FROM employees WHERE id='QAOWNER'", values: [] });
    const proof: SessionMutationProof = { employee, sessionTokenHash: sessions[0].sessionTokenHash };
    // Historical setup uses the real on-service and the actual browser session.
    // The running Next application remains weekly-off throughout this scenario.
    const env = { NEVORA_OWNER_ADVISOR_ENABLED: 'true', NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED: 'true' };
    const send = (value: unknown) => weeklyService(proof, ex, env, AbortSignal.timeout(20000), value);
    const comparison = await send({ op: 'compare_week', requestId: randomUUID(), weekStart: week, mode: 'FILL_GAPS_ONLY', locationScope: { kind: 'SELECTED', locationIds: ['loc-1'] } });
    const option = comparison.comparison?.alternatives.find(a => a.applyEligible); expect(option).toBeDefined();
    const read = await send({ op: 'read_week_plan', requestId: randomUUID(), reviewId: option!.id }); expect(read.readReceiptId).toBeTruthy();
    const operationId = randomUUID();
    const saved = await send({ op: 'apply_week_plan', requestId: operationId, reviewId: option!.id, termsDigest: option!.termsDigest, readReceiptId: read.readReceiptId, acknowledged: true }); expect(saved.state).toBe('saved');
    const response = page.waitForResponse((r: { url(): string; request(): { method(): string; postDataJSON(): { op?: string } } }) => r.url().endsWith('/api/owner/advisor/weekly') && r.request().method() === 'POST' && r.request().postDataJSON().op === 'check_week_plan');
    await page.goto(origin + '/app/ai-manager/weekly?review=' + option!.id); const actual = await response; expect(actual.status()).toBe(200);
    const body = await actual.json(); expect(body.state).toBe('saved'); expect(body.receipt.operationId).toBe(operationId); expect(body.review).toBeNull(); expect(body.comparison).toBeNull(); expect(body.progress).toBeNull();
    await page.getByRole('heading', { name: 'What was saved', exact: true }).waitFor(); await page.getByText('Not shown while weekly planning is off', { exact: true }).waitFor();
    expect(await page.locator('.wk').getByText(/Fictional Private|Off Worker/).count()).toBe(0);
    expect(await page.getByRole('button', { name: 'Save as draft', exact: true }).count()).toBe(0);
    expect(await page.getByRole('button', { name: 'Compare options', exact: true }).count()).toBe(0);
    const denied = await page.evaluate(async (value: unknown) => { const r = await fetch('/api/owner/advisor/weekly', { method: 'POST', headers: { 'content-type': 'application/json', 'x-nevora-owner-advisor': '1' }, body: JSON.stringify(value) }); return { status: r.status, body: await r.json() }; }, { op: 'compare_week', requestId: randomUUID(), weekStart: week, mode: 'FILL_GAPS_ONLY', locationScope: { kind: 'ALL' } });
    expect(denied.status).toBe(503); expect(denied.body.code).toBe('disabled');
    expect(await q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: saved.receipt!.added }]);
    expect(await q('SELECT (SELECT count(*)::int FROM notifications) notifications,(SELECT count(*)::int FROM schedule_publication_revisions) publications')).toEqual([{ notifications: 0, publications: 0 }]);
    await page.screenshot({ path: resolve(evidence, 'chromium-390-minimal-receipt.png'), fullPage: true }); expect(external).toEqual([]); expect(errors).toEqual([]); complete = true;
  } finally { await context.close(); await browser.close(); await app.close();
    await writeFile(resolve(evidence, 'report.json'), JSON.stringify({ complete, external, errors, source: app.sourceHashes, modelConfigured: false,
      fixture: 'Historical draft saved through real on-service bound to actual browser session; running Next remains weekly-off; no runtime flag transition claimed', engine: 'chromium' }, null, 2)); }
});
