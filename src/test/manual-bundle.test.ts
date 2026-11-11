import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, readFile, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {PDFDocument} from 'pdf-lib';

const {collectBundleInputs, pdfSubject, renderGuideHtml, renderMarkdown, safePath, verifyBundle} = await import(resolve('scripts/manuals/bundle.mjs'));
const ids = ['owner', 'manager-lead', 'employee', 'rondo', 'developer', 'operations'];
const date = '2026-11-11';
const publication = 'docs/guides/web/publication';
const runtimeInputs = ['next.config.ts', 'next-env.d.ts', 'tsconfig.json', 'vercel.json', 'postcss.config.mjs', 'scripts/operations-case-readiness.mts', 'functions/fixture.ts'];
const sha256 = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
type FileHash = {path: string; sha256: string};
type Guide = {id: string; title: string; markdown: FileHash; evidence: FileHash[]; pdf: FileHash & {pageCount: number}};
type Manifest = {schemaVersion: number; date: string; scope: string; sourceSha: string; applicationHash: string; sourceIndex: FileHash; guides: Guide[]};
let root: string;
let manifest: Manifest;
function git(...args: string[]) {
  return execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
}
async function put(path: string, content: string | Uint8Array) {
  await mkdir(dirname(join(root, path)), {recursive: true});
  await writeFile(join(root, path), content);
}
async function saveManifest() {
  await put(`${publication}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
}
async function rewritePdf(index: number, title?: string, subject?: string, empty = false) {
  const guide = manifest.guides[index];
  const pdf = await PDFDocument.create();
  pdf.setTitle(title ?? guide.title);
  pdf.setSubject(subject ?? pdfSubject({...guide, ...manifest, markdownHash: guide.markdown.sha256}));
  // pdf-lib adds a blank page on save unless explicitly disabled.
  if (!empty) pdf.addPage([595.28, 841.89]).drawText(`Fictional ${guide.id} guide`);
  const bytes = await pdf.save({addDefaultPage: false});
  await put(guide.pdf.path, bytes);
  guide.pdf.sha256 = sha256(bytes);
  guide.pdf.pageCount = empty ? 0 : 1;
  await saveManifest();
}
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'nevora-manual-owned-'));
  git('init', '-b', 'development');
  git('config', 'user.name', 'Fictional manual test');
  git('config', 'user.email', 'manual-test@example.invalid');
  await put('src/app.ts', 'export const fictional = true;\n');
  await put('db/schema.sql', '-- fictional schema\n');
  await put('services/worker.ts', '// fictional worker\n');
  await put('ops/runbook.md', '# Fictional operations\n');
  await put('public/font.ttf', 'fictional asset bytes');
  for (const path of runtimeInputs) await put(path, 'fictional runtime input\n');
  await put('package.json', '{"private":true}\n');
  await put('package-lock.json', '{"lockfileVersion":3}\n');
  await put('docs/evidence.md', '# Fictional source evidence\n');
  for (const id of ids) await put(`docs/guides/web/${id}.md`, `# ${id} guide\n\nFictional local guide.\n`);
  await put('docs/guides/web/sources.json', JSON.stringify({schemaVersion: 1, guides: ids.map(id => ({id, title: `${id} guide`, markdown: `docs/guides/web/${id}.md`, evidence: ['src/app.ts', 'docs/evidence.md']}))}));
  git('add', '.'); git('commit', '-m', 'Fictional committed source');
  const inputs = await collectBundleInputs({repoRoot: root, date, requireCleanApplication: true});
  manifest = {...inputs, guides: inputs.guides.map((guide: Guide) => ({...guide, pdf: {path: `${publication}/${guide.id}.pdf`, sha256: '', pageCount: 1}}))};
  for (let index = 0; index < ids.length; index++) await rewritePdf(index);
});
afterEach(async () => {if (root) await rm(root, {recursive: true, force: true});});

describe('manual Markdown boundary', () => {
  it('escapes HTML, attributes and fenced/inline code instead of executing source', () => {
    const html = renderMarkdown('# <img src=x onerror=alert(1)>\n\n<script>alert(2)</script>\n\n`<b>&"</b>`\n\n```html\n<iframe src="https://example.invalid">\n```');
    expect(html).not.toMatch(/<(img|script|iframe|b)\b/);
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<code>&lt;b&gt;&amp;&quot;&lt;/b&gt;</code>');
    expect(html).toContain('&lt;iframe');
  });
  it.each(['javascript:alert%281%29', 'JaVaScRiPt:alert(1)', 'data:text/html,test', 'file:///etc/passwd', '//example.invalid/x', 'java\u0000script:alert(1)', 'https://user:password@example.invalid/'])('does not make an unsafe destination clickable: %s', destination => {
    expect(renderMarkdown(`[unsafe](${destination})`)).not.toContain('<a ');
  });
  it('makes PDF repository references clickable at the exact documented source', () => {
    const html = renderGuideHtml({guide: {id: 'owner', title: 'Owner', markdown: {path: 'docs/guides/web/owner.md'}}, markdown: '[Operations](operations.md) and [Runbook](../../runbooks/workforce-operations.md) and [Root](/src/app.ts) and [Support](mailto:support@example.invalid)', date, sourceSha: 'a'.repeat(40), applicationHash: 'b'.repeat(64), assets: {inter: '', mono: '', wordmark: ''}});
    expect(html).toContain('href="https://github.com/JoseK0514/NEVORA/blob/' + 'a'.repeat(40) + '/docs/guides/web/operations.md"');
    expect(html).toContain('href="https://github.com/JoseK0514/NEVORA/blob/' + 'a'.repeat(40) + '/docs/runbooks/workforce-operations.md"');
    expect(html).toContain('href="https://github.com/JoseK0514/NEVORA/blob/' + 'a'.repeat(40) + '/src/app.ts"');
    expect(html).toContain('href="mailto:support@example.invalid"');
  });
  it('renders headings, multiline lists, tables and safe links without interpreting raw HTML', () => {
    const html = renderMarkdown('# Guide\n\n1. First **step**\n   continuation\n2. Second `step`\n\n| Area | Action |\n| --- | --- |\n| Owner | [Help](https://example.invalid/help?a=1&b=2) |');
    expect(html).toContain('<h1'); expect(html).toContain('<ol>');
    expect(html).toContain('<strong>step</strong>'); expect(html).toContain('continuation');
    expect(html).toContain('<table>'); expect(html).toContain('https://example.invalid/help?a=1&amp;b=2');
  });
});

describe('source-bound guide publication', () => {
  it('loads six structurally valid PDFs without importing a browser and accepts a later documentation-only commit', async () => {
    expect((await verifyBundle({repoRoot: root})).guides).toHaveLength(6);
    await put('docs/later-note.md', '# Later documentation only\n'); git('add', 'docs/later-note.md'); git('commit', '-m', 'Later documentation');
    expect((await verifyBundle({repoRoot: root})).sourceSha).toBe(manifest.sourceSha);
    const check = spawnSync(process.execPath, [resolve('scripts/manuals/check-manuals.mjs'), '--repo', root], {encoding: 'utf8', env: {...process.env, NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE: '/fictional/missing-browser/package.json'}});
    expect(check.status, check.stderr).toBe(0);
  });
  it('can import the build entry point without loading an optional browser runtime', () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', `await import(${JSON.stringify(resolve('scripts/manuals/build-manuals.mjs'))})`], {encoding: 'utf8', env: {...process.env, NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE: '/fictional/missing-browser/package.json'}});
    expect(result.status, result.stderr).toBe(0);
  });
  it.each(['../../../outside.md', '../../../../outside.md'])('rejects a missing or escaping local source link: %s', async destination => {
    await put('docs/guides/web/owner.md', `# Owner\n\n[Reference](${destination})\n`);
    git('add', 'docs/guides/web/owner.md'); git('commit', '-m', 'Broken guide reference');
    await expect(collectBundleInputs({repoRoot: root, date, requireCleanApplication: true})).rejects.toThrow(/link|path|source|file|repository/i);
  });
  it('rejects changed local link targets after source publication', async () => {
    await put('docs/guides/web/owner.md', '# Owner\n\n[Reference](../../evidence.md)\n');
    git('add', 'docs/guides/web/owner.md'); git('commit', '-m', 'Qualified local reference');
    await expect(collectBundleInputs({repoRoot: root, date, requireCleanApplication: true})).resolves.toBeDefined();
    await put('docs/evidence.md', '# Changed linked reference\n');
    await expect(collectBundleInputs({repoRoot: root, date, requireCleanApplication: true})).rejects.toThrow(/changed|source|hash/i);
  });
  it.each(['src/app.ts', 'db/schema.sql', 'services/worker.ts', 'ops/runbook.md', 'public/font.ttf', 'package.json', 'package-lock.json'])('rejects current application drift in %s', async path => {
    await put(path, 'changed application input\n');
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/application/i);
    await expect(collectBundleInputs({repoRoot: root, date, requireCleanApplication: true})).rejects.toThrow(/application/i);
  });
  it('refuses untracked application inputs during actual build preparation', async () => {
    await put('src/uncommitted.ts', '// unpublished application input\n');
    await expect(collectBundleInputs({repoRoot: root, date, requireCleanApplication: true})).rejects.toThrow(/application/i);
  });
  it('rejects committed application drift while preserving the original source ancestry', async () => {
    await put('src/app.ts', '// new revision\n'); git('add', 'src/app.ts'); git('commit', '-m', 'Changed application');
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/application/i);
  });
  it.each(['docs/guides/web/owner.md', 'docs/evidence.md'])('rejects stale current input bytes even if a manifest hash is relabelled: %s', async path => {
    await put(path, '# Changed input\n');
    const hash = sha256(await readFile(join(root, path)));
    for (const guide of manifest.guides) {
      if (guide.markdown.path === path) guide.markdown.sha256 = hash;
      for (const evidence of guide.evidence) if (evidence.path === path) evidence.sha256 = hash;
    }
    await saveManifest();
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/source|changed|stale|hash/i);
  });
  it('rejects missing and duplicate guides', async () => {
    manifest.guides.pop(); await saveManifest();
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/six|guide/i);
    manifest.guides.push(manifest.guides[0]); await saveManifest();
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/unique|guide/i);
  });
  it('rejects a missing guide file and an empty committed guide', async () => {
    await rm(join(root, manifest.guides[0].markdown.path));
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/missing|file|ENOENT/i);
    await put(manifest.guides[0].markdown.path, ' \n'); git('add', manifest.guides[0].markdown.path); git('commit', '-m', 'Empty guide');
    await expect(collectBundleInputs({repoRoot: root, date, requireCleanApplication: true})).rejects.toThrow(/empty/i);
  });
  it('rejects a missing evidence file', async () => {
    await rm(join(root, 'docs/evidence.md'));
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/missing|file|ENOENT/i);
  });
  it('rejects a changed source index', async () => {
    await put('docs/guides/web/sources.json', '{"schemaVersion":1,"guides":[]}');
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/index|source|six/i);
  });
  it('rejects PDF modification, including a structurally valid changed PDF', async () => {
    await put(manifest.guides[0].pdf.path, 'not a PDF');
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/PDF|hash/i);
    const pdf = await PDFDocument.create(); pdf.addPage();
    await put(manifest.guides[0].pdf.path, await pdf.save());
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/PDF|hash/i);
  });
  it.each(['title', 'subject', 'pageCount', 'empty'])('rejects relabelled PDF %s even with an updated file hash', async kind => {
    if (kind === 'title') await rewritePdf(0, 'Foreign title');
    if (kind === 'subject') await rewritePdf(0, undefined, 'Foreign source metadata');
    if (kind === 'empty') await rewritePdf(0, undefined, undefined, true);
    if (kind === 'pageCount') {manifest.guides[0].pdf.pageCount = 12; await saveManifest();}
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/PDF|page|metadata/i);
  });
  it('rejects corrupt PDF bytes even with a relabelled manifest hash', async () => {
    const bytes = Buffer.from('not a PDF'); await put(manifest.guides[0].pdf.path, bytes);
    manifest.guides[0].pdf.sha256 = sha256(bytes); await saveManifest();
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/PDF/i);
  });
  it.each(['../outside.pdf', '/tmp/outside.pdf', 'docs/guides/web/publication/../owner.pdf', 'docs\\owner.pdf'])('rejects traversal and foreign output paths: %s', async path => {
    manifest.guides[0].pdf.path = path; await saveManifest();
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/path|publication|inside/i);
  });
  it('rejects a symlink publication directory that escapes the repository', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'nevora-manual-outside-'));
    try {
      await rm(join(root, publication), {recursive: true});
      await symlink(outside, join(root, publication));
      await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/path|inside|repository/i);
    } finally {await rm(outside, {recursive: true, force: true});}
  });
  it('rejects a dangling publication symlink before any output write', async () => {
    await rm(join(root, manifest.guides[0].pdf.path));
    await symlink(join(tmpdir(), 'fictional-nevora-outside-missing.pdf'), join(root, manifest.guides[0].pdf.path));
    await expect(safePath(root, manifest.guides[0].pdf.path, {mustExist: false})).rejects.toThrow(/path|symlink|repository/i);
  });
  it('rejects a publication alias to a different file inside the repository', async () => {
    await rm(join(root, manifest.guides[0].pdf.path));
    await symlink(join(root, 'src/app.ts'), join(root, manifest.guides[0].pdf.path));
    await expect(safePath(root, manifest.guides[0].pdf.path, {mustExist: false})).rejects.toThrow(/path|symlink|repository/i);
    expect(await readFile(join(root, 'src/app.ts'), 'utf8')).toBe('export const fictional = true;\n');
  });
  it('rejects a foreign source commit that exists but is not an ancestor', async () => {
    git('checkout', '--orphan', 'foreign-fixture'); git('commit', '-m', 'Foreign root');
    const foreign = git('rev-parse', 'HEAD'); git('checkout', 'development');
    manifest.sourceSha = foreign; await saveManifest();
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/ancestor|source/i);
  });
  it.each(runtimeInputs)('rejects dirty and committed runtime/configuration drift: %s', async path => {
    await put(path, 'changed fictional runtime input\n');
    await expect(collectBundleInputs({repoRoot: root, date, requireCleanApplication: true})).rejects.toThrow(/Commit application inputs/);
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/application/i);
    git('add', path); git('commit', '-m', 'Fictional runtime change');
    const next = await collectBundleInputs({repoRoot: root, date, requireCleanApplication: true});
    expect(next.applicationHash).not.toBe(manifest.applicationHash);
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/application/i);
  });
  it('rejects invalid publication dates and an altered application hash', async () => {
    await expect(collectBundleInputs({repoRoot: root, date: '2026-02-30', requireCleanApplication: true})).rejects.toThrow(/date/i);
    manifest.applicationHash = '0'.repeat(64); await saveManifest();
    await expect(verifyBundle({repoRoot: root})).rejects.toThrow(/application/i);
  });
  it('rejects an unparseable publication date with the bounded date diagnostic', async () => {
    await expect(collectBundleInputs({repoRoot: root, date: '2026-99-99', requireCleanApplication: true})).rejects.toThrow(/publication date/i);
  });
});
