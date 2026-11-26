// Punch photos (Phase 6): what the setting does in one sentence, each switch's state in words, and a disabled switch
// that says why.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, rs} from '@rstest/core';
import {ClockerPhotoSettings,photoSettingsChanged} from './photo-settings';
import {photoSettingsDraft} from '@/lib/clocker/photo-client/settings';
import {englishIn} from '../clocker-owner-copy.testkit';
import type {PhotoPolicy} from '@/lib/clocker/photo-server/contracts';

const policy = (enabled: boolean): PhotoPolicy => ({version: 1, enabled, events: ['CLOCK_IN', 'CLOCK_OUT'], retentionDays: 30, failureBehavior: 'ALLOW_WITH_EXCEPTION', captureMaxBytes: 524288, captureMaxDimension: 640, uploadWindowSeconds: 300} as PhotoPolicy);
const render = (enabled: boolean, lang: 'en' | 'es' = 'en') => renderToStaticMarkup(createElement(ClockerPhotoSettings, {initialPolicy: policy(enabled), saveAction: rs.fn(), readAction: rs.fn(), lang}));

describe('Punch photos', () => {
  it('opens with what the setting does, in one sentence', () => {
    expect(render(false)).toContain('When this is on, the tablet takes one photo at the moments you choose, so you can see who clocked in.');
  });
  it('off: the main switch says Off in words, the four moments are disabled, and a line says why', () => {
    const html = render(false);
    expect(html).toMatch(/<span class="ck-switch__state" aria-hidden="true">Off<\/span><input id="photo-enabled" type="checkbox" role="switch"/);
    expect(html).toMatch(/<fieldset class="c-photos__events" disabled="" data-off="true">/);
    expect(html).toContain('<p class="ck-photos__why" id="photo-events-why">Turn on Take punch photos to choose these.</p>');
    // Each disabled switch points at the reason, and none of them reads "On" while photos are off.
    expect(html.match(/aria-describedby="photo-events-why"/g)).toHaveLength(5);
    expect(html).not.toContain('>On<');
  });
  it('on: each switch says its own state in words, and the reason is gone', () => {
    const html = render(true);
    expect(html.match(/<span class="ck-switch__state" data-on="" aria-hidden="true">On<\/span>/g)).toHaveLength(3);
    expect(html.match(/<span class="ck-switch__state" aria-hidden="true">Off<\/span>/g)).toHaveLength(2);
    expect(html).not.toContain('photo-events-why'); expect(html).not.toMatch(/<fieldset class="c-photos__events" disabled/);
  });
  it('shows no Save until something changed, and never says photos are being taken while they are unavailable', () => {
    for (const enabled of [true, false]) expect(render(enabled)).not.toContain('type="submit"');
    const html = render(true);
    expect(html).toContain('Punch photos aren’t available yet'); expect(html).toContain('They start when photos are turned on for your workplace.');
  });
  it('a change is any switch or the days differing from what is saved', () => {
    const saved = policy(false), draft = photoSettingsDraft(saved);
    expect(photoSettingsChanged(draft, saved)).toBe(false);
    expect(photoSettingsChanged({...draft, events: ['CLOCK_OUT', 'CLOCK_IN']}, saved)).toBe(false);
    expect(photoSettingsChanged({...draft, retentionDays: ' 30 '}, saved)).toBe(false);
    expect(photoSettingsChanged({...draft, enabled: true}, saved)).toBe(true);
    expect(photoSettingsChanged({...draft, events: ['CLOCK_IN']}, saved)).toBe(true);
    expect(photoSettingsChanged({...draft, retentionDays: '14'}, saved)).toBe(true);
  });
  it('off: every moment switch is drawn and announced off, whatever choice is kept', () => {
    const moments = render(false).match(/<input id="photo-event-[A-Z_]+"[^>]*>/g) ?? [];
    expect(moments).toHaveLength(4);
    for (const input of moments) expect(input).not.toContain('checked');
    expect((render(true).match(/<input id="photo-event-[A-Z_]+"[^>]*>/g) ?? []).filter(input => input.includes('checked'))).toHaveLength(2);
  });
  it('Spanish leaks no English sentence', () => {
    expect(englishIn(render(false, 'es'))).toEqual([]); expect(englishIn(render(true, 'es'))).toEqual([]);
    expect(render(false, 'es')).toContain('Activa Tomar fotos de ponche para elegirlos.');
  });
});
