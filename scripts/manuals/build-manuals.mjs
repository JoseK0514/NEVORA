import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname, isAbsolute, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {PDFDocument} from 'pdf-lib';
import {collectBundleInputs, escapeHtml, ManualBundleError, manualErrorMessage, pdfSubject, PUBLICATION, renderGuideHtml, safePath, sha256, verifyBundle} from './bundle.mjs';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export async function buildManuals({repoRoot = defaultRoot, date, publicationDir = PUBLICATION} = {}) {
  const inputs = await collectBundleInputs({repoRoot, date, requireCleanApplication: true});
  const output = await safePath(repoRoot, publicationDir, {mustExist: false});
  const assets = {};
  for (const [key, path] of Object.entries({inter: 'public/fonts/typeface/inter/variable.ttf', mono: 'public/fonts/typeface/jetbrains-mono/variable.ttf', wordmark: 'public/images/nevora-wordmark.png'})) assets[key] = (await readFile(await safePath(repoRoot, path))).toString('base64');
  // Browser loading belongs only to the build path. check-manuals imports neither
  // Playwright nor an optional local runtime, so npm-ci verification needs no browser.
  const selectedRuntime = process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE?.trim();
  if (selectedRuntime && !isAbsolute(selectedRuntime)) throw new ManualBundleError('Browser runtime package must be an absolute path');
  const runtime = createRequire(selectedRuntime || join(repoRoot, 'tools/ci-browser-runtime/package.json'));
  const expectedVersion = JSON.parse(await readFile(await safePath(repoRoot, 'tools/ci-browser-runtime/package.json'), 'utf8')).dependencies.playwright;
  if (runtime('playwright/package.json').version !== expectedVersion) throw new ManualBundleError('Selected browser runtime does not match the pinned Playwright version');
  const {chromium} = runtime('playwright');
  const browser = await chromium.launch({headless: true});
  const generated = [];
  try {
    const context = await browser.newContext({offline: true, javaScriptEnabled: false});
    await context.route('**/*', route => route.abort());
    for (const guide of inputs.guides) {
      const page = await context.newPage();
      try {
        const markdown = await readFile(await safePath(repoRoot, guide.markdown.path), 'utf8');
        await page.setContent(renderGuideHtml({...inputs, guide, markdown, assets}), {waitUntil: 'load'});
        await page.evaluate(() => document.fonts.ready);
        const bytes = await page.pdf({format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: `<div style="width:100%;margin:0 17mm;color:#5F625E;font:8px Arial,sans-serif;display:flex;justify-content:space-between;gap:12px"><span>NEVORA · ${escapeHtml(guide.id)} · Development web source · ${escapeHtml(date)} · ${inputs.sourceSha.slice(0, 12)}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`});
        const pdf = await PDFDocument.load(bytes);
        pdf.setTitle(guide.title);
        pdf.setSubject(pdfSubject({...inputs, id: guide.id, markdownHash: guide.markdown.sha256}));
        pdf.setAuthor('NEVORA'); pdf.setCreator('NEVORA source-qualified web guide builder');
        pdf.setCreationDate(new Date(`${date}T00:00:00Z`)); pdf.setModificationDate(new Date(`${date}T00:00:00Z`));
        const finalBytes = await pdf.save();
        generated.push({bytes: finalBytes, guide: {...guide, pdf: {path: `${publicationDir}/${guide.id}.pdf`, sha256: sha256(finalBytes), pageCount: pdf.getPageCount()}}});
      } finally {await page.close();}
    }
  } finally {await browser.close();}
  const finalInputs = await collectBundleInputs({repoRoot, date, requireCleanApplication: true});
  if (JSON.stringify(inputs) !== JSON.stringify(finalInputs)) throw new ManualBundleError('Source inputs changed during manual generation; rebuild from the frozen source');
  await mkdir(output, {recursive: true});
  for (const {bytes, guide} of generated) await writeFile(await safePath(repoRoot, guide.pdf.path, {mustExist: false}), bytes);
  const manifest = {...inputs, guides: generated.map(row => row.guide)};
  await writeFile(await safePath(repoRoot, `${publicationDir}/manifest.json`, {mustExist: false}), `${JSON.stringify(manifest, null, 2)}\n`);
  return verifyBundle({repoRoot, publicationDir});
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--date') {
    console.error('Usage: node scripts/manuals/build-manuals.mjs --date YYYY-MM-DD'); process.exitCode = 1;
  } else {
    try {
      const manifest = await buildManuals({date: args[1]});
      console.log(`Built ${manifest.guides.length} source-qualified web guides from ${manifest.sourceSha}; application ${manifest.applicationHash}`);
    } catch (error) {console.error(`Manual build failed: ${manualErrorMessage(error)}`); process.exitCode = 1;}
  }
}
