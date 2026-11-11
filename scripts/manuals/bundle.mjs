import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lstat, readFile, realpath, stat} from 'node:fs/promises';
import {dirname, isAbsolute, posix, relative, resolve, sep} from 'node:path';
import {PDFDocument} from 'pdf-lib';

export const GUIDE_IDS = Object.freeze(['owner', 'manager-lead', 'employee', 'rondo', 'developer', 'operations']);
export const SOURCE_INDEX = 'docs/guides/web/sources.json';
export const PUBLICATION = 'docs/guides/web/publication';
export const SCOPE = 'Development web source only. Module availability and hosted services require separate acceptance. Native and production deployment are separate.';
const SHA256 = /^[a-f0-9]{64}$/;
export class ManualBundleError extends Error {}
export const manualErrorMessage = error => error instanceof ManualBundleError ? error.message : 'Manual publication operation failed; inspect the selected local inputs/runtime';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
function ensure(condition, message) {if (!condition) throw new ManualBundleError(message);}
function object(value) {return value !== null && typeof value === 'object' && !Array.isArray(value);}
function keys(value, names, label) {
  ensure(object(value) && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name)), `Invalid ${label} fields`);
}
function git(root, args, {buffer = false} = {}) {
  try {return execFileSync('git', args, {cwd: root, encoding: buffer ? undefined : 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});}
  catch {throw new ManualBundleError('Manual source repository operation failed');}
}
export function validDate(value) {
  const parsed = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
  ensure(parsed && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value, 'Invalid publication date; use YYYY-MM-DD');
  return value;
}
function repoRelative(path) {
  ensure(typeof path === 'string' && path.length > 0 && !isAbsolute(path) && !/[\\\u0000-\u001f\u007f]/.test(path) && path.split('/').every(part => part !== '' && part !== '.' && part !== '..'), 'Unsafe repository path');
  return path;
}
function inside(root, target) {
  const remainder = relative(root, target);
  ensure(remainder === '' || (!isAbsolute(remainder) && remainder !== '..' && !remainder.startsWith(`..${sep}`)), 'Path must stay inside the repository');
}
// Check existing ancestors as well as the final file: a missing output directory
// must not hide an escaping parent symlink.
export async function safePath(repoRoot, path, {mustExist = true} = {}) {
  repoRelative(path);
  const root = await realpath(repoRoot);
  const target = resolve(root, path);
  inside(root, target);
  let current = target;
  while (true) {
    let entry;
    try {
      entry = await lstat(current);
      const canonical = await realpath(current);
      inside(root, canonical);
      ensure(canonical === current, 'Repository path may not use symlink aliases');
      break;
    }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      ensure(!entry?.isSymbolicLink(), 'Dangling repository symlink path is not allowed');
      ensure(!mustExist || current !== target, `Missing repository file: ${path}`);
      const parent = dirname(current);
      ensure(parent !== current, 'Invalid repository path');
      current = parent;
    }
  }
  return target;
}
async function fileBytes(root, path) {
  const target = await safePath(root, path);
  ensure((await stat(target)).isFile(), `Expected repository file: ${path}`);
  return readFile(target);
}
function sourceBytes(root, sourceSha, path) {
  repoRelative(path);
  const entry = git(root, ['ls-tree', sourceSha, '--', path]).trim();
  ensure(/^100(?:644|755) blob /.test(entry), `Source file is missing or not a regular committed file: ${path}`);
  return git(root, ['show', `${sourceSha}:${path}`], {buffer: true});
}
async function qualifiedHash(root, sourceSha, path) {
  const bytes = await fileBytes(root, path);
  const hash = sha256(bytes);
  ensure(hash === sha256(sourceBytes(root, sourceSha, path)), `Current file changed from recorded source: ${path}`);
  return {path, sha256: hash};
}
function isApplication(path) {
  return /^(src|db|services|ops|public)\//.test(path) || /(^|\/)(package(?:-lock)?\.json|npm-shrinkwrap\.json)$/.test(path);
}
function sourceApplicationRows(root, sourceSha) {
  return git(root, ['ls-tree', '-r', '-z', sourceSha]).split('\0').filter(Boolean).map(line => {
    const tab = line.indexOf('\t');
    const [mode, kind, oid] = line.slice(0, tab).split(' ');
    return {path: line.slice(tab + 1), mode, kind, oid};
  }).filter(row => isApplication(row.path)).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
function applicationDigest(rows) {
  // Git blob IDs bind bytes (including their length). SHA-256 additionally binds
  // the exact ordered inventory and paths, independent of unrelated doc commits.
  return sha256(rows.map(row => `${row.path}\0${row.oid}\n`).join(''));
}
async function applicationHashes(root, sourceSha) {
  const rows = sourceApplicationRows(root, sourceSha);
  ensure(rows.length > 0 && rows.every(row => row.kind === 'blob' && /^100(?:644|755)$/.test(row.mode)), 'Invalid application source inventory');
  const algorithm = git(root, ['rev-parse', '--show-object-format']).trim();
  ensure(['sha1', 'sha256'].includes(algorithm), 'Unsupported source object format');
  const paths = git(root, ['ls-files', '-z']).split('\0').filter(path => path && isApplication(path)).sort();
  ensure(new Set(paths).size === paths.length, 'Unmerged application inventory');
  const current = [];
  for (const path of paths) {
    let bytes;
    try {bytes = await fileBytes(root, path);} catch {throw new ManualBundleError(`Missing or unsafe application input: ${path}`);}
    const oid = createHash(algorithm).update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    current.push({path, oid});
  }
  return {source: applicationDigest(rows), current: applicationDigest(current)};
}
function cleanApplication(root) {
  const changes = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).split('\0');
  for (let index = 0; index < changes.length; index++) {
    const entry = changes[index];
    if (!entry) continue;
    const path = entry.slice(3);
    const renamed = /[RC]/.test(entry.slice(0, 2));
    const oldPath = renamed ? changes[++index] : '';
    ensure(!isApplication(path) && !isApplication(oldPath), 'Commit application inputs before building manuals');
  }
}
function validateIndex(value) {
  keys(value, ['schemaVersion', 'guides'], 'source index');
  ensure(value.schemaVersion === 1 && Array.isArray(value.guides) && value.guides.length === GUIDE_IDS.length, 'Source index requires exactly six guides');
  const ids = new Set();
  const paths = new Set();
  for (const guide of value.guides) {
    keys(guide, ['id', 'title', 'markdown', 'evidence'], 'guide');
    ensure(GUIDE_IDS.includes(guide.id) && !ids.has(guide.id), 'Six unique known guide IDs required'); ids.add(guide.id);
    ensure(typeof guide.title === 'string' && guide.title.trim().length > 0 && guide.title.length <= 200 && !/[\u0000-\u001f\u007f]/.test(guide.title), 'Invalid guide title');
    repoRelative(guide.markdown);
    ensure(guide.markdown.startsWith('docs/guides/web/') && guide.markdown.endsWith('.md') && !paths.has(guide.markdown), 'Invalid or duplicate guide Markdown path'); paths.add(guide.markdown);
    ensure(Array.isArray(guide.evidence) && guide.evidence.length > 0 && new Set(guide.evidence).size === guide.evidence.length, 'Each guide requires unique evidence paths');
    for (const path of guide.evidence) repoRelative(path);
  }
  return value;
}
async function readIndex(root, sourceSha) {
  const sourceIndex = await qualifiedHash(root, sourceSha, SOURCE_INDEX);
  let index;
  try {index = JSON.parse((await fileBytes(root, SOURCE_INDEX)).toString('utf8'));} catch {throw new ManualBundleError('Invalid guide source index JSON');}
  return {index: validateIndex(index), sourceIndex};
}
async function qualifiedGuide(root, sourceSha, guide) {
  const markdown = await qualifiedHash(root, sourceSha, guide.markdown);
  const content = (await fileBytes(root, guide.markdown)).toString('utf8');
  ensure(content.trim().length > 0, `Empty guide: ${guide.id}`);
  // Rendering first excludes fenced/inline examples and escaped HTML from link
  // interpretation. Local references are source-qualified without fetching URLs.
  for (const match of renderMarkdown(content).matchAll(/<a href="([^"]*)"/g)) {
    const href = match[1].replace(/&(?:amp|quot|lt|gt|#39);/g, entity => ({'&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>', '&#39;': "'"}[entity]));
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
    const path = href.split(/[?#]/)[0];
    if (!path) continue;
    let decoded;
    try {decoded = decodeURIComponent(path);} catch {throw new ManualBundleError('Invalid local source link path');}
    const target = decoded.startsWith('/') ? decoded.slice(1) : posix.join(posix.dirname(guide.markdown), decoded);
    await qualifiedHash(root, sourceSha, target);
  }
  const evidence = [];
  for (const path of guide.evidence) evidence.push(await qualifiedHash(root, sourceSha, path));
  return {id: guide.id, title: guide.title, markdown, evidence};
}
export async function collectBundleInputs({repoRoot, date, requireCleanApplication = false}) {
  validDate(date);
  const root = await realpath(repoRoot);
  const sourceSha = git(root, ['rev-parse', 'HEAD']).trim();
  if (requireCleanApplication) cleanApplication(root);
  const application = await applicationHashes(root, sourceSha);
  ensure(application.current === application.source, 'Current application content does not match committed source');
  const {index, sourceIndex} = await readIndex(root, sourceSha);
  const guides = [];
  for (const guide of index.guides) guides.push(await qualifiedGuide(root, sourceSha, guide));
  return {schemaVersion: 1, date, scope: SCOPE, sourceSha, applicationHash: application.source, sourceIndex, guides};
}
export function pdfSubject({id, sourceSha, applicationHash, markdownHash, date}) {
  return `NEVORA_WEB_GUIDE_V1|id=${id}|source=${sourceSha}|application=${applicationHash}|markdown=${markdownHash}|date=${date}`;
}
function validateFileHash(value, label) {
  keys(value, ['path', 'sha256'], label);
  repoRelative(value.path); ensure(SHA256.test(value.sha256), `Invalid ${label} hash`);
}
export async function verifyBundle({repoRoot, publicationDir = PUBLICATION}) {
  const root = await realpath(repoRoot);
  await safePath(root, publicationDir);
  let manifest;
  try {manifest = JSON.parse((await fileBytes(root, `${publicationDir}/manifest.json`)).toString('utf8'));} catch {throw new ManualBundleError('Missing or invalid manual publication manifest');}
  keys(manifest, ['schemaVersion', 'date', 'scope', 'sourceSha', 'applicationHash', 'sourceIndex', 'guides'], 'publication manifest');
  ensure(manifest.schemaVersion === 1 && manifest.scope === SCOPE, 'Invalid manual publication scope/version');
  validDate(manifest.date);
  ensure(typeof manifest.sourceSha === 'string' && /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(manifest.sourceSha), 'Invalid full source SHA');
  try {git(root, ['merge-base', '--is-ancestor', manifest.sourceSha, 'HEAD']);} catch {throw new ManualBundleError('Publication source must be an ancestor of current HEAD');}
  ensure(SHA256.test(manifest.applicationHash), 'Invalid application hash');
  const application = await applicationHashes(root, manifest.sourceSha);
  ensure(application.source === manifest.applicationHash && application.current === manifest.applicationHash, 'Stale or foreign application content hash');
  validateFileHash(manifest.sourceIndex, 'source index');
  ensure(manifest.sourceIndex.path === SOURCE_INDEX, 'Unexpected source index path');
  const {index, sourceIndex} = await readIndex(root, manifest.sourceSha);
  ensure(sourceIndex.sha256 === manifest.sourceIndex.sha256, 'Stale source index hash');
  ensure(Array.isArray(manifest.guides) && manifest.guides.length === GUIDE_IDS.length, 'Publication requires exactly six guides');
  const ids = new Set();
  for (const guide of manifest.guides) {
    keys(guide, ['id', 'title', 'markdown', 'evidence', 'pdf'], 'published guide');
    ensure(GUIDE_IDS.includes(guide.id) && !ids.has(guide.id), 'Publication requires six unique guide IDs'); ids.add(guide.id);
    const declared = index.guides.find(row => row.id === guide.id);
    validateFileHash(guide.markdown, 'guide Markdown');
    ensure(declared.title === guide.title && declared.markdown === guide.markdown.path, 'Published guide does not match source index');
    ensure(Array.isArray(guide.evidence) && guide.evidence.length === declared.evidence.length, 'Published guide evidence does not match source index');
    for (let index = 0; index < guide.evidence.length; index++) {
      validateFileHash(guide.evidence[index], 'guide evidence');
      ensure(guide.evidence[index].path === declared.evidence[index], 'Published guide evidence path differs from source');
    }
    const qualified = await qualifiedGuide(root, manifest.sourceSha, declared);
    ensure(qualified.markdown.sha256 === guide.markdown.sha256 && qualified.evidence.every((row, index) => row.sha256 === guide.evidence[index].sha256), 'Stale guide Markdown/evidence hash');
    keys(guide.pdf, ['path', 'sha256', 'pageCount'], 'PDF');
    repoRelative(guide.pdf.path);
    ensure(guide.pdf.path === `${publicationDir}/${guide.id}.pdf`, 'Unexpected PDF publication path');
    ensure(SHA256.test(guide.pdf.sha256) && Number.isSafeInteger(guide.pdf.pageCount) && guide.pdf.pageCount > 0, 'Invalid PDF hash/page count');
    const bytes = await fileBytes(root, guide.pdf.path);
    ensure(sha256(bytes) === guide.pdf.sha256, 'Changed PDF file hash');
    let pdf;
    try {pdf = await PDFDocument.load(bytes, {updateMetadata: false});} catch {throw new ManualBundleError('PDF failed structural load');}
    ensure(pdf.getPageCount() === guide.pdf.pageCount && pdf.getPageCount() > 0, 'PDF page count mismatch');
    ensure(pdf.getTitle() === guide.title && pdf.getSubject() === pdfSubject({...manifest, id: guide.id, markdownHash: guide.markdown.sha256}), 'PDF metadata does not match source binding');
    ensure(pdf.getPages().every(page => Math.abs(page.getWidth() - 595.28) < 1 && Math.abs(page.getHeight() - 841.89) < 1), 'PDF page is not A4');
  }
  return manifest;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
}
function safeLink(value) {
  if (!value || /[\s\\\u0000-\u001f\u007f]/.test(value) || value.startsWith('//')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    try {
      const url = new URL(value);
      if (!['https:', 'http:', 'mailto:'].includes(url.protocol) || url.username || url.password) return null;
    } catch {return null;}
  }
  return value;
}
function inline(markdown, depth = 0, linkBase) {
  if (depth > 12) return escapeHtml(markdown);
  let result = '';
  for (let index = 0; index < markdown.length;) {
    const tail = markdown.slice(index);
    const code = /^(`+)([\s\S]*?)\1(?!`)/.exec(tail);
    if (code) {result += `<code>${escapeHtml(code[2])}</code>`; index += code[0].length; continue;}
    const link = /^\[([^\]\n]+)\]\(([^\n)]*)\)/.exec(tail);
    if (link) {
      const safeHref = safeLink(link[2]);
      const href = safeHref && linkBase ? new URL(safeHref.startsWith('/') ? safeHref.slice(1) : safeHref, safeHref.startsWith('/') ? linkBase.root : linkBase.document).href : safeHref;
      result += href ? `<a href="${escapeHtml(href)}" rel="noreferrer">${inline(link[1], depth + 1, linkBase)}</a>` : inline(link[1], depth + 1, linkBase);
      index += link[0].length; continue;
    }
    const strong = /^(\*\*|__)(?=\S)([\s\S]*?\S)\1/.exec(tail);
    if (strong) {result += `<strong>${inline(strong[2], depth + 1, linkBase)}</strong>`; index += strong[0].length; continue;}
    const emphasis = /^(\*|_)(?=\S)([^\n]*?\S)\1/.exec(tail);
    if (emphasis) {result += `<em>${inline(emphasis[2], depth + 1, linkBase)}</em>`; index += emphasis[0].length; continue;}
    if (tail[0] === '\\' && tail.length > 1 && /[\\`*_[\]{}()#+.!|>-]/.test(tail[1])) {result += escapeHtml(tail[1]); index += 2; continue;}
    result += escapeHtml(markdown[index++]);
  }
  return result;
}
const listItem = line => /^\s{0,3}([-+*]|\d+\.)\s+(.+)$/.exec(line);
const tableDivider = line => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
function cells(line) {return line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(value => value.trim());}
export function renderMarkdown(markdown, linkBase) {
  ensure(typeof markdown === 'string' && markdown.trim().length > 0, 'Empty guide Markdown');
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const output = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) {index++; continue;}
    const fence = /^\s{0,3}(`{3,}|~{3,})[^\n]*$/.exec(line);
    if (fence) {
      const code = []; index++;
      while (index < lines.length && !(new RegExp(`^\\s{0,3}${fence[1][0]}{${fence[1].length},}\\s*$`)).test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index++;
      output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); continue;
    }
    const heading = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/.exec(line);
    if (heading) {output.push(`<h${heading[1].length}>${inline(heading[2], 0, linkBase)}</h${heading[1].length}>`); index++; continue;}
    if (index + 1 < lines.length && line.includes('|') && tableDivider(lines[index + 1])) {
      const headings = cells(line); index += 2; const rows = [];
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) rows.push(cells(lines[index++]));
      output.push(`<table><thead><tr>${headings.map(cell => `<th>${inline(cell, 0, linkBase)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${headings.map((_, column) => `<td>${inline(row[column] ?? '', 0, linkBase)}</td>`).join('')}</tr>`).join('')}</tbody></table>`); continue;
    }
    const item = listItem(line);
    if (item) {
      const ordered = /^\d/.test(item[1]); const tag = ordered ? 'ol' : 'ul'; const items = [];
      while (index < lines.length) {
        const next = listItem(lines[index]);
        if (!next || /^\d/.test(next[1]) !== ordered) break;
        const parts = [next[2]]; index++;
        while (index < lines.length && /^\s{2,}\S/.test(lines[index]) && !listItem(lines[index])) parts.push(lines[index++].trim());
        items.push(`<li>${inline(parts.join(' '), 0, linkBase)}</li>`);
      }
      output.push(`<${tag}>${items.join('')}</${tag}>`); continue;
    }
    if (/^\s*>/.test(line)) {
      const parts = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) parts.push(lines[index++].replace(/^\s*>\s?/, ''));
      output.push(`<blockquote>${inline(parts.join(' '), 0, linkBase)}</blockquote>`); continue;
    }
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {output.push('<hr>'); index++; continue;}
    const paragraph = [line.trim()]; index++;
    while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s|^\s{0,3}(`{3,}|~{3,})|^\s*>/.test(lines[index]) && !listItem(lines[index]) && !(lines[index].includes('|') && tableDivider(lines[index + 1] ?? ''))) paragraph.push(lines[index++].trim());
    output.push(`<p>${inline(paragraph.join(' '), 0, linkBase)}</p>`);
  }
  return output.join('\n');
}

export function renderGuideHtml({guide, markdown, date, sourceSha, applicationHash, assets}) {
  ensure(/^[a-f0-9]{40}$/.test(sourceSha), 'Invalid manual source SHA');
  const path = repoRelative(guide.markdown.path);
  const sourceRoot = `https://github.com/JoseK0514/NEVORA/blob/${sourceSha}/`;
  const linkBase = {root: sourceRoot, document: sourceRoot + path.split('/').map(encodeURIComponent).join('/')};
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'; script-src 'none'"><title>${escapeHtml(guide.title)}</title><style>
@font-face{font-family:Inter;src:url(data:font/ttf;base64,${assets.inter});font-weight:100 900}
@font-face{font-family:JetBrains;src:url(data:font/ttf;base64,${assets.mono});font-weight:100 900}
@page{size:A4;margin:17mm 17mm 20mm}*{box-sizing:border-box}html{print-color-adjust:exact;-webkit-print-color-adjust:exact}body{margin:0;color:#161C1B;background:white;font:10.5pt/1.48 Inter,sans-serif}header{border-bottom:1px solid #E3DFD8;padding:0 0 12pt;margin-bottom:16pt}header img{display:block;width:104px;height:auto}header p{color:#5F625E;font-size:8.5pt;margin:9pt 0 0}.qualification{background:#F7F6F3;border-left:3px solid #0B6E69;padding:10pt 12pt;margin:0 0 20pt;font-size:8.5pt;break-inside:avoid}.qualification p{margin:3pt 0}.source{font-family:JetBrains,monospace;font-size:7.4pt;overflow-wrap:anywhere}h1,h2,h3,h4,h5,h6{line-height:1.2;break-after:avoid;overflow-wrap:anywhere}h1{font-size:25pt;font-weight:600;letter-spacing:-.025em;margin:0 0 15pt}h2{font-size:15.5pt;font-weight:600;margin:20pt 0 8pt;padding-top:3pt}h3{font-size:12pt;margin:17pt 0 7pt}p{margin:0 0 8pt;orphans:3;widows:3}li{margin:0 0 6pt;orphans:3;widows:3}ul,ol{padding-left:19pt;margin:0 0 12pt}a{color:#0B6E69;text-decoration:underline;overflow-wrap:anywhere}strong{font-weight:650}code{font-family:JetBrains,monospace;font-size:.83em;overflow-wrap:anywhere;background:#F7F6F3}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#F7F6F3;border:1px solid #E3DFD8;padding:10pt;margin:12pt 0;font-size:9pt;line-height:1.5}pre code{background:none}table{border-collapse:collapse;width:100%;table-layout:fixed;margin:12pt 0 17pt;font-size:9.2pt;line-height:1.45}thead{display:table-header-group}tr{break-inside:avoid}th,td{text-align:left;vertical-align:top;padding:8pt;border-bottom:1px solid #E3DFD8;overflow-wrap:anywhere}th{background:#F7F6F3;font-weight:650}blockquote{border-left:2px solid #0B6E69;margin:12pt 0;padding:6pt 12pt;color:#5F625E}hr{border:0;border-top:1px solid #E3DFD8;margin:18pt 0}
</style></head><body><header><img width="104" height="24" alt="NEVORA" src="data:image/png;base64,${assets.wordmark}"><p>Web guide · source-qualified distribution</p></header><section class="qualification"><p><strong>Prepared ${escapeHtml(date)} · ${escapeHtml(guide.id)}</strong></p><p>${escapeHtml(SCOPE)}</p><p class="source">Source ${escapeHtml(sourceSha)}</p><p class="source">Application ${escapeHtml(applicationHash)}</p></section><main>${renderMarkdown(markdown, linkBase)}</main></body></html>`;
}
