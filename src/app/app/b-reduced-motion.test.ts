// Phase 7 (Nov 17, 2026; findings UI-7 and RA-21): the reduced-motion audit, kept from rotting. A stylesheet under src that
// moves anything (a transition, an animation or keyframes) must also say what happens under prefers-reduced-motion.
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {describe, expect, it} from '@rstest/core';
import {OVERLAY_EXIT_MS} from '@/components/kit/overlay-exit';

const root = join(__dirname, '..', '..');
const sheets = (dir: string): string[] => readdirSync(dir, {withFileTypes: true}).flatMap(entry =>
  entry.isDirectory() ? sheets(join(dir, entry.name)) : entry.name.endsWith('.css') ? [join(dir, entry.name)] : []);
const css = (path: string) => readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** A declaration that turns motion off (`transition: none`, `animation: none`, a zero duration) is not motion. */
const OFF = /^(none|0s|0ms|initial|unset|inherit)\b/;
export function motionDeclarations(text: string): string[] {
  const found = [...text.matchAll(/@keyframes\s+[\w-]+/g)].map(match => match[0]);
  for (const match of text.matchAll(/(?<![\w-])((?:transition|animation)(?:-[a-z-]+)?)\s*:\s*([^;}]+)/g)) {
    if (!OFF.test(match[2].trim())) found.push(`${match[1]}: ${match[2].trim()}`);
  }
  return found;
}
const handlesReducedMotion = (text: string) => /prefers-reduced-motion\s*:\s*(reduce|no-preference)/.test(text);

/* Sheets that may move without a reduced-motion rule. Keep it short, and say why for each entry.
 * Empty on Nov 17, 2026: every sheet that moves has a rule. A new entry needs a reason a reviewer would accept
 * (for example a vendored sheet that is never loaded in the app). */
const ALLOWED: Record<string, string> = {};

/** The rules of a sheet with the at-rules around each: [prelude, body, at-rule preludes]. */
function rules(text: string): [string, string, string[]][] {
  const out: [string, string, string[]][] = [], stack: string[] = [];
  let buffer = '';
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '{') {
      const prelude = buffer.trim(); buffer = '';
      if (prelude.startsWith('@') && !/^@(keyframes|font-face|property|page)/.test(prelude)) { stack.push(prelude); continue; }
      let depth = 1, end = index + 1;
      for (; end < text.length && depth; end++) depth += text[end] === '{' ? 1 : text[end] === '}' ? -1 : 0;
      out.push([prelude, text.slice(index + 1, end - 1), [...stack]]);
      index = end - 1;
    } else if (char === '}') { stack.pop(); buffer = ''; }
    else buffer += char;
  }
  return out;
}

describe('reduced motion (UI-7, RA-21)', () => {
  const all = sheets(root).map(path => relative(root, path)).sort();
  const moving = all.filter(path => motionDeclarations(css(join(root, path))).length > 0);

  it('finds the stylesheets', () => {
    expect(all.length).toBeGreaterThan(100);
    expect(moving).toContain('app/app/b-motion.css');
  });
  it('reads a declaration that turns motion off as no motion', () => {
    expect(motionDeclarations('a { transition: none; animation: none !important; transition-duration: 0s; }')).toEqual([]);
    expect(motionDeclarations('a { transition: opacity 150ms; } @keyframes x { to { opacity: 0; } }')).toEqual(['@keyframes x', 'transition: opacity 150ms']);
  });
  it.each(moving)('%s says what happens under reduced motion', path => {
    if (ALLOWED[path]) return;
    expect(handlesReducedMotion(css(join(root, path))), `${path} declares ${motionDeclarations(css(join(root, path))).slice(0, 3).join(' | ')} and has no prefers-reduced-motion rule`).toBe(true);
  });
  it('keeps the allow-list honest', () => {
    for (const [path, reason] of Object.entries(ALLOWED)) {
      expect(reason.length, path).toBeGreaterThan(20);
      expect(moving, `${path} no longer moves or no longer exists: remove it from the list`).toContain(path);
      expect(handlesReducedMotion(css(join(root, path))), `${path} has a rule now: remove it from the list`).toBe(false);
    }
  });
});

describe('the Phase 7 motion sheet (b-motion.css)', () => {
  const text = css(join(root, 'app/app/b-motion.css'));
  it('moves only when motion is allowed, with the tokens, on transform and opacity', () => {
    const moves = rules(text).filter(([, body]) => motionDeclarations(body).length > 0);
    expect(moves.length).toBeGreaterThan(10);
    for (const [prelude, body, around] of moves) {
      expect(around.some(at => /prefers-reduced-motion:\s*no-preference/.test(at)), prelude).toBe(true);
      for (const declaration of motionDeclarations(body)) {
        // Durations are tokens; the only properties are opacity and transform (overlay and display keep a closing layer painted).
        expect(declaration, prelude).not.toMatch(/\d(ms|s)\b/);
        const properties = declaration.replace(/var\([^)]*\)|allow-discrete|!important/g, '').match(/[a-z-]+/g) ?? [];
        for (const property of properties.filter(word => !/^(transition|transition-duration|animation)$/.test(word))) expect(['opacity', 'transform', 'overlay', 'display', 'none'], `${prelude}: ${declaration}`).toContain(property);
      }
    }
  });
  it('turns every overlay off under reduced motion', () => {
    const reduce = rules(text).filter(([, , around]) => around.some(at => /prefers-reduced-motion:\s*reduce/.test(at)));
    expect(reduce.some(([prelude, body]) => /q-sheet/.test(prelude) && /nevora-toast/.test(prelude) && /transition: none !important/.test(body) && /animation: none !important/.test(body))).toBe(true);
  });
  it('shares one exit time with the components', () => {
    expect(readFileSync(join(root, 'app/b-tokens.css'), 'utf8')).toMatch(new RegExp(`--b-dur-exit:\\s*${OVERLAY_EXIT_MS}ms`));
  });
});
