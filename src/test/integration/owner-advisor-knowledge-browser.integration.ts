import { expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createOwnedNextApp } from './owned-next-app';
import { seedOwnedApp, TEST_PASSWORD } from './owned-app-fixture';
it('serves private exact-version text through real authenticated browsers with no model', async () => {
  if (!process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE) throw Error('External evidence path required');
  const evidence = resolve(process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE, 'company-knowledge');
  await mkdir(evidence, { recursive: true });
  const runtime = createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright');
  const app = await createOwnedNextApp(evidence, { ownerAdvisorEnabled: false });
  const checks: string[] = [], external: string[] = [], errors: string[] = [];
  let complete = false;
  try {
    await seedOwnedApp(app.database.executor);
    const origin = app.url.replace('127.0.0.1', 'localhost');
    for (const engine of ['chromium', 'webkit']) {
      const browser = await runtime[engine].launch({ headless: true });
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      const page = await context.newPage(), view = await context.newPage();
      try {
        await context.route('**/*', async (route: { request(): { url(): string }; abort(): Promise<void>; continue(): Promise<void> }) => {
          const url = new URL(route.request().url());
          if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) { external.push(url.origin); await route.abort(); } else await route.continue();
        });
        page.on('pageerror', (error: Error) => errors.push(`${engine}:${error.message}`));
        await page.goto(origin + '/login');
        await page.getByLabel('Employee ID', { exact: true }).fill('QAOWNER');
        await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
        await page.getByRole('button', { name: 'Sign in', exact: true }).click();
        await page.waitForURL(origin + '/app');
        const api = async (value?: unknown) => page.evaluate(async (body?: unknown) => {
          const r = await fetch('/api/owner/advisor/knowledge', { method: body === undefined ? 'GET' : 'POST', headers: { 'x-nevora-company-knowledge': '1', 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
          return { status: r.status, body: await r.json(), cache: r.headers.get('cache-control') };
        }, value);
        const snapshot = await api(); expect(snapshot.status).toBe(200);
        const body = 'Texto ficticio ORCHID.\n<script>window.__knowledgeScriptExecuted=true</script>\nVerify the roster before opening.';
        const draft = await api({ op: 'draft_document', requestId: randomUUID(), expectedRevision: snapshot.body.revision, documentId: null, title: `Fictional procedure ${engine}`, locale: 'es', category: 'operations', body, sourceName: 'procedure.md' });
        expect(draft.status).toBe(200); expect(draft.cache).toBe('no-store, private');
        const href = `/api/owner/advisor/knowledge/entries/${draft.body.documentId}/versions/${draft.body.versionId}`;
        const first = await view.goto(origin + href);
        expect(first.status()).toBe(200); expect(await view.locator('body').innerText()).toContain('Unpublished draft');
        const published = await api({ op: 'publish', requestId: randomUUID(), expectedRevision: draft.body.revision, documentId: draft.body.documentId, versionId: draft.body.versionId, reviewedTextDigest: draft.body.textDigest });
        expect(published.status).toBe(200);
        const actual = await view.goto(origin + href);
        expect(actual.status()).toBe(200);
        expect(actual.headers()['content-type']).toBe('text/plain; charset=utf-8');
        expect(actual.headers()['cache-control']).toBe('no-store, private');
        expect(actual.headers()['x-content-type-options']).toBe('nosniff');
        expect(actual.headers()['x-content-sha256']).toBe(draft.body.textDigest);
        expect(await view.locator('body').innerText()).toContain(body);
        expect(await view.evaluate(() => document.contentType)).toBe('text/plain');
        expect(await view.evaluate('window.__knowledgeScriptExecuted')).toBeUndefined();
        await view.screenshot({ path: resolve(evidence, `${engine}-private-published-text.png`), fullPage: true });
        const archived = await api({ op: 'archive', requestId: randomUUID(), expectedRevision: published.body.revision, documentId: draft.body.documentId });
        expect(archived.status).toBe(200);
        await view.reload(); expect(await view.locator('body').innerText()).toContain('Historical version; not current guidance');
        const deleted = await api({ op: 'delete', requestId: randomUUID(), expectedRevision: archived.body.revision, documentId: draft.body.documentId, acknowledged: true });
        expect(deleted.status).toBe(200);
        const denied = await view.reload(); expect(denied.status()).toBe(403);
        expect(await view.locator('body').innerText()).not.toContain('ORCHID');
        checks.push(`${engine}: actual Next/session/SQL draft→review→publish→private plain-text navigation→archive→delete; script stays literal; mobile390; no model configured`);
      } finally { await context.close(); await browser.close(); }
    }
    expect(external).toEqual([]); expect(errors).toEqual([]); complete = true;
  } finally {
    await app.close();
    await writeFile(resolve(evidence, 'report.json'), JSON.stringify({ complete, checks, external, errors, source: Object.entries(app.sourceHashes).map(([file, sha256]) => ({ file, sha256 })), modelConfigured: false, uiScreensBuilt: false }, null, 2));
  }
});
