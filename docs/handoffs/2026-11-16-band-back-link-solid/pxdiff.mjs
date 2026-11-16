import { createRequire } from 'node:module'; import { readdirSync, writeFileSync } from 'node:fs';
const require = createRequire('/Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB/'); const sharp = require('sharp');
const [dir] = process.argv.slice(2); const lines = []; let same = 0, diff = 0;
for (const f of readdirSync(`${dir}/before`).filter(f => f.endsWith('.png')).sort()) {
  const [a, b] = await Promise.all(['before', 'after'].map(s => sharp(`${dir}/${s}/${f}`).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) { lines.push(`${f}: size differs`); diff++; continue; }
  let n = 0, max = 0; for (let i = 0; i < a.data.length; i++) { const d = Math.abs(a.data[i] - b.data[i]); if (d) { max = Math.max(max, d); if (i % 3 === 0 || d) n++; } }
  if (n === 0) { same++; lines.push(`${f}: identical`); } else { diff++; lines.push(`${f}: ${n} channel values differ, max delta ${max}`); }
}
writeFileSync(`${dir}/pixel-diff.txt`, lines.join('\n') + `\n${same} identical, ${diff} differ\n`); console.log(`${same} identical, ${diff} differ`); console.log(lines.filter(l => !l.endsWith('identical')).join('\n'));
