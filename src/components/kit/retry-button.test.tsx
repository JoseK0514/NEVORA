import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from '@rstest/core';
import { RetryButton } from './retry-button';
import { BState } from '@/components/owner-b/b-kit';
import { CorpButton } from '@/components/corp/corp';

// English flag A6 (Jose, Nov 26, 2026): an in-card Try again shows "Trying again…" while it runs. The busy face is
// drawn in the same cell from the start, hidden, so the button keeps its width when it swaps.
describe('in-card Try again', () => {
  it('a card state marked as a retry carries the hidden busy words beside its label', () => {
    const html = renderToStaticMarkup(<BState kind="failed" line="Couldn’t load." action={{ retry: true, label: 'Try again', onClick: () => {} }} />);
    expect(html).toContain('<span class="b-busy__idle">Try again</span>');
    expect(html).toMatch(/<span class="b-busy__on" data-b-off="" aria-hidden="true">[\s\S]*Trying again…<\/span>/);
    expect(html).not.toContain('aria-busy="true"');
  });
  it('a card state without retry is drawn as before', () => {
    const html = renderToStaticMarkup(<BState kind="done" line="Saved." action={{ label: 'Undo', onClick: () => {} }} />);
    expect(html).not.toContain('b-busy');
  });
  it('works on any kit button and keeps its classes', () => {
    const plain = renderToStaticMarkup(<RetryButton className="q-btn q-btn--sec" onClick={() => {}}>Try again</RetryButton>);
    expect(plain).toMatch(/^<button type="button" class="q-btn q-btn--sec">/);
    expect(plain).toContain('Trying again…');
    const corp = renderToStaticMarkup(<RetryButton as={CorpButton} kind="secondary" size="md" onClick={() => {}}>Try again</RetryButton>);
    expect(corp).toMatch(/^<button type="button" class="c-btn[^"]*">/);
    expect(corp).toContain('<span class="b-busy__idle">Try again</span>');
  });
});
