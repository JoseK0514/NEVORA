import type { MouseEvent, ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SigButton, SigPendingLabel } from './sig-button';

type Props = Record<string, unknown> & { onClick?: (event: MouseEvent<HTMLElement>) => void };
const element = (node: ReactElement) => node as ReactElement<Props>;
const click = () => { const event = { preventDefault: vi.fn(), defaultPrevented: false }; return event; };
const openTag = (html: string) => html.slice(0, html.indexOf('>') + 1);

describe('SigButton', () => {
  it.each([
    ['primary', 'sig-btn sig-btn--primary'],
    ['secondary', 'sig-btn sig-btn--secondary'],
    ['link', 'sig-btn sig-btn--link'],
  ] as const)('renders the %s variant as a type=button with its classes', (variant, classes) => {
    const html = renderToStaticMarkup(<SigButton variant={variant} className="extra">Continue</SigButton>);
    expect(openTag(html)).toContain(`class="${classes} extra"`);
    expect(openTag(html)).toContain('type="button"');
    expect(html).toContain('Continue');
    expect(html).not.toContain('aria-busy');
  });

  it('defaults to primary and forwards rest props and the submit type', () => {
    const html = renderToStaticMarkup(<SigButton type="submit" name="kind" value="SAVE" data-testid="save" aria-label="Save usual week">Save</SigButton>);
    const tag = openTag(html);
    expect(tag).toContain('sig-btn--primary');
    expect(tag).toContain('type="submit"');
    expect(tag).toContain('name="kind"');
    expect(tag).toContain('data-testid="save"');
    expect(tag).toContain('aria-label="Save usual week"');
  });

  it('pending: aria-busy and aria-disabled, spinner, pending words, label kept for width, never natively disabled', () => {
    const html = renderToStaticMarkup(<SigButton pending pendingText="Saving…" disabled>Save usual week</SigButton>);
    const tag = openTag(html);
    expect(tag).toContain('aria-busy="true"');
    expect(tag).toContain('aria-disabled="true"');
    expect(tag).not.toMatch(/\sdisabled=""/);
    expect(html).toContain('Saving…');
    expect(html).toContain('Save usual week');
    expect(html).toContain('sig-btn__spin');
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    // The idle words are hidden (and so out of the accessible name); the pending cell is shown.
    expect(html).toMatch(/class="sig-btn__idle" style="visibility:hidden"/);
    expect(html).toMatch(/class="sig-btn__busy">/);
  });

  it('pending swallows the click and does not call onClick', () => {
    const onClick = vi.fn();
    const button = element(SigButton({ pending: true, pendingText: 'Sending…', onClick, children: 'Send request' }));
    const event = click();
    button.props.onClick?.(event as unknown as MouseEvent<HTMLElement>);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
    expect(button.props.disabled).toBeUndefined();
  });

  it('idle forwards the click', () => {
    const onClick = vi.fn();
    const button = element(SigButton({ onClick, children: 'Done' }));
    const event = click();
    button.props.onClick?.(event as unknown as MouseEvent<HTMLElement>);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('disabled (not pending) sets the native attribute and no busy state', () => {
    const tag = openTag(renderToStaticMarkup(<SigButton disabled>Claim shift</SigButton>));
    expect(tag).toContain('disabled=""');
    expect(tag).not.toContain('aria-busy');
    expect(tag).not.toContain('aria-disabled');
  });

  it('href renders a link with the same classes', () => {
    const html = renderToStaticMarkup(<SigButton href="/app/requests?tab=my" variant="secondary">See my requests</SigButton>);
    const tag = openTag(html);
    expect(tag.startsWith('<a')).toBe(true);
    expect(tag).toContain('href="/app/requests?tab=my"');
    expect(tag).toContain('class="sig-btn sig-btn--secondary"');
    expect(tag).not.toContain('aria-disabled');
  });

  it.each([['pending', { pending: true }], ['disabled', { disabled: true }]] as const)('a %s link is aria-disabled and blocks navigation', (_, state) => {
    const onClick = vi.fn();
    const tag = openTag(renderToStaticMarkup(<SigButton href="/app" {...state}>Go to Home</SigButton>));
    expect(tag).toContain('aria-disabled="true"');
    expect(tag).toContain('href="/app"');
    const link = element(SigButton({ href: '/app', onClick, children: 'Go to Home', ...state }));
    const event = click();
    link.props.onClick?.(event as unknown as MouseEvent<HTMLElement>);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('SigPendingLabel', () => {
  it('keeps both cells and falls back to the label while pending', () => {
    const html = renderToStaticMarkup(<SigPendingLabel pending>Continue</SigPendingLabel>);
    expect(html.match(/Continue/g)).toHaveLength(2);
    expect(html).toContain('sig-btn__spin');
  });
  it('idle hides the pending cell from the accessibility tree', () => {
    const html = renderToStaticMarkup(<SigPendingLabel pending={false} pendingText="Saving…">Save</SigPendingLabel>);
    expect(html).toMatch(/class="sig-btn__busy" style="visibility:hidden" aria-hidden="true"/);
  });
});
