// UI audit report (tools/ui-audit): report.json, summary.md, pixel diffs and the self-test table from <out>/views.jsonl.
// writeReport returns the exit code: 1 when a fail-severity finding remains (or, with --selftest, when a rule misses
// its injected defect), else 0.
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {createRequire} from 'node:module';
import {INJECTIONS} from './selftest/injections.mjs';

const require = createRequire(import.meta.url);
const RANK = {fail: 0, warn: 1, info: 2};

export async function writeReport(out, options = {}) {
  const viewsFile = join(out, 'views.jsonl');
  if (!existsSync(viewsFile)) { console.error('ui-audit: no views.jsonl in ' + out); return 2; }
  const views = readFileSync(viewsFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const meta = existsSync(join(out, 'meta.json')) ? JSON.parse(readFileSync(join(out, 'meta.json'), 'utf8')) : {};
  if (options.baseline) await pixelDiffs(out, options.baseline, views);
  const findings = views.flatMap(v => (v.findings ?? []).map(f => ({...f, view: viewName(v), shot: v.shot})));
  const byRule = {};
  for (const f of findings) { const r = (byRule[f.rule] ??= {fail: 0, warn: 0, info: 0, views: new Set()}); r[f.severity]++; r.views.add(f.view); }
  const counts = Object.fromEntries(Object.entries(byRule).map(([k, v]) => [k, {fail: v.fail, warn: v.warn, info: v.info, views: v.views.size}]));
  const errors = views.filter(v => v.error || v.skipped);
  const totals = {views: views.length, audited: views.length - errors.length, fail: findings.filter(f => f.severity === 'fail').length, warn: findings.filter(f => f.severity === 'warn').length, info: findings.filter(f => f.severity === 'info').length, viewErrors: errors.length};
  if (options.selftest) {
    const a = views.find(v => v.injection === 'clean:overflow-x'), b = views.find(v => v.injection === 'overflow-x');
    if (a?.shot && b?.shot) b.pixelDiff = await diff(require('sharp'), join(out, a.shot), join(out, b.shot), join(out, 'diffs', 'selftest-overflow.png'));
  }
  const selftest = options.selftest ? selfTest(views) : null;
  writeFileSync(join(out, 'report.json'), JSON.stringify({meta, options, totals, counts, selftest, views}, null, 1));
  writeFileSync(join(out, 'summary.md'), summary(meta, options, totals, counts, findings, errors, selftest));
  if (selftest) return selftest.every(r => r.caught) ? 0 : 1;
  return totals.fail > 0 || errors.some(v => v.error) ? 1 : 0;
}

const viewName = (v) => `${v.browser} ${v.role} ${v.lang} ${v.text}% ${v.width} ${v.path}${v.state && v.state !== 'default' ? ` [${v.state}]` : ''}${v.injection ? ` {${v.injection}}` : ''}`;

function selfTest(views) {
  const count = (v, rule) => (v?.findings ?? []).filter(f => f.rule === rule).length;
  const rows = INJECTIONS.map(inj => {
    const clean = views.find(v => v.injection === 'clean:' + inj.rule), hit = views.find(v => v.injection === inj.rule);
    const before = count(clean, inj.rule), after = count(hit, inj.rule);
    const sample = (hit?.findings ?? []).filter(f => f.rule === inj.rule).slice(-1)[0];
    return {rule: inj.rule, browser: inj.browser ?? 'chromium', clean: before, injected: after, caught: after > before, sample: sample ? `${sample.severity}: ${sample.text ?? ''}`.slice(0, 90) : (hit?.error ?? '').slice(0, 90)};
  });
  // pixel-diff: the clean and injected overflow screenshots must differ.
  const a = views.find(v => v.injection === 'clean:overflow-x'), b = views.find(v => v.injection === 'overflow-x');
  if (a?.shot && b?.shot) rows.push({rule: 'pixel-diff', browser: 'chromium', clean: 0, injected: b.pixelDiff?.ratio ? 1 : 0, caught: !!b.pixelDiff?.changed, sample: b.pixelDiff ? `ratio ${b.pixelDiff.ratio}` : 'not compared'});
  return rows;
}

async function pixelDiffs(out, baseline, views) {
  const sharp = require('sharp');
  for (const v of views) {
    if (!v.shot) continue;
    const old = join(baseline, v.shot);
    if (!existsSync(old)) continue;
    v.pixelDiff = await diff(sharp, old, join(out, v.shot), join(out, 'diffs', v.shot));
    if (v.pixelDiff.changed) (v.findings ??= []).push({rule: 'pixel-diff', severity: 'warn', selector: null, text: `${(v.pixelDiff.ratio * 100).toFixed(2)}% of pixels changed`, rect: null, data: v.pixelDiff, crop: v.pixelDiff.diff});
  }
}

export async function diff(sharp, a, b, target) {
  const A = await sharp(a).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const B = await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  if (A.info.width !== B.info.width || A.info.height !== B.info.height) return {changed: true, ratio: 1, size: [[A.info.width, A.info.height], [B.info.width, B.info.height]]};
  const n = A.info.width * A.info.height, mask = Buffer.alloc(n * 4);
  let changed = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const d = Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o + 1] - B.data[o + 1]), Math.abs(A.data[o + 2] - B.data[o + 2]));
    if (d > 24) { changed++; mask[o] = 255; mask[o + 3] = 255; } else { mask[o] = mask[o + 1] = mask[o + 2] = B.data[o] >> 2; mask[o + 3] = 255; }
  }
  const ratio = Math.round((changed / n) * 10000) / 10000;
  if (changed / n > 0.002) { mkdirSync(dirname(target), {recursive: true}); await sharp(mask, {raw: {width: A.info.width, height: A.info.height, channels: 4}}).png().toFile(target); return {changed: true, ratio, diff: target}; }
  return {changed: false, ratio};
}

function summary(meta, options, totals, counts, findings, errors, selftest) {
  const L = [];
  L.push(`# NEVORA UI audit`, '');
  L.push(`Build: ${meta.build ?? options.build} (owned app from the committed tree${(meta.build ?? options.build) === 'production' ? ', https test origin through the owned TLS proxy' : ''}). Fictional data only.`);
  L.push(`Started ${meta.started ?? '?'}, finished ${meta.finished ?? '?'}; audit ${meta.seconds ?? '?'} s, build ${meta.buildSeconds ?? '?'} s, total ${options.totalSeconds ?? '?'} s.`);
  L.push(`Matrix: roles ${(options.roles ?? []).join(', ')}; widths ${(options.widths ?? []).join(', ')}; text ${(options.text ?? []).join(', ')}%; browsers ${(options.browsers ?? []).join(', ')}; languages ${(options.lang ?? []).join(', ')}${options.routes?.length ? `; routes ${options.routes.join(', ')}` : ''}. Playwright ${meta.playwright ?? '?'}, axe-core ${meta.axeVersion ?? '?'}.`, '');
  L.push(`**${totals.views} views**, ${totals.audited} audited, ${totals.viewErrors} with errors. Findings: **${totals.fail} fail**, ${totals.warn} warn, ${totals.info} info.`, '');
  if (selftest) {
    L.push('## Self-test', '', '| Rule | Browser | Clean view | Injected view | Caught | Sample |', '|---|---|---|---|---|---|');
    for (const r of selftest) L.push(`| ${r.rule} | ${r.browser} | ${r.clean} | ${r.injected} | ${r.caught ? 'yes' : '**no**'} | ${String(r.sample).replace(/\|/g, '/')} |`);
    L.push('');
  }
  L.push('## Findings by rule', '', '| Rule | Fail | Warn | Info | Views |', '|---|---|---|---|---|');
  for (const [rule, c] of Object.entries(counts).sort((a, b) => b[1].fail - a[1].fail || b[1].warn - a[1].warn || a[0].localeCompare(b[0]))) L.push(`| ${rule} | ${c.fail} | ${c.warn} | ${c.info} | ${c.views} |`);
  L.push('');
  if (errors.length) { L.push('## Views that could not be audited', ''); for (const v of errors.slice(0, 60)) L.push(`- ${viewName(v)}: ${(v.error ?? v.skipped ?? '').slice(0, 200)}`); L.push(''); }
  if (meta.setupLog?.length) { const bad = meta.setupLog.filter(x => typeof x === 'string' && /failed/.test(x)); if (bad.length) { L.push('## Fixture notes', ''); for (const x of bad) L.push('- ' + x.slice(0, 200)); L.push(''); } }
  // Ranked findings: fails first, grouped by rule and selector so a shared component shows once with its spread.
  const groups = new Map();
  for (const f of findings) { if (f.severity === 'info') continue; const k = `${f.severity}|${f.rule}|${f.selector ?? f.text}`; const g = groups.get(k) ?? {f, views: []}; g.views.push(f.view); groups.set(k, g); }
  const ranked = [...groups.values()].sort((a, b) => RANK[a.f.severity] - RANK[b.f.severity] || b.views.length - a.views.length);
  L.push('## Findings, most severe first', '', 'Grouped by rule and element; "where" lists up to three views and the count.', '');
  for (const sev of ['fail', 'warn']) {
    const part = ranked.filter(g => g.f.severity === sev);
    if (!part.length) continue;
    L.push(`### ${sev === 'fail' ? 'Fail' : 'Warn'} (${part.length} groups)`, '', '| Rule | Element | Text | Detail | Where | Crop |', '|---|---|---|---|---|---|');
    for (const g of part.slice(0, sev === 'fail' ? 400 : 250)) {
      const detail = JSON.stringify(g.f.data ?? {}).replace(/\|/g, '/').slice(0, 140);
      L.push(`| ${g.f.rule} | \`${String(g.f.selector ?? '').replace(/\|/g, '/').slice(0, 70)}\` | ${String(g.f.text ?? '').replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 60)} | ${detail} | ${g.views.slice(0, 3).join('; ')}${g.views.length > 3 ? ` (+${g.views.length - 3})` : ''} | ${g.f.crop ?? ''} |`);
    }
    if (part.length > (sev === 'fail' ? 400 : 250)) L.push('', `…${part.length - (sev === 'fail' ? 400 : 250)} more groups in report.json.`);
    L.push('');
  }
  return L.join('\n') + '\n';
}
