import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const { getRootDirs } = require('../tools/eslint-plugin-next/dist/utils/get-root-dirs.js');
const nextPlugin = require('../tools/eslint-plugin-next/dist/index.js');
const json = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
let fixture;
const cwd = process.cwd();

before(() => {
  fixture = mkdtempSync(join(tmpdir(), 'par-lint-chain-'));
  for (const path of ['apps/web/app/nested', 'apps/web/pages', 'apps/mobile/pages', 'apps/other', 'apps/.hidden', 'packages/tool', 'literal [name]/pages', 'pages']) {
    mkdirSync(join(fixture, path), { recursive: true });
  }
  symlinkSync('web', join(fixture, 'apps/linked'));
  for (const path of ['pages/about.tsx', 'apps/web/pages/about.tsx', 'apps/mobile/pages/about.tsx']) {
    writeFileSync(join(fixture, path), 'export default function About() { return null; }\n');
  }
  writeFileSync(join(fixture, 'apps/readme.md'), 'Fictional lint fixture');
});
after(() => {
  process.chdir(cwd);
  rmSync(fixture, { recursive: true, force: true });
});

test('the installed development graph contains none of the vulnerable glob chain', () => {
  const lock = json('package-lock.json');
  for (const name of ['braces', 'micromatch', 'fast-glob']) {
    assert.deepEqual(Object.keys(lock.packages).filter(path => path.endsWith('/' + name)), [], name + ' must be removed, not suppressed');
  }
  assert.equal(json('tools/eslint-plugin-next/package.json').dependencies.glob, '14.0.4');
  assert.equal(json('package.json').devDependencies['@nevora/eslint-config-next'], 'file:tools/eslint-config-next');
  assert.equal(require('glob/package.json').version, '14.0.4');
  const parserRequire=createRequire(require.resolve('@typescript-eslint/typescript-estree/package.json'));
  assert.equal(parserRequire('minimatch/package.json').version, '11.0.5');
  for(const [path,pkg] of Object.entries(lock.packages))if(path.endsWith('/minimatch')&&Number(pkg.version?.split('.')[0])>=7)assert.ok(Number(pkg.version.split('.')[0])>=11,'No affected minimatch7-10 may remain in the installed graph');
});

for (const folder of ['eslint-config-next', 'eslint-plugin-next']) {
  test(folder + ' retains every published file except the explicit dependency/import seam', () => {
    const provenance = json('tools/' + folder + '/PROVENANCE.json');
    const permitted = folder === 'eslint-config-next'
      ? ['dist/index.js', 'dist/core-web-vitals.js'] : ['dist/utils/get-root-dirs.js'];
    const changed = [];
    for (const row of provenance.upstream.retainedFiles) {
      const bytes = readFileSync(join(root, 'tools', folder, row.path));
      if (digest(bytes) !== row.sha256) {
        const normalization = provenance.formatOnlyNormalizations?.[row.path];
        if (normalization) {
          assert.equal(normalization.upstreamSha256, row.sha256);
          assert.equal(digest(bytes), normalization.normalizedSha256);
        } else changed.push(row.path);
      }
    }
    assert.ok(changed.every(path => permitted.includes(path)), 'No lint rule body or unrelated published file may change: ' + changed.join(','));
    if (folder === 'eslint-plugin-next') assert.deepEqual(changed, ['dist/utils/get-root-dirs.js']);
  });
}
test('all 22 original Next rules and their recommended severities remain enabled', () => {
  assert.equal(Object.keys(nextPlugin.rules).length, 22);
  assert.ok(Object.keys(nextPlugin.configs.recommended.rules).length > 0);
  const config = json('tools/eslint-plugin-next/PROVENANCE.json');
  const rules = config.upstream.retainedFiles.filter(row => row.path.startsWith('dist/rules/') && row.path.endsWith('.js'));
  assert.equal(rules.length, 22);
  for (const row of rules) assert.equal(digest(readFileSync(join(root, 'tools/eslint-plugin-next', row.path))), row.sha256);
});

const sets = {
  'apps/web': ['apps/web'],
  'apps/web/': ['apps/web/'],
  './apps/web': ['./apps/web'],
  '.': ['.'],
  './': ['./'],
  'apps/*': ['apps/linked', 'apps/mobile', 'apps/other', 'apps/web'],
  'apps/**': ['apps/linked', 'apps/linked/app', 'apps/linked/app/nested', 'apps/linked/pages', 'apps/mobile', 'apps/mobile/pages', 'apps/other', 'apps/web', 'apps/web/app', 'apps/web/app/nested', 'apps/web/pages'],
  'apps/{web,mobile}': ['apps/mobile', 'apps/web'],
  'apps/w?b': ['apps/web'],
  'apps/@(web|mobile)': ['apps/mobile', 'apps/web'],
  'apps/missing': [],
  'apps/linked': ['apps/linked'],
  'apps/linked/**': ['apps/linked/app', 'apps/linked/app/nested', 'apps/linked/pages'],
  'apps/.*': ['apps/.hidden'],
  'apps/*/pages': ['apps/linked/pages', 'apps/mobile/pages', 'apps/web/pages'],
};
for (const [pattern, expected] of Object.entries(sets)) {
  test('root-directory semantics preserve ' + pattern, () => {
    process.chdir(fixture);
    try { assert.deepEqual(getRootDirs({ cwd: fixture, settings: { next: { rootDir: pattern } } }).sort(), [...expected].sort()); }
    finally { process.chdir(cwd); }
  });
}
for (const pattern of ['apps/web', 'apps/*']) {
  test('absolute root-directory semantics preserve ' + pattern, () => {
    const absolute = join(fixture, pattern);
    assert.deepEqual(getRootDirs({ cwd: fixture, settings: { next: { rootDir: absolute } } }).sort(), sets[pattern].map(path => join(fixture, path)).sort());
  });
}
test('default and mixed array root settings keep their existing behavior', () => {
  assert.deepEqual(getRootDirs({ cwd: fixture, settings: {} }), [fixture]);
  process.chdir(fixture);
  try {
    assert.deepEqual(getRootDirs({ cwd: fixture, settings: { next: { rootDir: ['apps/web', 3, null, 'apps/mobile'] } } }), ['apps/web', 'apps/mobile']);
  } finally { process.chdir(cwd); }
});

for (const [label, pattern] of [
  ['oversize', 'x'.repeat(65537)],
  ['deep braces', '{'.repeat(129) + 'x' + '}'.repeat(129)],
  ['deep parentheses', '('.repeat(129) + 'x' + ')'.repeat(129)],
  ['Cartesian expansion', '{a,b}'.repeat(14)],
  ['huge numeric range', '{1..100000000}'],
]) {
  test('hostile ' + label + ' fails closed before glob parsing', () => {
    assert.throws(() => getRootDirs({ cwd: fixture, settings: { next: { rootDir: pattern } } }), /Next lint rootDir/);
  });
}

function lint(code, pattern) {
  const config = {
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { next: nextPlugin },
    settings: { next: pattern ? { rootDir: pattern } : {} },
    rules: { 'next/no-html-link-for-pages': 'error' },
  };
  return new Linter({ cwd: fixture }).verify(code, [config], { filename: join(fixture, 'fixture.js') });
}
for (const relative of ['apps/web', 'apps/linked', 'apps/*', 'apps/{web,mobile}', 'apps/*/pages/..']) {
  test('real no-html-link-for-pages detection remains active for ' + relative, () => {
    const messages = lint('const element = <a href="/about">About</a>;', join(fixture, relative));
    assert.ok(messages.some(item => item.ruleId === 'next/no-html-link-for-pages' && item.severity === 2), JSON.stringify(messages));
  });
}
for (const code of [
  'const element = <a href="https://example.test/about">External</a>;',
  'const element = <a href="/about" target="_blank">New tab</a>;',
  'const element = <a href="/about" download>Download</a>;',
  'const element = <Link href="/about">About</Link>;',
]) {
  test('existing allowed navigation remains allowed: ' + code, () => {
    assert.deepEqual(lint(code, join(fixture, 'apps/web')), []);
  });
}
