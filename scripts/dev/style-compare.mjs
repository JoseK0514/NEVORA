#!/usr/bin/env node
// Dev-only: compares two style-snapshot.mjs output folders (DESIGN.MD U10).
// Not part of the build and not wired to any npm script.
//
// Usage:
//   node scripts/dev/style-compare.mjs <before dir> <after dir>
//     [--quiet] [--pixels] [--ignore prop,prop] [--allow <regex>]
//
// --allow marks expected differences: any difference whose
// "<view> <element key> <prop>" line matches the regex is counted under
// "allowed" instead of "total". --pixels also pixel-compares same-named PNGs
// (needs pngjs and pixelmatch from the Playwright runtime; no npm dependency).
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PROPS } from './style-snapshot.mjs';

const GEOMETRY = ['x', 'y'];

function load(file) {
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  // Original U10 files are a bare map; rebuilt ones carry { meta, styles }.
  return raw.styles ? raw : { meta: { geometry: false }, styles: raw };
}

export function compare(beforeDir, afterDir, { ignore = new Set(), allow = null } = {}) {
  let total = 0, allowed = 0, pagesWithDiff = 0;
  const byProp = {}, samples = [], allowedSamples = [], missing = [];
  for (const file of readdirSync(beforeDir).filter(f => f.endsWith('.json'))) {
    if (!existsSync(join(afterDir, file))) { missing.push(file); continue; }
    const a = load(join(beforeDir, file)), b = load(join(afterDir, file));
    const props = [...PROPS, ...(a.meta.geometry && b.meta.geometry ? GEOMETRY : [])];
    const view = file.replace(/\.json$/, '');
    let n = 0;
    const note = (line, prop) => {
      if (allow?.test(line)) { allowed++; if (allowedSamples.length < 60) allowedSamples.push(line); return; }
      n++; byProp[prop] = (byProp[prop] || 0) + 1; if (samples.length < 80) samples.push(line);
    };
    for (const key of new Set([...Object.keys(a.styles), ...Object.keys(b.styles)])) {
      const x = a.styles[key], y = b.styles[key];
      if (x === y) continue;
      if (x === undefined || y === undefined) { note(`${view} ${key} (structure): ${x === undefined ? 'added' : 'removed'}`, '(structure)'); continue; }
      if (x === 'none' || y === 'none') { note(`${view} ${key} display: ${x === 'none' ? 'none' : 'shown'} → ${y === 'none' ? 'none' : 'shown'}`, 'display'); continue; }
      const xs = x.split('|'), ys = y.split('|');
      props.forEach((prop, i) => { if (xs[i] !== ys[i] && !ignore.has(prop)) note(`${view} ${key} ${prop}: ${xs[i]} → ${ys[i]}`, prop); });
    }
    if (n) { pagesWithDiff++; total += n; }
  }
  return { total, allowed, pagesWithDiff, byProp, samples, allowedSamples, missing };
}

function pixels(beforeDir, afterDir) {
  const runtime = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
  const { PNG } = runtime('pngjs'); const pm = runtime('pixelmatch'); const pixelmatch = pm.default ?? pm;
  let differing = 0;
  for (const file of readdirSync(beforeDir).filter(f => f.endsWith('.png'))) {
    if (!existsSync(join(afterDir, file))) continue;
    const x = PNG.sync.read(readFileSync(join(beforeDir, file))), y = PNG.sync.read(readFileSync(join(afterDir, file)));
    if (x.width !== y.width || x.height !== y.height) { differing++; console.log('size', file, `${x.width}x${x.height} → ${y.width}x${y.height}`); continue; }
    const d = pixelmatch(x.data, y.data, null, x.width, x.height, { threshold: 0.1 });
    if (d > 0) { differing++; console.log('pixels', file, d); }
  }
  console.log('pixel pages differing', differing);
}

function main() {
  const argv = process.argv.slice(2);
  const [before, after] = argv.filter(a => !a.startsWith('--') && !['--ignore', '--allow'].includes(argv[argv.indexOf(a) - 1]));
  if (!before || !after) throw Error('Usage: style-compare.mjs <before dir> <after dir> [--quiet] [--pixels] [--ignore p,q] [--allow regex]');
  const flag = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const ignore = new Set((flag('--ignore') ?? process.env.IGNORE ?? '').split(',').filter(Boolean));
  const allow = flag('--allow') ? new RegExp(flag('--allow')) : null;
  const result = compare(before, after, { ignore, allow });
  console.log(JSON.stringify({ total: result.total, allowed: result.allowed, pagesWithDiff: result.pagesWithDiff, byProp: result.byProp, missingInAfter: result.missing }));
  if (!argv.includes('--quiet')) {
    for (const line of result.samples) console.log('  ' + line);
    if (result.allowedSamples.length) { console.log('allowed:'); for (const line of result.allowedSamples) console.log('  ' + line); }
  }
  if (argv.includes('--pixels')) pixels(before, after);
  if (result.total) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { main(); } catch (error) { console.error(String(error?.message ?? error)); process.exitCode = 1; }
}
