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
      // Under reduced motion an overlay may only fade in (opacity, Jose's NV-251 and NV-329 decisions, kept Nov 17, 2026).
      const reduced = around.some(at => /prefers-reduced-motion:\s*reduce/.test(at));
      expect(reduced || around.some(at => /prefers-reduced-motion:\s*no-preference/.test(at)), prelude).toBe(true);
      if (reduced) for (const declaration of motionDeclarations(body)) {
        expect(declaration, prelude).not.toMatch(/\d(ms|s)\b/);
        const properties = declaration.replace(/var\([^)]*\)|!important|linear/g, '').match(/[a-z-]+/g) ?? [];
        for (const property of properties.filter(word => !/^(transition|animation)$/.test(word))) expect(['opacity', 'none'], `${prelude}: ${declaration}`).toContain(property);
      }
      if (reduced) continue;
      for (const declaration of motionDeclarations(body)) {
        // Durations are tokens; the only properties are opacity and transform (overlay and display keep a closing layer painted).
        expect(declaration, prelude).not.toMatch(/\d(ms|s)\b/);
        const properties = declaration.replace(/var\([^)]*\)|allow-discrete|!important/g, '').match(/[a-z-]+/g) ?? [];
        for (const property of properties.filter(word => !/^(transition|transition-duration|animation)$/.test(word))) expect(['opacity', 'transform', 'overlay', 'display', 'none'], `${prelude}: ${declaration}`).toContain(property);
      }
    }
  });
  it('under reduced motion an overlay only fades in, and nothing travels or scales', () => {
    const reduce = rules(text).filter(([, , around]) => around.some(at => /prefers-reduced-motion:\s*reduce/.test(at)));
    const fades = reduce.filter(([, body]) => /transition: opacity var\(--b-dur-hover\) linear !important/.test(body));
    expect(fades.some(([prelude]) => /q-sheet/.test(prelude) && /nevora-toast/.test(prelude) && /popover-open/.test(prelude))).toBe(true);
    for (const [prelude, body] of reduce) expect(body, prelude).not.toMatch(/(?<![\w-])(transform|translate|scale)\s*:(?!\s*none)/);
  });
  it('turns off the movement of every overlay under reduced motion', () => {
    const reduce = rules(text).filter(([, , around]) => around.some(at => /prefers-reduced-motion:\s*reduce/.test(at)));
    expect(reduce.some(([prelude, body]) => /q-sheet/.test(prelude) && /nevora-toast/.test(prelude) && /transition: none !important/.test(body) && /animation: none !important/.test(body))).toBe(true);
  });
  it('shares one exit time with the components', () => {
    expect(readFileSync(join(root, 'app/b-tokens.css'), 'utf8')).toMatch(new RegExp(`--b-dur-exit:\\s*${OVERLAY_EXIT_MS}ms`));
  });
});

/* Phase 2 gap closure (Nov 23, 2026): a pseudo-element is not allowed inside :is(), :where(), :not() or :has(). The
 * browser drops it silently, so `:is(.mb-tog, .mb-tog::after) { transition: none; }` under reduced motion left the
 * toggle's knob sliding (found by the reduced-motion browser probe on New update; four sheets had the same rule shape).
 * A pseudo-element is written outside the function, on its own selector. */
export function pseudoInsideFunctional(selector: string): string[] {
  const out: string[] = [], re = /:(is|where|not|has)\(/g;
  for (let match = re.exec(selector); match; match = re.exec(selector)) {
    let depth = 1, end = re.lastIndex;
    for (; end < selector.length && depth; end++) depth += selector[end] === '(' ? 1 : selector[end] === ')' ? -1 : 0;
    const argument = selector.slice(re.lastIndex, end - 1);
    if (/::[a-z-]+/.test(argument)) out.push(`:${match[1]}(${argument})`);
  }
  return out;
}
describe('selectors the browser would drop (Phase 2 gap closure)', () => {
  it('reads a pseudo-element inside a functional pseudo-class', () => {
    expect(pseudoInsideFunctional('a :is(.mb-tog, .mb-tog::after)')).toEqual([':is(.mb-tog, .mb-tog::after)']);
    expect(pseudoInsideFunctional('a .mb-tog, a .mb-tog::after')).toEqual([]);
    expect(pseudoInsideFunctional(':is(#c-root, html) .b-btn:not(:disabled)::after')).toEqual([]);
  });
  it('has no pseudo-element inside :is(), :where(), :not() or :has() in any stylesheet', () => {
    const found: string[] = [];
    for (const path of sheets(root)) {
      const text = css(path);
      for (const match of text.matchAll(/([^{};]+)\{/g)) {
        const selector = match[1].trim();
        if (selector.startsWith('@')) continue;
        for (const bad of pseudoInsideFunctional(selector)) found.push(`${relative(root, path)}: ${bad}`);
      }
    }
    expect(found).toEqual([]);
  });
});
