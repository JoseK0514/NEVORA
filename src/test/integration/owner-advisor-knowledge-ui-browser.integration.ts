import { afterAll, beforeAll, expect, it } from '@rstest/core';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createOwnedNextApp } from './owned-next-app';
import { seedOwnedApp, TEST_PASSWORD } from './owned-app-fixture';
import type { KnowledgeReceipt } from '../../lib/owner-advisor/knowledge-client';
type Route = { request(): { url(): string; method(): string; postDataJSON(): { op?: string } }; fetch(): Promise<{ status(): number }>;
  abort(reason?: string): Promise<void>; continue(): Promise<void> };
type Response = { url(): string; status(): number; json(): Promise<KnowledgeReceipt>; request(): { method(): string; postDataJSON(): { op?: string; requestId?: string } } };
const runtimeRequire = createRequire(resolve('tools/ci-browser-runtime/package.json'));
const runtime = runtimeRequire('playwright');
let app: Awaited<ReturnType<typeof createOwnedNextApp>>, evidence: string;
const checks: string[] = [], errors: string[] = [], external: string[] = [];
let completedEngines = 0;
beforeAll(async () => {
  if (!process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE) throw Error('External evidence path required');
  evidence = resolve(process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE, 'knowledge-real-ui'); await mkdir(evidence, { recursive: true });
  app = await createOwnedNextApp(evidence, { ownerAdvisorEnabled: true, ownerAdvisorKnowledgeEnabled: true });
  await seedOwnedApp(app.database.executor);
});
afterAll(async () => {
  if (!app) return; await app.close();
  await writeFile(resolve(evidence, 'report.json'), JSON.stringify({ complete: completedEngines === 2, checks, errors, external,
    source: app.sourceHashes, modelConfigured: false, api: 'Actual authenticated Next knowledge screens/routes/SQL; no synthetic API responses',
    data: 'Fictional disposable owned loopback PostgreSQL only', fault: 'Actual draft write fetched to completion then reply aborted; retry must retain original operation' }, null, 2));
});
it.each(['chromium', 'webkit'])('%s manages and withdraws exact company knowledge through the real screens', async engine => {
  const origin = app.url.replace('127.0.0.1', 'localhost'), browser = await runtime[engine].launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }), page = await context.newPage();
  const q = (text: string, values: readonly unknown[] = []) => app.database.executor.query({ text, values });
  let phase = 'login', dropDraft = false, committedBeforeLoss = false;
  const draftIds: string[] = [];
  try {
    await context.route('**/*', async (route: Route) => {
      const req = route.request(), url = new URL(req.url());
      if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) { external.push(url.origin); await route.abort(); return; }
      if (url.pathname === '/api/owner/advisor/knowledge' && req.method() === 'POST' && req.postDataJSON().op === 'draft_document') {
        const command = req.postDataJSON() as { requestId: string }; draftIds.push(command.requestId);
        if (dropDraft) { dropDraft = false; committedBeforeLoss = (await route.fetch()).status() === 200; await route.abort('connectionreset'); return; }
      }
      await route.continue();
    });
    page.on('pageerror', (error: Error) => errors.push(engine + ':' + phase + ':' + error.message)); page.setDefaultTimeout(20000);
    const responseWaitErrors: string[] = [];
    const response = (op: string) => {
      const pending = page.waitForResponse((r: Response) => r.url().endsWith('/api/owner/advisor/knowledge') && r.request().method() === 'POST' && r.request().postDataJSON().op === op);
      // Keep cleanup rejections owned; a successful scenario still requires none.
      void pending.catch((error: unknown) => responseWaitErrors.push(String(error)));
      return pending;
    };
    const receipt = async (pending: Promise<Response>, state: KnowledgeReceipt['state']) => { const r = await pending; expect(r.status()).toBe(200); const value = await r.json(); expect(value.state).toBe(state); return value; };
    await page.goto(origin + '/login'); await page.getByLabel('Employee ID', { exact: true }).fill('QAOWNER');
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.waitForURL(origin + '/app');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#desktop-primary-navigation').getByRole('link', { name: 'Rondo AI', exact: true }).click();
    await page.waitForURL(origin + '/app/ai-manager'); await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('main').getByRole('link', { name: 'Company knowledge', exact: true }).click();
    await page.waitForURL(origin + '/app/ai-manager/knowledge'); await page.getByRole('link', { name: 'Add document', exact: true }).waitFor();
    if (engine === 'chromium') {
      phase = 'profile draft and exact review'; await page.getByRole('link', { name: /Write your business profile/ }).click();
      await page.getByLabel('What the business does', { exact: true }).fill('Fictional Northside provides scheduled customer support.');
      const savedProfile = response('draft_profile'); await page.getByRole('button', { name: /^Save(?: draft)?$/ }).click();
      const profile = await receipt(savedProfile, 'draft_saved'); await page.locator('.kn-source').getByText(/Fictional Northside/).waitFor();
      expect(await q('SELECT published_version FROM owner_advisor_company_knowledge_entries WHERE id=$1', [profile.documentId])).toEqual([{ published_version: null }]);
      const publishedProfile = response('publish'); await page.getByRole('button', { name: 'Publish for Rondo', exact: true }).click(); await receipt(publishedProfile, 'published');
      await page.goto(origin + '/app/ai-manager/knowledge'); await page.getByRole('link', { name: 'Add document', exact: true }).waitFor();
      checks.push('chromium: profile draft is not published; exact saved text reviewed then explicitly published through the real UI');
    }
    phase = 'document draft with lost reply'; await page.getByRole('link', { name: 'Add document', exact: true }).click();
    const title = 'Fictional procedure ' + engine, body = 'Fictional ORCHID procedure.\n<script>window.__knowledgeExecuted=true</script>\nAsk the Owner before changing customer promises.';
    await page.getByLabel('Title', { exact: true }).fill(title); await page.getByLabel('Text', { exact: true }).fill(body);
    dropDraft = true; await page.getByRole('button', { name: /^Save(?: draft)?$/ }).click();
    await page.getByRole('button', { name: 'Check again', exact: true }).waitFor(); expect(committedBeforeLoss).toBe(true);
    const retried = response('draft_document'); await page.getByRole('button', { name: 'Check again', exact: true }).click();
    const draft = await receipt(retried, 'draft_saved'); expect(draftIds).toHaveLength(2); expect(draftIds[0]).toBe(draftIds[1]);
    expect(await q('SELECT count(*)::int n FROM owner_advisor_company_knowledge_versions WHERE document_id=$1', [draft.documentId])).toEqual([{ n: 1 }]);
    expect(await q('SELECT published_version FROM owner_advisor_company_knowledge_entries WHERE id=$1', [draft.documentId])).toEqual([{ published_version: null }]);
    await page.locator('.kn-source').waitFor(); expect(await page.locator('.kn-source').innerText()).toBe(body);
    expect(await page.evaluate('window.__knowledgeExecuted')).toBeUndefined();
    await page.evaluate(await readFile(runtimeRequire.resolve('axe-core/axe.min.js'), 'utf8'));
    const audit = await page.evaluate("axe.run('.kn',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");
    await writeFile(resolve(evidence, engine + '-390-review-audit.json'), JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
    for (const width of [320,390,1440]) {
      await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: resolve(evidence, `${engine}-${width}-review.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const pendingPublish = response('publish'); await page.getByRole('button', { name: 'Publish for Rondo', exact: true }).click();
    const published = await receipt(pendingPublish, 'published'); expect(published.textDigest).toBe(draft.textDigest);
    await page.getByRole('heading', { name: title, exact: true }).first().waitFor();
    const versionUrl = origin + `/api/owner/advisor/knowledge/entries/${draft.documentId}/versions/${draft.versionId}`;
    const view = await context.newPage(), text = await view.goto(versionUrl); expect(text.status()).toBe(200);
    expect(text.headers()['content-type']).toBe('text/plain; charset=utf-8'); expect(text.headers()['x-content-sha256']).toBe(draft.textDigest);
    expect(await view.locator('body').innerText()).toContain(body); await view.close();
    phase = 'archive and delete'; await page.getByRole('button', { name: /^Archive/ }).click();
    const archive = response('archive'); await page.getByRole('button', { name: 'Archive', exact: true }).click(); await receipt(archive, 'archived');
    const historical = await context.request.get(versionUrl); expect(historical.status()).toBe(200); expect(await historical.text()).toContain('Historical version; not current guidance');
    await page.getByRole('button', { name: /^Delete/ }).click();
    expect(await page.getByRole('button', { name: 'Delete', exact: true }).isDisabled()).toBe(true);
    await page.getByRole('checkbox', { name: 'I understand this can’t be undone', exact: true }).check();
    const deleted = response('delete'); await page.getByRole('button', { name: 'Delete', exact: true }).click(); await receipt(deleted, 'deleted');
    await page.getByRole('link', { name: 'Add document', exact: true }).waitFor(); expect(await page.getByRole('link', { name: new RegExp(title) }).count()).toBe(0);
    const denied = await context.request.get(versionUrl); expect(denied.status()).toBe(403); expect(await denied.text()).not.toContain('ORCHID');
    checks.push(engine + ': actual lost draft reply reuses original request, exact text/digest reviewed and published; literal script; responsive320/390/1440; archive then acknowledged delete retires private version route');
    phase = 'revocation clears edited text'; await page.getByRole('link', { name: 'Add document', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('Private fictional revoked draft'); await page.getByLabel('Text', { exact: true }).fill('Private ORCHID unsaved text');
    await q("DELETE FROM employee_sessions WHERE employee_id='QAOWNER'");
    const forbidden = response('draft_document'); await page.getByRole('button', { name: /^Save(?: draft)?$/ }).click(); expect([401,403]).toContain((await forbidden).status());
    const revoked = page.locator('.kn').getByRole('alert').getByText('Your session ended', { exact: true });
    const signIn = page.locator('#login-employee-id');
    await revoked.or(signIn).first().waitFor();
    if (await signIn.isVisible()) {
      expect(new URL(page.url()).pathname).toBe('/login');
      await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
    } else {
      await revoked.or(signIn).first().waitFor();
    }
    expect(await page.locator('.kn textarea').count()).toBe(0);
    expect(await page.locator('body').innerText()).not.toContain('Private ORCHID unsaved text');
    checks.push(engine + ': revoked real session clears editor and unsaved private text');
    expect(responseWaitErrors).toEqual([]); expect(external).toEqual([]); expect(errors).toEqual([]); completedEngines++;
  } catch (error) { await writeFile(resolve(evidence, engine + '-failure.json'), JSON.stringify({ phase, message: String(error) }, null, 2));
    await page.screenshot({ path: resolve(evidence, engine + '-failed.png'), fullPage: true, timeout: 5000 }).catch(() => {}); throw error;
  } finally { await context.close(); await browser.close(); }
});
