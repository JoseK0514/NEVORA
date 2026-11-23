// Gaps G60, G61, G62 (Nov 23, 2026): the shift sheet's delete confirm, its phone header focus ring and its Person field at
// 200% text, as stylesheet contracts. The browser evidence (sizes, colours, wrapping) is in the package's captures.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, it} from '@rstest/core';

const root = join(__dirname, '..', '..');
const css = (path: string) => readFileSync(join(root, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
/** The body of the first `@media <query> { … }` block after `from` that contains `needle`. */
const phoneBlocks = (text: string) => {
  const out: string[] = [];
  for (let at = text.indexOf('@media (max-width: 767px)'); at >= 0; at = text.indexOf('@media (max-width: 767px)', at + 1)) {
    let depth = 0, i = text.indexOf('{', at);
    const start = i;
    for (; i < text.length; i++) { if (text[i] === '{') depth++; else if (text[i] === '}' && --depth === 0) break; }
    out.push(text.slice(start, i));
  }
  return out;
};

it("G57: a day-view capsule keeps 4px above its first line and 4px between its last line and the 3px bar", () => {
  const sheet = css('app/app/owner-b-schedule.css');
  expect(sheet).toMatch(/\.cm-grid\[data-days="1"\] \.cm-tl > \.cm-block(?::not\(#pN\d\))+ \{[^}]*padding: 4px 10px 7px !important;/);
  expect(sheet).toMatch(/\.cm-grid\[data-days="1"\] \.cm-tl > \.cm-block \.c-time(?::not\(#pN\d\))+ \{[^}]*line-height: 1rem !important; \}/);
  expect(sheet).toMatch(/\.cm-grid \.cm-block(?::not\(#pN\d\))+::after \{[^}]*bottom: 0 !important; height: 3px !important;/);
  // The smaller "AM" doesn't make a capsule's line taller than 1rem.
  expect(sheet).toMatch(/\.cm-tl > \.cm-block \.c-time \.c-ampm(?::not\(#pN\d\))+ \{ line-height: 0 !important; \}/);
});

it('G60: on phones Keep shift and Delete stack full width, at least 44px tall, labels centred', () => {
  const blocks = phoneBlocks(css('app/app/owner-b-schedule.css'));
  const acts = blocks.find(block => block.includes('.c-shift__ask > .c-shift__ask-acts'));
  expect(acts).toBeDefined();
  // One column; every row as tall as the tallest, so Keep shift and Delete share one height at 200% text.
  expect(acts).toMatch(/\.c-shift__ask > \.c-shift__ask-acts[^{]*\{[^}]*display: grid !important;[^}]*grid-template-columns: minmax\(0, 1fr\) !important;[^}]*grid-auto-rows: 1fr !important;/);
  // The card takes the form card's edges (2px out) and 16px insets, so the buttons line up with the fields.
  expect(acts).toMatch(/\.c-shift-page > \.c-shift > form\.c-shift__delete[^{]*\{ margin-left: -2px !important; margin-right: -2px !important; \}/);
  expect(acts).toMatch(/form\.c-shift__delete:has\(\.c-shift__ask\)[^{]*\{ padding-left: var\(--b-space-16\) !important; padding-right: var\(--b-space-16\) !important; \}/);
  expect(acts).toMatch(/\.c-shift__ask-acts > button[^{]*\{[^}]*width: 100% !important;[^}]*min-height: var\(--b-btn-h\) !important;[^}]*text-align: center !important;/);
});

it('G61: on phones the sheet header’s Cancel and Save take the band’s white focus ring', () => {
  const blocks = phoneBlocks(css('app/app/owner-b-schedule.css'));
  expect(blocks.some(block => /\.c-shift > \.c-shift__head > :is\(a, button\):focus-visible[^{]*\{[^}]*outline: var\(--b-focus-width\) solid var\(--b-focus-on-band\) !important;/.test(block))).toBe(true);
});

it('G62: a narrow Person field draws the chosen name over the select, wrapping, and the select stays the control', () => {
  const sheet = css('components/schedule-shift-form.css');
  expect(sheet).toContain('.c-shift__person-v { display: none; }');
  expect(sheet).toMatch(/\.c-shift__person \{ container-type: inline-size !important; \}/);
  const query = sheet.slice(sheet.indexOf('@container (max-width: 19rem)'));
  expect(sheet).toContain('@media not (forced-colors: active)');
  expect(query).toMatch(/\.c-shift__person > select\.c-in \{[^}]*position: absolute !important;[^}]*inset: 0 !important;[^}]*color: transparent !important; -webkit-text-fill-color: transparent !important;/);
  // The insets stay in px (the avatar and the caret they clear are px); only the text grows with the reader's setting.
  expect(query).toContain('padding: 0.875rem 40px 0.875rem 52px !important;');
  expect(query).toMatch(/\.c-shift__person > \.c-shift__person-v \{[^}]*display: block !important;[^}]*overflow-wrap: anywhere !important;[^}]*pointer-events: none !important;/);
  const form = readFileSync(join(root, 'components/schedule-shift-form.tsx'), 'utf8');
  expect(form).toMatch(/<span className=\{name \? "c-shift__person-v" : "c-shift__person-v c-shift__person-v--none"\} aria-hidden="true">\{name \|\| w\.chooseSomeone\}<\/span>/);
  // Signed-in Spanish (es-rest): the empty choice is the copy table's "Choose someone" / "Elige a alguien".
  expect(readFileSync(join(root, 'components/schedule-copy.ts'), 'utf8')).toContain("chooseSomeone: 'Choose someone'");
});
