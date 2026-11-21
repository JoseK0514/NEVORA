// "Discard changes?" (Nov 21, 2026): the question's words, names and order, and its stylesheet's motion rules.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from '@rstest/core';
import {DiscardDialog} from './discard-dialog';
import {MOMENTS_COPY} from '../owner-b/moments-copy';

const html = (lang?: 'en' | 'es', open = true) => renderToStaticMarkup(<DiscardDialog open={open} onKeep={() => {}} onDiscard={() => {}} lang={lang} />);

describe('DiscardDialog', () => {
  it('is an alertdialog named by its title and described by its one line', () => {
    const markup = html();
    expect(markup).toMatch(/<dialog[^>]*role="alertdialog"/);
    const labelled = /aria-labelledby="([^"]+)"/.exec(markup)?.[1], described = /aria-describedby="([^"]+)"/.exec(markup)?.[1];
    expect(labelled && described && labelled !== described).toBeTruthy();
    expect(markup).toContain(`<h2 class="b-discard__t" id="${labelled}">Discard changes?</h2>`);
    expect(markup).toContain(`<p class="b-discard__s" id="${described}">Your edits on this page haven’t been saved.</p>`);
  });
  it('puts the safe answer first (left) and the commit second (right), neither a submit, inside a block link clicks skip', () => {
    const markup = html();
    expect(markup).toContain('data-discard-skip=""');
    const buttons = [...markup.matchAll(/<button type="button" class="([^"]+)"[^>]*>([^<]+)<\/button>/g)].map(match => [match[1].split(' ').pop(), match[2]]);
    expect(buttons).toEqual([['b-discard__keep', 'Keep editing'], ['b-discard__go', 'Discard changes']]);
  });
  it('speaks Spanish, marked as Spanish', () => {
    const markup = html('es');
    expect(markup).toContain('lang="es"');
    for (const words of ['¿Descartar los cambios?', 'Los cambios de esta página no se han guardado.', 'Seguir editando', 'Descartar cambios']) expect(markup).toContain(words);
    for (const key of ['discardTitle', 'discardLine', 'discardKeep', 'discardGo'] as const) expect(MOMENTS_COPY.es[key]).not.toBe(MOMENTS_COPY.en[key]);
  });
  it('renders nothing inside the sheet while closed', () => {
    expect(html('en', false)).not.toContain('b-discard');
  });
  it('adds no keyframes and moves only when motion is allowed (the 8px rise from 768px)', () => {
    const css = readFileSync(join(__dirname, 'discard-dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/@keyframes|animation\s*:|transition\s*:/);
    const rise = css.split('\n').filter(line => line.includes('--b-m-rise'));
    expect(rise.length).toBe(2);
    expect(css).toContain('@media (min-width: 768px) and (prefers-reduced-motion: no-preference)');
    expect(css.indexOf('--b-m-rise')).toBeGreaterThan(css.indexOf('prefers-reduced-motion: no-preference'));
    expect([...css.matchAll(/@media([^{]+)\{/g)].map(match => match[1].trim()).sort()).toEqual(['(max-width: 767px)', '(min-width: 768px)', '(min-width: 768px) and (prefers-reduced-motion: no-preference)']);
  });
});
