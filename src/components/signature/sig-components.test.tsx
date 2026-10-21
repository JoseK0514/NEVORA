import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SigAvatar, SigBanner, SigCard, SigCardRow, SigEmpty, SigField, SigFieldGroup, SigList, SigPill, SigRow, SigSkeleton, SigTabs } from './sig-components';
import { SigSheet, SigToast } from './sig-overlays';
import { SigFade } from './sig-fade';

vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: unknown }) => <a href={href} {...rest}>{children as never}</a> }));

describe('Signature components', () => {
  it('list rows link, act or sit still, with a chevron only when they go somewhere', () => {
    const html = renderToStaticMarkup(<SigList label="Shortcuts">
      <SigRow href="/app/availability" title="Availability" sub="Your usual week" />
      <SigRow onClick={() => {}} title="Refresh" />
      <SigRow title="Plain" trailing={<SigPill>New</SigPill>} />
    </SigList>);
    expect(html).toContain('<ul class="sg-list" aria-label="Shortcuts">');
    expect(html).toContain('<a href="/app/availability" class="sg-row">');
    expect(html).toContain('<button type="button" class="sg-row sig-row-button">');
    expect(html).toContain('<div class="sg-row"><span class="sg-copy"><b>Plain</b></span><span class="sg-pill">New</span></div>');
    expect(html.match(/<svg/g)).toHaveLength(2);
  });

  it('cards carry tone, head, body and foot; card rows put the pill on the title line', () => {
    const html = renderToStaticMarkup(<SigCard tone="amber" label="Waiting" head={<b>Head</b>} foot="One thing needs you" footTone="amber">
      <SigCardRow href="/app/requests" title="Time off" pill={<SigPill tone="amber">Waiting</SigPill>} lines={['Mon, Oct 27', 'Sent Oct 20']} />
    </SigCard>);
    expect(html).toContain('<section class="sg-card" data-tone="amber" aria-label="Waiting">');
    expect(html).toContain('<div class="sg-card-head"><b>Head</b></div>');
    expect(html).toContain('<a href="/app/requests" class="sg-r"><span class="sg-copy"><span class="sg-t1"><b>Time off</b><span class="sg-pill" data-tone="amber">Waiting</span></span><span>Mon, Oct 27</span><span>Sent Oct 20</span></span></a>');
    expect(html).toContain('<p class="sg-card-foot" data-tone="amber">One thing needs you</p>');
  });

  it('tabs are links with aria-current on the page you are on', () => {
    const html = renderToStaticMarkup(<SigTabs label="Requests" variant="band" items={[{ href: '/a', label: 'Mine', current: true, count: 2 }, { href: '/b', label: 'New' }]} />);
    expect(html).toContain('<nav class="sig-tabs" data-variant="band" aria-label="Requests">');
    expect(html).toContain('<a href="/a" class="sig-tabs__link" aria-current="page">Mine<em>2</em></a>');
    expect(html).toContain('<a href="/b" class="sig-tabs__link">New</a>');
  });

  it('banners announce urgent messages at once and the rest politely', () => {
    expect(renderToStaticMarkup(<SigBanner tone="urgent" title="Not sent" />)).toContain('role="alert"');
    expect(renderToStaticMarkup(<SigBanner tone="review" title="Waiting" />)).toContain('role="status"');
  });

  it('empty states, avatars and skeletons keep decoration away from screen readers', () => {
    expect(renderToStaticMarkup(<SigEmpty icon={<svg />} title="No requests" />)).toContain('<span class="sig-empty__tile" aria-hidden="true">');
    expect(renderToStaticMarkup(<SigAvatar name="Alexandra Rivera" />)).toBe('<span class="sig-avatar" data-size="40" aria-hidden="true">AR</span>');
    expect(renderToStaticMarkup(<SigAvatar name="Sam" labelled size={56} />)).toBe('<span class="sig-avatar" data-size="56" role="img" aria-label="Sam">S</span>');
    const skeleton = renderToStaticMarkup(<SigSkeleton lines={2} tile />);
    expect(skeleton).toContain('aria-hidden="true"');
    expect(skeleton.match(/<span><\/span>/g)).toHaveLength(2);
  });

  it('fields wire the label, hint and error to the control', () => {
    const html = renderToStaticMarkup(<SigFieldGroup legend="Contact">
      <SigField id="phone" label="Phone" hint="We text shift changes" error="Enter 10 digits"><input type="tel" /></SigField>
    </SigFieldGroup>);
    expect(html).toContain('<fieldset class="sig-fieldgroup"><legend class="sig-fieldgroup__legend">Contact</legend>');
    expect(html).toContain('<div class="sig-field" data-invalid="">');
    expect(html).toContain('<label class="sig-field__label" for="phone">Phone</label>');
    expect(html).toContain('<input type="tel" id="phone" aria-describedby="phone-hint phone-error" aria-invalid="true"/>');
    expect(html).toContain('<p class="sig-field__error" id="phone-error">Enter 10 digits</p>');
  });

  it('a field without hint or error leaves the control undescribed', () => {
    const html = renderToStaticMarkup(<SigField id="name" label="Name"><input /></SigField>);
    expect(html).toContain('<input id="name"/>');
    expect(html).not.toContain('data-invalid');
  });
});

describe('Signature overlays and motion', () => {
  it('the sheet is a labelled dialog with a named close button', () => {
    const html = renderToStaticMarkup(<SigSheet open={false} onClose={() => {}} title="Filter shifts" closeLabel="Close filters"><p>Body</p></SigSheet>);
    expect(html).toMatch(/<dialog class="sig-sheet" aria-labelledby="([^"]+)">/);
    const id = /aria-labelledby="([^"]+)"/.exec(html)?.[1];
    expect(html).toContain(`<h2 id="${id}">Filter shifts</h2>`);
    expect(html).toContain('aria-label="Close filters"');
  });

  it('the toast announces only its message and offers Undo and dismiss', () => {
    const html = renderToStaticMarkup(<SigToast message="Request withdrawn" action={{ label: 'Undo', onClick: () => {} }} onDismiss={() => {}} />);
    expect(html).toContain('<p class="sig-toast__message" role="status" aria-live="polite">Request withdrawn</p>');
    expect(html).toContain('>Undo</button>');
    expect(html).toContain('aria-label="Dismiss"');
    expect(html.indexOf('role="status"')).toBe(html.lastIndexOf('role="status"'));
  });

  it('SigFade does not animate on first render', () => {
    expect(renderToStaticMarkup(<SigFade value="7:45">7h 45m</SigFade>)).toBe('<span aria-hidden="true">7h 45m</span>');
  });
});
